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
  static previousRuleEnforced:RuleType
  static async getGameState(): Promise<GameStateType>{
    let currentRules:Rule[] = []
    const rule1 = await redis.get('rule-1')
    const rule2 = await redis.get('rule-2')
    const rule3 = await redis.get('rule-3')
    if(rule1 && rule2 && rule3){
      currentRules = [rule1,rule2,rule3].map(r=>Dealer.fromString(r))
    }
    console.log(Dealer.currentRulesDisplayed)
    // id: number;
    // description: string;
    // successText: string;
    // failText: string;
    // successTarget: Target;
    // failTarget: Target;

    console.log(Dealer.currentRulesDisplayed.map<RuleType>(r=>({id:r.id,description:r.description,successTarget:r.successTarget,successText:r.successText,failTarget:r.failTarget,failText:r.failText})))
    return {
      players: await Promise.all(GameEngine.players.getPlayers().map(async (p) => await p.getPlayerState())),
      currentPlayer: await redis.get('current-player-id'),
      lastCardPlaced: {suit:(await redis.get('last-card-suit')??""),value:parseInt(await redis.get('last-card-value')??"0")},
      currentRules: currentRules.map<RuleType>(r=>({id:r.id,description:r.description,successTarget:r.successTarget,successText:r.successText,failTarget:r.failTarget,failText:r.failText})),
      endVotingTime: GameEngine.endVotingTime,
      allRules: GameEngine.rules.map<RuleType>(r => ({id:r.id,description:r.description,successTarget:r.successTarget,successText:r.successText,failTarget:r.failTarget,failText:r.failText})),
      previousRuleEnforced: GameEngine.previousRuleEnforced,
      gameOver: GameEngine.players.getPlayers().filter(p=>p.handSize>0).length<=1,
      moves: (await redis.get('turn'))??"0"
    }
  }
  constructor() {}
  static async initializeGame(turn:string, lastCardPlaced:{suit:string,value:number}, currentRules:Rule[],previousRuleEnforced:RuleType){
    const seed = await settings.get('seed') as string
    Dealer.rng = createRNG(`dealer-${turn}-${seed}`)
    Player.rng = createRNG(`player-${turn}-${seed}`)
    GameEngine.previousRuleEnforced = previousRuleEnforced
    Dealer.initializeDealerDeck()
    GameEngine.lastCardPlaced = Card.fromString(`${lastCardPlaced.value}-${lastCardPlaced.suit}`)
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
    const option1 = await redis.get('vote-0')
    const option2 = await redis.get('vote-1')
    const option3 = await redis.get('vote-2')
    if (!rule1 || !rule2 || !rule3) {
      return false
    }
    let optionChosenIndex:number
    if(!option1 || !option2 || !option3){
      let optionArray = [parseInt(option1??"0"),parseInt(option2??"0"),parseInt(option3??"0")]
      optionChosenIndex = optionArray.indexOf(Math.max(...optionArray))
    }else{
      optionChosenIndex = [parseInt(option1),parseInt(option2),parseInt(option3)].indexOf(Math.max(parseInt(option1),parseInt(option2),parseInt(option3)))
    }
    
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
    console.log("Player "+playerNode.player.id+" chose option: "+optionChosenIndex)
    if(!pickedCard){
      return false
    }
    const ruleToEnforce = Dealer.currentRulesDisplayed[optionChosenIndex]
    console.log("Player "+playerNode.player.id+" played card: "+pickedCard.toString())
    console.log("Enforcing rule: "+ruleToEnforce?.description)
    if(!ruleToEnforce){
      return false
    }
    const isValid = await ruleToEnforce.applyEffect(pickedCard,playerNode.player)
    console.log("rule was: "+isValid)
    console.log(ruleToEnforce.description)
    // if(isValid){
    //   console.log("rule was not broken")
    //   console.log("hererfdosdhfisuhdieasdjfshdi")
    //   await playerNode.player.addCards(1000)
    // }else{
    //   console.log("rule was broken")
    //   console.log("herereasdjfshdi")
    //   await playerNode.player.removeAllByFilter({number:9,comparator:"less"})
    // }
    const {rule1:newRule1,rule2:newRule2,rule3:newRule3} = Dealer.getThreeCards()
    await redis.set('rule-1', newRule1.id.toString())
    await redis.set('rule-2', newRule2.id.toString())
    await redis.set('rule-3', newRule3.id.toString())
    await redis.incrBy('turn', 1)
    await redis.set('last-card-suit',pickedCard.suit)
    await redis.set('last-card-value',pickedCard.value.toString())
    await redis.set('voting-ends',(Date.now()+ 60 * 1000).toString())
    await redis.set('previous-rule-enforced',ruleToEnforce.id.toString())
    await redis.set('vote-0', '0')
    await redis.set('vote-1', '0')
    await redis.set('vote-2', '0')
    GameEngine.previousRuleEnforced = ruleToEnforce.toRuleType()
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