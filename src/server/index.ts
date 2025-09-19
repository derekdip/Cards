import express from 'express';
import { InitResponse, IncrementResponse, DecrementResponse, StoredCardType } from '../shared/types/api';
import { redis, reddit, createServer, context, getServerPort, settings } from '@devvit/web/server';
import { createPost } from './core/post';
import seedrandom from 'seedrandom';
import { GameEngine } from './logic/stateMachine';
import { generateAllCardTypes } from './logic/card';
import { Player } from './logic/palyer';
import { Dealer } from './logic/dealer';
import { Rule } from './logic/rules';

function createRNG(seed: string): () => number {
  const rng = seedrandom(seed); // deterministic PRNG
  return () => rng(); // same API as Math.random()
}
const app = express();

// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

const router = express.Router();

router.get<{ postId: string }, InitResponse | { status: string; message: string }>(
  '/api/init332',
  async (_req, res): Promise<void> => {
    const { postId } = context;

    if (!postId) {
      console.error('API Init Error: postId not found in devvit context');
      res.status(400).json({
        status: 'error',
        message: 'postId is required but missing from context',
      });
      return;
    }

    try {
      const [count, username] = await Promise.all([
        redis.get('count'),
        reddit.getCurrentUsername(),
      ]);

      res.json({
        type: 'init',
        postId: postId,
        count: count ? parseInt(count) : 0,
        username: username ?? 'anonymous',
      });
    } catch (error) {
      console.error(`API Init Error for post ${postId}:`, error);
      let errorMessage = 'Unknown error during initialization';
      if (error instanceof Error) {
        errorMessage = `Initialization failed: ${error.message}`;
      }
      res.status(400).json({ status: 'error', message: errorMessage });
    }
  }
);

router.post<{ postId: string }, IncrementResponse | { status: string; message: string }, unknown>(
  '/api/increment',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', 1),
      postId,
      type: 'increment',
    });
  }
);

router.post<{ postId: string }, DecrementResponse | { status: string; message: string }, unknown>(
  '/api/decrement',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', -1),
      postId,
      type: 'decrement',
    });
  }
);

router.post('/internal/on-app-install', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      status: 'success',
      message: `Post created in subreddit ${context.subredditName} with id ${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

router.post('/internal/menu/post-create', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});
router.get('/api/init', async (_req, res): Promise<void> => {
  res.json(await loadGame())
})
router.get('api/state', async (_req): Promise<void> => {
  const seed = await settings.get('seed') as string
  const turn = await redis.get('turn') as string
  const rng =  createRNG(seed+turn)
  console.log("state hit"+ rng())
})
router.post('/internal/scheduler/next-move', async (_req): Promise<void> => {
  const state = await redis.get('game-state')
  console.log(state)
  const optionChosen = 1
  switch(state) {
    case undefined: {
      // start the game
      await redis.set('prev-game-state', 'initial')
      await redis.set('game-state', 'voting')
      await redis.set('current-player-id', 'id-0')
      console.log("initializing")
      await initializeGame()
      break;
    }
    case "initial": {
      // start the game
      await redis.set('prev-game-state', 'initial')
      await redis.set('game-state', 'voting')
      await redis.set('current-player-id', 'id-0')
      console.log("initializing")
      await initializeGame()
      break;
    }
    case "voting": {
      // deal cards
      await redis.set('prev-game-state', state)
      await redis.set('game-state', 'voting')
      const currentPlayerID = await redis.get('current-player-id')
      if(!currentPlayerID) break;
      console.log("player is executing turn")
      await loadGame()
      await GameEngine.executeTurn(optionChosen,currentPlayerID)
      console.log(await GameEngine.getGameState())
      break;
    }
    case "end": {
      await redis.set('prev-game-state', state)
      await redis.set('game-state', 'initial')
    }
    default: {
      // unknown state, reset
      await redis.set('prev-game-state', 'initial')
      await redis.set('game-state', 'voting')
      console.log("resetting to initial")
      await initializeGame()
      break;
    }
    
  }
})

// Use router middleware
app.use(router);

// Get port from environment variable with fallback
const port = getServerPort();

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port);

async function initializeGame() {
  const playerCount = 4
  await GameEngine.initializeGame('0', {suit:"Hearts",value:7},[])
  for (let i = 0; i < playerCount; i++) {
    await redis.set(`player-${i}`, 'active')
    const p = new Player(`id-${i}`);
    GameEngine.addPlayer(p);
    p.addCards(8)
    const storedCards = p.getStoredCards()
    for(const card of storedCards){
        await redis.set(`player-${p.id}-${card.id}`, card.count.toString())
    }
  }
  const {rule1,rule2,rule3} = Dealer.getThreeCards()
  const votingEnds = Date.now()+ 60 * 1000; // 1 minute from now
  await redis.set('voting-ends', votingEnds.toString())
  await redis.set('rule-1', rule1.id.toString())
  await redis.set('rule-2', rule2.id.toString())
  await redis.set('rule-3', rule3.id.toString())
  await redis.incrBy('turn', 1)
  await redis.set('last-card-suit','Hearts')
  await redis.set('last-card-value','7')

}
async function loadGame() {
  const playerCount = 4
  const turn = await redis.get('turn')
  const lastCardSuit = await redis.get('last-card-suit')
  const lastCardValueStr = await redis.get('last-card-value')
  const lastCard = lastCardSuit && lastCardValueStr ? {suit:lastCardSuit,value:parseInt(lastCardValueStr)} : null

  const endVotingTimeStr = await redis.get('voting-ends')
  let currentRules:Rule[] = []
  const rule1 = await redis.get('rule-1')
  const rule2 = await redis.get('rule-2')
  const rule3 = await redis.get('rule-3')
  const currentPlayerId = await redis.get('current-player-id')
  if(rule1 && rule2 && rule3){
    currentRules = [rule1,rule2,rule3].map(r=>Dealer.fromString(r))
  }else{
    return
  }
  console.log("turn: "+turn)
  console.log("lastCard: "+lastCard)
  if(!turn|| !endVotingTimeStr ||!lastCard ||!currentPlayerId) return
  await GameEngine.initializeGame(turn,lastCard,currentRules)
  GameEngine.setEndVotingTime(parseInt(endVotingTimeStr))
  for (let i = 0; i < playerCount; i++) {
    const status = await redis.get(`player-${i}`)
    const p = new Player(`id-${i}`);
    GameEngine.addPlayer(p);
    if(status !== "active") continue;
    const storedCards = await getCards(p)
    p.setCards(storedCards)
    if(p.id==currentPlayerId){
      GameEngine.setCurrentPlayer(p.id)
    }
  }
  return GameEngine.getGameState()
}
async function getCards(player:Player){
  const storedCards:StoredCardType[] = []
  const allTypes = generateAllCardTypes();
  for(const card of allTypes){
      const countStr = await redis.get(`player-${player.id}-${card.toString()}`)
      if(countStr){
          const count = parseInt(countStr)
          if(count > 0){
              storedCards.push({id:card.toString(),count, suit:card.suit,value:card.value})
          }
      }
  }
  return storedCards
}

//create game
//create players
//hand player cards
//store player cards
//set initial rule
//store initial rules

//vote on rule
//enforce rule
//update player cards
//evaluate win condition
//next turn
//set rules

//vote on rule
//enforce rule
//update player cards
//evaluate win condition
//next turn
//set rules
//..