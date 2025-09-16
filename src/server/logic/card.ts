export type SpecialSuit = "Pass";
export type RegularSuit = "Hearts" | "Diamonds" | "Clubs" | "Spades";
export const specialSuits: SpecialSuit[] = ["Pass"];
export const regularSuits: RegularSuit[] = ["Hearts", "Diamonds", "Clubs", "Spades"];
export type Suit = SpecialSuit | RegularSuit;

export class Card {
  static cards: Card[] = [];
  static rng: () => number;

  value: number; // 0–9 for regular, -1 for special
  suit: Suit;


  constructor(value: number, suit: Suit) {
    this.value = value;
    this.suit = suit;
  }
  static createCard(): Card {
    const value = Card.rng() * 10; // 0-9
    const suit = regularSuits[Math.floor(Card.rng() * 4)];
    return new Card(value, suit!);
  }
  static setRNG(rng: () => number) {
    Card.rng = rng;
  }

  /** Convert card to a string key for handCounts / DB */
  toString(): string {
    return `${this.value}-${this.suit}`;
  }

  /** Reconstruct a card from a stored string */
  static fromString(str: string): Card {
    const [valueStr, suit] = str.split("-");
    const value = valueStr ? parseInt(valueStr, 10) : -1;
    return new Card(value, suit as Suit);
  }

  /** Pretty display for frontend */
  display(): string {
    if (this.value === -1) return `Special ${this.suit}`;
    return `${this.value} of ${this.suit}`;
  }

  /** Optional: equality check */
  equals(other: Card): boolean {
    return this.value === other.value && this.suit === other.suit;
  }
}

export function generateAllCardTypes(): Card[] {
    const cards: Card[] = [];
  
    // Regular cards 0–9 × 4 suits
    for (const value of Array.from({ length: 10 }, (_, i) => i)) {
      for (const suit of regularSuits) {
        cards.push(new Card(value, suit));
      }
    }
  
    return cards;
  }