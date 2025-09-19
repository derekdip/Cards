// GameEngine.ts
import { Card } from "./card";
import { Dealer } from "./dealer";
import { Player, PlayerLinkedList } from "./palyer";
import { Rule , allPossibleRules} from "./rules";
import { GameStateType, RuleType } from "../../shared/types/api";
import seedrandom from "seedrandom";


function createRNG(seed: string): () => number {
  const rng = seedrandom(seed); // deterministic PRNG
  return () => rng(); // same API as Math.random()
}


export class GameEngine {
  static players: PlayerLinkedList = new PlayerLinkedList();
  static lastCardPlaced:Card
  static endVotingTime:number = 0
  static rules: Rule[] = [...allPossibleRules]
  static currentRules:Rule[] = []
  static async getGameState(): Promise<GameStateType>{
    console.log(Dealer.currentRulesDisplayed)
    // id: number;
    // description: string;
    // successText: string;
    // failText: string;
    // successTarget: Target;
    // failTarget: Target;

    console.log(Dealer.currentRulesDisplayed.map<RuleType>(r=>({id:r.id,description:r.description,successTarget:r.successTarget,successText:r.successText,failTarget:r.failTarget,failText:r.failText})))
    console.log(await Promise.all(GameEngine.players.getPlayers().map(async (p) => await p.getPlayerState())))
    return {
      players: await Promise.all(GameEngine.players.getPlayers().map(async (p) => await p.getPlayerState())),
      currentPlayer: GameEngine.players.current?.player.id ,
      lastCardPlaced: {suit:GameEngine.lastCardPlaced.suit,value:GameEngine.lastCardPlaced.value},
      currentRules: Dealer.currentRulesDisplayed.map<RuleType>(r=>({id:r.id,description:r.description,successTarget:r.successTarget,successText:r.successText,failTarget:r.failTarget,failText:r.failText})),
      endVotingTime: GameEngine.endVotingTime,
      allRules: GameEngine.rules.map<RuleType>(r => ({id:r.id,description:r.description,successTarget:r.successTarget,successText:r.successText,failTarget:r.failTarget,failText:r.failText})),
    }
  }
  constructor() {}
  static async initializeGame(){
    GameEngine.players = new PlayerLinkedList()
    let data: {seed:string}={seed:"default-seed"}
    Dealer.setRNG( createRNG(`dealer-${data.seed}`))
    Player.setRNG( createRNG(`player-${data.seed}`))
    Dealer.initializeDealerDeck()
    const playerCount = 4 //later get from api
    for (let i = 0; i < playerCount; i++) {
      const p = new Player(`id-${i}`);
      GameEngine.addPlayer(p);
      p.addCards(8)
    }
    this.setCurrentPlayer("id-0")
    GameEngine.lastCardPlaced = new Card(7,"Hearts")
    const {rule1,rule2,rule3} = Dealer.getThreeCards()
    Dealer.currentRulesDisplayed = [rule1,rule2,rule3]
    GameEngine.currentRules = [rule1,rule2,rule3]
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
    // Dealer.currentRulesDisplayed = GameEngine.currentRules.map(r=>Rule.fromString(Number(r)))
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
    console.log("current rules: "+Dealer.currentRulesDisplayed.map(r=>r))
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
    GameEngine.currentRules = [newRule1,newRule2,newRule3]
    GameEngine.lastCardPlaced = pickedCard
    Dealer.currentRulesDisplayed = [newRule1,newRule2,newRule3]
    console.log("advancing turn")
    let newCurrentPlayer = GameEngine.players.advanceTurn()
    if(newCurrentPlayer==null){
      console.log("err")
      return false
    }
    console.log("nextplayer:"+newCurrentPlayer.id)
    return true
  }

}