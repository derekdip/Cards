import { redis } from "@devvit/web/server";
import { Card, generateAllCardTypes } from "./card"; // your Card class
import { PlayerStateType, StoredCardType, CardType } from "../../shared/types/api";

export class Player {
  id: string;
  name: string;
  static rng: () => number;
  // Hand stored as counts for each card type
  handCounts: Map<string, number>;

  constructor(id: string, name?: string, map?:Map<string, number>) {
    this.id = id ;
    this.name = name ?? `Bot-${this.id.slice(0, 4)}`;
    this.handCounts = map?map:new Map<string, number>();
  }
  static setRNG(rng: () => number) {
    Player.rng = rng;
  }
  static fromDB(data: {
    id: string;
    name: string;
    handCounts: Record<string, number>; // JSON-friendly format
  }): Player {
    const map = new Map<string, number>();
    for (const key in data.handCounts) {
      map.set(key, data.handCounts[key]!);
    }
    return new Player(data.id, data.name, map);
  }

  /** Serialize for DB storage */
  toDB(): {
    id: string;
    name: string;
    handCounts: Record<string, number>;
  } {
    const counts: Record<string, number> = {};
    for (const [key, value] of this.handCounts.entries()) {
      counts[key] = value;
    }
    return {
      id: this.id,
      name: this.name,
      handCounts: counts,
    };
  }
  async saveCurrentHand() {
    console.log(`Player: ${this.id} hand contents:`);
    for (const [key, value] of this.handCounts.entries()) {
        await redis.set(`player-${this.id}-${key}`,value.toString())
        console.log(`${key}: ${value}`);
    }
    console.log("Total cards now: " + this.handSize);
  }

  setCards(storedCards: StoredCardType[]) {
    this.handCounts.clear(); // start fresh
    console.log("Player: "+this.id+" adding cards:")
    for (const { type, count } of storedCards) {
      this.handCounts.set(type, count);
      console.log(`${type}: count ${count}`)
    }
  }
  getStoredCards(): StoredCardType[] {
    const result: StoredCardType[] = [];
    for (const [type, count] of this.handCounts.entries()) {
      result.push({ type, count });
    }
    return result;
  }
  async addCards(count: number) {
    console.log("Player: "+this.id+" adding cards:")
    if(count>400){
        this.addRandomCardsLarge(count)
    }else{
        this.addRandomCards(count)
    }
    console.log("Total cards now: "+this.handSize)
    await this.saveCurrentHand()
  }
  async removeCards(count: number) {
    console.log("Player: "+this.id+" removing cards:")
    if(count>400){
        this.removeRandomCardsLarge(count)
    }else{
        this.removeRandomCards(count)
    }
    console.log("Total cards now: "+this.handSize)
    await this.saveCurrentHand()
  }
  addRandomCardsLarge(count: number) {
    const allTypes = generateAllCardTypes();
    const typeCount = allTypes.length;
    if (typeCount === 0) return;
  
    // Step 1: compute a random proportion for each type
    const allocations: number[] = [];
    let total = 0;
  
    for (let i = 0; i < typeCount; i++) {
      const rand = Player.rng();        // number in [0,1)
      allocations.push(rand);
      total += rand;
    }
  
    // Step 2: normalize so they sum to count
    for (let i = 0; i < typeCount; i++) {
      allocations[i] = Math.floor((allocations[i]! / total) * count);
    }
  
    // Step 3: handle leftover due to rounding
    const allocatedSum = allocations.reduce((a, b) => a + b, 0);
    let remaining = count - allocatedSum;
    while (remaining > 0) {
      const idx = Math.floor(Player.rng() * typeCount);
      allocations[idx]!++;
      remaining--;
    }
    // Step 4: add to handCounts
    for (let i = 0; i < typeCount; i++) {
      const card = allTypes[i]!;
      const key = card.toString();
      this.handCounts.set(key, (this.handCounts.get(key) ?? 0) + allocations[i]!);
      console.log(`${key}: ${this.handCounts.get(key)}`)
    }
  }
  addRandomCards(count: number) {
    const allTypes = generateAllCardTypes();
    for (let i = 0; i < count; i++) {
      // pick a random type
      const card = allTypes[Math.floor(Player.rng() * allTypes.length)];
      const key = card!.toString();
      this.handCounts.set(key, (this.handCounts.get(key) ?? 0) + 1);
      console.log(`${key}: ${this.handCounts.get(key)}`)
    }
  }
  removeRandomCards(count: number) {
    const allTypes = Array.from(this.handCounts.keys()); // only from cards actually in hand
    for (let i = 0; i < count; i++) {
      if (allTypes.length === 0) break;
  
      // pick a random card type that the player has
      const card = allTypes[Math.floor(Player.rng() * allTypes.length)];
      const key = card!.toString();
      const current = this.handCounts.get(key)!;
  
      if (current > 0) {
        this.handCounts.set(key, current - 1);
        console.log(`Removed 1 ${key}, now ${this.handCounts.get(key)}`);
        if (this.handCounts.get(key) === 0) {
          this.handCounts.delete(key); // clean up empty entries
          allTypes.splice(allTypes.indexOf(key), 1);
        }
      }
    }
  }
  
