import { RuleType } from "../../shared/types/api";
import { Card, generateAllCardTypes } from "./card";
import { Player } from "./palyer";
import { GameEngine } from "./stateMachine";

type applyFunction = (card: Card) => boolean;
export type Target = "self" | "next" | "previous" | "all";

export type Effect = {
  target: Target;
  multiplier: number; // e.g., 2 = double, 0.5 = half
  filter: Card[]; // for cards
  removeAll?:boolean
};

export class Rule {
  id: number;
  description: string;
  private apply: applyFunction;

  // condensed display
  successText: string;
  failText: string;

  // target for applying effect
  successTarget: Target;
  failTarget: Target;

  // actual effects to apply programmatically
  successEffect: Effect;
  failEffect: Effect;

  static idCounter = 0;

  constructor(
    description: string,
    apply: applyFunction,
    successText: string,
    failText: string,
    successEffect: Effect,
    failEffect: Effect
  ) {
    this.description = description;
    this.apply = apply;
    this.successText = successText;
    this.failText = failText;
    this.successEffect = successEffect;
    this.failEffect = failEffect;

    this.successTarget = successEffect.target;
    this.failTarget = failEffect.target;

    this.id = Rule.idCounter++;
  }
  toRuleType(): RuleType {
    return {
      id: this.id,
      description: this.description,
      successText: this.successText,
      failText: this.failText,
      successTarget: this.successTarget,
      failTarget: this.failTarget,
    };
  }
  static fromString(id: number): Rule {
    for (const rule of allPossibleRules) {
      if (rule.id === id) return rule;
    }
    return allPossibleRules[0]!;
  }

  async applyEffect(card: Card, actingPlayer: Player) {
    const isSuccess = this.apply(card);
    const effect = isSuccess ? this.successEffect : this.failEffect;
  
    // Resolve targets
    let targets: Player[] = [];
    switch (effect.target) {
      case "self":
        targets = [actingPlayer];
        break;
      case "previous":
        const prev = GameEngine.players.getPreviousPlayer();
        if (prev) targets = [prev];
        break;
      case "next":
        const next = GameEngine.players.peekNextPlayer();
        if (next) targets = [next];
        break;
      case "all":
        targets = GameEngine.players.getAllActivePlayers();
        break;
    }
  
    // Apply effect to each target
    for (const p of targets) {
      const multiplier = effect.multiplier;
      await p.updateCards(multiplier,effect.filter)
    }
  
    return isSuccess;
  }
  
}



// Example rules
const evenCard = (card: Card) => card.value % 2 === 0;
const oddCard = (card: Card) => card.value % 2 === 1;
const heartsCard = (card: Card) => card.suit === "Hearts";
const diamondsCard = (card: Card) => card.suit === "Diamonds";
const clubsCard = (card: Card) => card.suit === "Clubs";
const spadesCard = (card: Card) => card.suit === "Spades";
const redCard = (card: Card) => heartsCard(card) || diamondsCard(card);
const blackCard = (card: Card) => clubsCard(card) || spadesCard(card);
let allCards = generateAllCardTypes()
export const isEven = (card: Card) => card.value % 2 === 0;
export const isOdd = (card: Card) => card.value % 2 !== 0;
export const isRed = (card: Card) => card.suit === "Hearts" || card.suit === "Diamonds";
export const isBlack = (card: Card) => card.suit === "Clubs" || card.suit === "Spades";
export const isHeart = (card: Card) => card.suit === "Hearts";
export const isClub = (card: Card) => card.suit === "Clubs";
export const isSpades = (card: Card) => card.suit === "Spades";
export const isDiamonds = (card: Card) => card.suit === "Diamonds";
  
  // ==== CURRENT/SELF RULES ====
  const currentRules: Rule[] = [
    new Rule(
      "Even",
      evenCard,
      "⬆5x Evens",
      "⬇All Evens",
      { target: "self", multiplier: 5, filter: allCards.filter(isEven) },
      { target: "self", multiplier: 0, filter: allCards.filter(isEven), removeAll:true }
    ),
    new Rule(
      "Odd",
      oddCard,
      "⬆5x Odds",
      "Lose all odds",
      { target: "self", multiplier: 5, filter: allCards.filter(isOdd) },
      { target: "self", multiplier: 0, filter: allCards.filter(isOdd), removeAll: true }
    ),
    new Rule(
      "Black",
      blackCard,
      "⬆5x Black",
      "⬇50% Black",
      { target: "self", multiplier: 5, filter: allCards.filter(isBlack) },
      { target: "self", multiplier: 0.5, filter: allCards.filter(isBlack) }
    ),
  ];
  
  
  function makeInRange(min: number, max: number) {
    return (card: Card) => card.value >= min && card.value <= max;
  }
  function makeNotInRange(min: number, max: number) {
    return (card: Card) => card.value < min || card.value > max;
  }
  
  // ✅ Rule generator
  function generateGroupRules(
    ranges: [number, number][],
    allCards: Card[]
  ): Rule[] {
    return ranges.map(([min, max]) => {
      const desc = `${min}–${max}`;
      const inRange = makeInRange(min, max);
      const notInRange = makeNotInRange(min, max);
  
      return new Rule(
        desc,
        inRange,
        `You get 5x total cards`, // you can tune multiplier logic here
        `You lose all cards except ${desc}`,
        { target: "self", multiplier: 5, filter: allCards }, // success
        { target: "self", multiplier: 0, filter: allCards.filter(notInRange) } // fail
      );
    });
  }
  const groups = generateGroupRules(
    [
      [0, 2],
      [3, 5],
      [6, 9]
    ],
    allCards
  );
  // ==== MERGE EVERYTHING ====
  export const allPossibleRules: Rule[] = [
    ...currentRules,
    ...groups
  ];
  
