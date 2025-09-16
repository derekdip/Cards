// GameEngine.ts
import seedrandom from "seedrandom";
import { Card } from "./card";
import { Dealer } from "./dealer";
import { Player, PlayerLinkedList } from "./palyer";
import { redis, settings } from "@devvit/web/server";
import { Rule , allPossibleRules} from "./rules";
import { GameStateType, RuleType } from "../../shared/types/api";


function createRNG(seed: string): () => number {
  const rng = seedrandom(seed); // deterministic PRNG
  return () => rng(); // same API as Math.random()
}

export class GameEngine {
  static players: PlayerLinkedList = new PlayerLinkedList();
  static lastCardPlaced:Card
  static endVotingTime:number = 0
  static rules: Rule[] = [...allPossibleRules]
  static async getGameState(): Promise<GameStateType>{
    let currentRules:Rule[] = []
    const rule1 = await redis.get('rule-1')
    const rule2 = await redis.get('rule-2')
    const rule3 = await redis.get('rule-3')
    if(rule1 && rule2 && rule3){
      currentRules = [rule1,rule2,rule3].map(r=>Dealer.fromString(r))
    }
    console.log(Dealer.currentRulesDisplayed)
    console.log(Dealer.currentRulesDisplayed.map<RuleType>(r=>({id:r.id,description:r.description,punishment:r.punishment})))
    return {
      players: await Promise.all(GameEngine.players.getPlayers().map(async (p) => await p.getPlayerState())),
      currentPlayer: await redis.get('current-player-id'),
      lastCardPlaced: (await redis.get('last-card')??""),
      currentRules: currentRules.map<RuleType>(r=>({id:r.id,description:r.description,punishment:r.punishment})),
      endVotingTime: GameEngine.endVotingTime,
      allRules: GameEngine.rules.map<RuleType>(r => ({
        id: r.id,
        description: r.description,
        punishment: r.punishment,
      })),
    }
  }
  constructor() {}
  static async initializeGame(turn:string, lastCardPlaced:string, currentRules:Rule[]){
    const seed = await settings.get('seed') as string
    Dealer.rng = createRNG(`dealer-${turn}-${seed}`)
    Player.rng = createRNG(`player-${turn}-${seed}`)
    Dealer.initializeDealerDeck()
    GameEngine.lastCardPlaced = Card.fromString(lastCardPlaced)
    Dealer.currentRulesDisplayed = currentRules
    console.log("Initialized game with last card: "+GameEngine.lastCardPlaced.toString())
  }
  static setEndVotingTime(time:number){
    GameEngine.endVotingTime = time
  }
  static setCurrentPlayer(id:string){
    let i=0
    let found = false
    let currentPlayer = GameEngine.players.current
    while(i<20){
      if(!currentPlayer) break
      console.log("Checking player: "+currentPlayer.player.id)
      console.log("Against id: "+id)
      if(currentPlayer.player.id==id){
        GameEngine.players.current = currentPlayer
        found = true
        break
      }
      currentPlayer = currentPlayer.next
      i++
    }
    return found
  }

  static addPlayer(player: Player) {
    if(GameEngine.players.getPlayers().find(p=>p.id==player.id)){
      return
    }
    GameEngine.players.addPlayer(player);
  }
  static removePlayer(playerId: string) {
    GameEngine.players.removePlayer(playerId);
  }

  static async executeTurn(optionChosen:number, playerId:string){
    const rule1 = await redis.get('rule-1')
    const rule2 = await redis.get('rule-2')
    const rule3 = await redis.get('rule-3')
    Dealer.currentRulesDisplayed = [rule1,rule2,rule3].map(r=>Rule.fromString(Number(r)))
    const playerFound = GameEngine.setCurrentPlayer(playerId)
    console.log("Current player is: "+playerFound)
    if(!playerFound){ //find current player
      return false
    }
    const playerNode = GameEngine.players.current
    if(!playerNode){
      return false
    }
    const pickedCard = await playerNode.player.chooseCard()
    console.log("Player "+playerNode.player.id+" chose option: "+optionChosen)
    if(!pickedCard){
      return false
    }
    const ruleToEnforce = Dealer.currentRulesDisplayed[optionChosen]
    console.log("Player "+playerNode.player.id+" played card: "+pickedCard.toString())
    console.log("Enforcing rule: "+ruleToEnforce?.description)
    if(!ruleToEnforce){
      return false
    }
    const isValid = ruleToEnforce.apply(pickedCard)
    console.log("rule was: "+isValid)
    console.log(ruleToEnforce.description)
    if(isValid){
      console.log("rule was not broken")
      console.log("hererfdosdhfisuhdieasdjfshdi")
      await playerNode.player.addCards(1000)
    }else{
      console.log("rule was broken")
      console.log("herereasdjfshdi")
      await playerNode.player.removeAllByFilter({number:9,comparator:"less"})
    }
    const {rule1:newRule1,rule2:newRule2,rule3:newRule3} = Dealer.getThreeCards()
    await redis.set('rule-1', newRule1.id.toString())
    await redis.set('rule-2', newRule2.id.toString())
    await redis.set('rule-3', newRule3.id.toString())
    await redis.incrBy('turn', 1)
    await redis.set('last-card',pickedCard.toString())
    await redis.set('voting-ends',(Date.now()+ 60 * 1000).toString())
    GameEngine.lastCardPlaced = pickedCard
    Dealer.currentRulesDisplayed = [newRule1,newRule2,newRule3]
    console.log("advancing turn")
    let newCurrentPlayer = GameEngine.players.advanceTurn()
    if(newCurrentPlayer==null){
      console.log("err")
      return false
    }
    console.log("nextplayer:"+newCurrentPlayer.id)
    await redis.set('current-player-id',newCurrentPlayer.id)
    return true
  }

}