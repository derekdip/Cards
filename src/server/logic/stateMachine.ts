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
    return {
      players: await Promise.all(GameEngine.players.getPlayers().map(async (p) => await p.getPlayerState())),
      currentPlayer: GameEngine.players.current?.player.id,
      lastCardPlaced: GameEngine.lastCardPlaced.toString(),
      currentRules: Dealer.currentRulesDisplayed.map<RuleType>(r=>(r.toRuleType())),
      endVotingTime: GameEngine.endVotingTime,
      allRules: GameEngine.rules.map<RuleType>(r => (r.toRuleType())),
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

  static async executeTurn(optionChosen:number, playerId:string){
    const rule1 = await redis.get('rule-1')
    const rule2 = await redis.get('rule-2')
    const rule3 = await redis.get('rule-3')
    Dealer.currentRulesDisplayed = [rule1,rule2,rule3].map(r=>Rule.fromString(Number(r)))
    const playerFound = GameEngine.setCurrentPlayer(playerId)
    if(!playerFound){ //find current player
      return false
    }
    const playerNode = GameEngine.players.current
    if(!playerNode){
      return false
    }
    const pickedCard = await playerNode.player.chooseCard()
    if(!pickedCard){
      return false
    }
    const ruleToEnforce = Dealer.currentRulesDisplayed[optionChosen]
    console.log("Previous Card:"+ this.lastCardPlaced )
    console.log("Player "+playerNode.player.id+" played card: "+pickedCard.toString())
    console.log("Enforcing rule: "+ruleToEnforce?.description)
    if(!ruleToEnforce){
      return false
    }
    console.log("made it here")
    await ruleToEnforce.applyEffect(pickedCard,playerNode.player)
    console.log("over here now")
    const {rule1:newRule1,rule2:newRule2,rule3:newRule3} = Dealer.getThreeCards()
    await redis.set('rule-1', newRule1.id.toString())
    await redis.set('rule-2', newRule2.id.toString())
    await redis.set('rule-3', newRule3.id.toString())
    await redis.incrBy('turn', 1)
    await redis.set('last-card',pickedCard.toString())
    await redis.set('voting-ends',(Date.now()+ 60 * 1000).toString())
    GameEngine.lastCardPlaced = pickedCard
    Dealer.currentRulesDisplayed = [newRule1,newRule2,newRule3]
    let nextPlayer= GameEngine.players.advanceTurn()
    if(!nextPlayer){
      console.log("game over")
      return false
    }
    await redis.set('current-player-id',nextPlayer.id)
    return true
  }

}