  removeRandomCardsLarge(count: number) {
    const keys = Array.from(this.handCounts.keys());
    const typeCount = keys.length;
    if (typeCount === 0) return;
  
    // Step 1: random proportions
    const allocations: number[] = [];
    let total = 0;
    for (let i = 0; i < typeCount; i++) {
      const rand = Player.rng();
      allocations.push(rand);
      total += rand;
    }
  
    // Step 2: normalize
    for (let i = 0; i < typeCount; i++) {
      allocations[i] = Math.floor((allocations[i]! / total) * count);
    }
  
    // Step 3: leftover
    const allocatedSum = allocations.reduce((a, b) => a + b, 0);
    let remaining = count - allocatedSum;
    while (remaining > 0) {
      const idx = Math.floor(Player.rng() * typeCount);
      allocations[idx]!++;
      remaining--;
    }
  
    // Step 4: remove from handCounts
    for (let i = 0; i < typeCount; i++) {
      const key = keys[i]!;
      const current = this.handCounts.get(key) ?? 0;
      const removeCount = Math.min(current, allocations[i]!);
      if (removeCount > 0) {
        this.handCounts.set(key, current - removeCount);
        console.log(`Removed ${removeCount} ${key}, now ${this.handCounts.get(key)}`);
        if (this.handCounts.get(key) === 0) {
          this.handCounts.delete(key);
        }
      }
    }
}
async removeAllByFilter(
    options: { suit?: string; comparator?: "less" | "greater"; number?: number }
  ) {
    console.log(`Player: ${this.id} removing by filter`, options);
  
    const keys = Array.from(this.handCounts.keys());
  
    for (const key of keys) {
      const [rankStr, cardSuit] = key.split("-");
      const rank = parseInt(rankStr!, 10);
  
      let match = true;
  
      // Suit filter
      if (options.suit && cardSuit !== options.suit) {
        match = false;
      }
  
      // Rank filter
      if (options.comparator && options.number !== undefined) {
        if (options.comparator === "less" && !(rank < options.number)) {
          match = false;
        }
        if (options.comparator === "greater" && !(rank > options.number)) {
          match = false;
        }
      }
  
      // If matches, remove completely
      if (match) {
        console.log(`Removed all ${key} (${this.handCounts.get(key)} cards)`);
        this.handCounts.set(key,0);
      }
    }
  
    console.log("Total cards now: " + this.handSize);
    await this.saveCurrentHand();
  }
  
  
  /** Weighted random choice based on card counts */
  chooseCard(): Card | null {
    const entries = Array.from(this.handCounts.entries());
    if (entries.length === 0) return null;

    // Total number of cards
    const total = entries.reduce((sum, [, count]) => sum + count, 0);

    // Roll from 0..total-1
    const roll = Math.floor(Player.rng() * total);

    // Walk cumulative sum to find the chosen card
    let cum = 0;
    for (const [key, count] of entries) {
      cum += count;
      if (roll < cum) {
        // decrement count
        if (count === 1) this.handCounts.delete(key);
        else this.handCounts.set(key, count - 1);

        // parse back into a Card object
        return Card.fromString(key);
      }
    }
    return null;
  }

  /** Total number of cards currently in hand */
  get handSize(): number {
    return Array.from(this.handCounts.values()).reduce((a, b) => a + b, 0);
  }

  /** Preview of cards for frontend (cap visual count) */
  async getHandPreview(cap: number = 300) {
    const cards: CardType[] = [];
    let overflow = 0;
  
    for (const [key, count] of this.handCounts.entries()) {
      const card = Card.fromString(key); // still returns class
      const add = Math.min(cap - cards.length, count);
  
      for (let i = 0; i < add; i++) {
        cards.push({ suit: card.suit,value: card.value }); // convert to plain type
      }
  
      overflow += count - add;
      if (cards.length >= cap) break;
    }
  
    return { cards, overflow }; // plain objects only
  }
  async getPlayerState(): Promise<PlayerStateType> {
    return {
      id: this.id,
      name: this.name,
      handSize: this.handSize,
      handPreview: await this.getHandPreview(),
      handCounts: this.getStoredCards()
    }
  }
}


class PlayerNode {
    player: Player;
    next: PlayerNode;
    prev: PlayerNode;
  
    constructor(player: Player) {
      this.player = player;
      this.next = this;
      this.prev = this;
    }
}
  
export class PlayerLinkedList {
    head: PlayerNode | null = null;
    current: PlayerNode | null = null;
  
    addPlayer(player: Player) {
      const node = new PlayerNode(player);
      if (!this.head) {
        this.head = node;
        this.current = node;
      } else {
        const tail = this.head.prev;
        tail.next = node;
        node.prev = tail;
        node.next = this.head;
        this.head.prev = node;
      }
    }
  
    removePlayer(playerId: string) {
      if (!this.head) return;
  
      let node = this.head;
      do {
        if (node.player.id === playerId) {
          if (node.next === node) {
            // Last player
            this.head = null;
            this.current = null;
          } else {
            node.prev.next = node.next;
            node.next.prev = node.prev;
            if (this.head === node) this.head = node.next;
            if (this.current === node) this.current = node.next;
          }
          break;
        }
        node = node.next;
      } while (node !== this.head);
    }
  
    advanceTurn() {
      if (!this.current) return null;
      while (this.current && this.current.player.handSize === 0) {
        this.current = this.current.next;
      }
      return this.current.player;
    }
  
    getPlayers(): Player[] {
      if (!this.head) return [];
      const result: Player[] = [];
      let node = this.head;
      do {
        result.push(node.player);
        node = node.next;
      } while (node !== this.head);
      return result;
    }
  }
  