import { Card } from "./card";
import { GameEngine } from "./stateMachine";

type applyFunction = (card:Card) => boolean
export class Rule {
    description: string;
    punishment: string;
    apply:applyFunction;
    id:number
    static idCounter = 0
    constructor(description: string, punishment: string, apply:applyFunction) {
        this.description = description;
        this.punishment = punishment;
        this.apply = apply
        this.id = Rule.idCounter
        Rule.idCounter++
    }
    static fromString(id:number):Rule{
        for(const rule of allPossibleRules){
            if(rule.id===id) return rule
        }
        return allPossibleRules[0]!
    }
    
}
export const allPossibleRules:Rule[] = [
    new Rule("Must be Even","Take 2 cards", (card:Card)=>card.value%2===0),
    new Rule("Must be Odd","Take 2 cards", (card:Card)=>card.value%2===1),
    new Rule("Must be Red","Take 2 cards", (card:Card)=>card.suit==="Hearts" || card.suit==="Diamonds"),
    new Rule("Must be Black","Take 2 cards", (card:Card)=>card.suit==="Clubs" || card.suit==="Spades"),
    new Rule("Must be Greater than 5","Take 2 cards", (card:Card)=>card.value>5),
    new Rule("Must be Less than 5","Take 2 cards", (card:Card)=>card.value<5),
    // new Rule("Must be a Face Card","Take 2 cards", (card:Card)=>card.value===1),
    // new Rule("Must be a Number Card","Take 2 cards", (card:Card)=>card.value!==1),
    new Rule("Must be Hearts or Spades","Take 2 cards", (card:Card)=>card.suit==="Hearts" || card.suit==="Spades"),
    new Rule("Must be Diamonds or Clubs","Take 2 cards", (card:Card)=>card.suit==="Diamonds" || card.suit==="Clubs"),
    
    new Rule("Play a spade if last card played was hears","Take 2 cards", (card:Card)=>{
        return GameEngine.lastCardPlaced.suit==="Hearts"?card.suit==="Spades":true
    }),
    new Rule("If last card played was even, play an odd","Take 2 cards", (card:Card)=>{return GameEngine.lastCardPlaced.value%2===0?card.value%2===1:true}),
    new Rule("Cant play the same value twice in a row","Take 2 cards", (card:Card)=>{return GameEngine.lastCardPlaced.value===card.value?false:true}),
    new Rule("Must be a number card","Take 2 cards", (card:Card)=>card.value!==-1),
    new Rule("If card played is less than 3, skip then next player","Skip next player", (card:Card)=>{return card.value<3?true:true}),
]
