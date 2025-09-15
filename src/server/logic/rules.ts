import { RuleType } from "../../shared/types/api";
import { Card, generateAllCardTypes } from "./card";
import { Player } from "./palyer";
import { GameEngine } from "./stateMachine";

type applyFunction = (card: Card) => boolean;
export type Target = "self" | "next" | "previous" | "all";
type Resource = "hearts" | "cards";

export type CardFilterOptions = {
  suit?: string;
  comparator?: "less" | "greater" | "equal";
  number?: number;
  even?: boolean;
  odd?: boolean;
};

export type Effect = {
  target: Target;
  resource: Resource;
  multiplier: number; // e.g., 2 = double, 0.5 = half
  filter: Card[]; // for cards
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
export const allPossibleRules: Rule[] = [
  // Even/Odd
  new Rule(
    "Must be Even",
    evenCard,
    "⬆5x📦",
    "⬇100%📦",
    { target: "self", resource: "cards", multiplier: 5, filter: allCards  },
    { target: "self", resource: "cards", multiplier: 0, filter: allCards }
  ),
  new Rule(
    "Must be Odd",
    oddCard,
    "⬆5x📦",
    "⬇100%📦",
    { target: "self", resource: "cards", multiplier: 5, filter: allCards },
    { target: "self", resource: "cards", multiplier: 0, filter: allCards }
  ),

  // Color rules
  new Rule(
    "Must be Red",
    redCard,
    "⬆5x📦",
    "⬇100%📦",
    { target: "self", resource: "cards", multiplier: 5, filter: allCards },
    { target: "self", resource: "cards", multiplier: 0, filter: allCards }
  ),
  new Rule(
    "Must be Black",
    blackCard,
    "⬆5x📦",
    "⬇100%📦",
    { target: "self", resource: "cards", multiplier: 5, filter: allCards },
    { target: "self", resource: "cards", multiplier: 0, filter: allCards }
  ),

  // Value-based
  new Rule(
    "Must be Greater than 5",
    (c) => c.value > 5,
    "⬆5x📦",
    "⬇100%📦",
    { target: "self", resource: "cards", multiplier: 5, filter: allCards },
    { target: "self", resource: "cards", multiplier: 0, filter: allCards }
  ),
  new Rule(
    "Must be Less than 5",
    (c) => c.value < 5,
    "⬆5x📦",
    "⬇100%📦",
    { target: "self", resource: "cards", multiplier: 5, filter: allCards},
    { target: "self", resource: "cards", multiplier: 0, filter: allCards}
  ),

  // Sequential / relational
  new Rule(
    "Cannot play same value as last card",
    (c) => c.value !== GameEngine.lastCardPlaced?.value,
    "⬆5x📦",
    "⬇100%📦",
    { target: "self", resource: "cards", multiplier: 5, filter:allCards },
    { target: "self", resource: "cards", multiplier: 0, filter:allCards }
  ),
//   new Rule(
//     "If last card even, play odd",
//     (c) => (GameEngine.lastCardPlaced?.value % 2 === 0 ? c.value % 2 === 1 : true),
//     "⬆2x📦",
//     "⬇50%📦",
//     { target: "self", resource: "cards", multiplier: 2, filter: { odd: true } },
//     { target: "self", resource: "cards", multiplier: -0.5, filter: { odd: true } }
//   ),

//   // Affect other players
//   new Rule(
//     "If succeed, next player loses 50% cards",
//     (c) => c.value % 2 === 0,
//     "➡⬇50%📦",
//     "⬇50%📦",
//     { target: "next", resource: "cards", multiplier: -0.5 },
//     { target: "self", resource: "cards", multiplier: -0.5 }
//   ),
//   new Rule(
//     "If succeed, previous player gains 2x hearts",
//     (c) => c.value > 5,
//     "⬅⬆2x❤️",
//     "⬇50%📦",
//     { target: "previous", resource: "hearts", multiplier: 2 },
//     { target: "self", resource: "cards", multiplier: -0.5 }
//   ),

//   // Randomized card effects
//   new Rule(
//     "Lose all cards ≤ 3 if fail",
//     (c) => c.value > 3,
//     "⬆2x📦",
//     "⬇📦≤played",
//     { target: "self", resource: "cards", multiplier: 2, filter: { comparator: "greater", number: 3 } },
//     { target: "self", resource: "cards", multiplier: -1, filter: { comparator: "less", number: 3} }
//   ),
//   new Rule(
//     "Double hearts if succeed",
//     (c) => c.suit === "Hearts",
//     "⬆2x❤️",
//     "⬇50%📦",
//     { target: "self", resource: "hearts", multiplier: 2 },
//     { target: "self", resource: "cards", multiplier: -0.5 }
//   ),
];