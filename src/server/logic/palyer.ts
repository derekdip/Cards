import { redis } from "@devvit/web/server";
import { Card, generateAllCardTypes } from "./card"; // your Card class
import { PlayerStateType, StoredCardType, CardType } from "../../shared/types/api";

export class Player {
  id: string;
  name: string;
  active: boolean=true;
  static rng: () => number;
  // Hand stored as counts for each card type
  handCounts: Map<string, StoredCardType>;

  constructor(id: string, name?: string, map?:Map<string, StoredCardType>) {
    this.id = id ;
    this.name = name ?? `${this.id.slice(0, 4)}`;
    this.handCounts = map?map:new Map<string, StoredCardType>();
  }
  setActive(active:boolean){
    this.active=active
  }
  static setRNG(rng: () => number) {
    Player.rng = rng;
  }

  async saveCurrentHand() {
    console.log(`Player: ${this.id} hand contents:`);
    for (const [key, value] of this.handCounts.entries()) {
        await redis.set(`player-${this.id}-${value.value}-${value.suit}`,value.count.toString())
    }
  }
  getTotalCardsInHand(){
    let total = 0
    for(const [_, value] of this.handCounts.entries()){
      total+=value.count
    }
    return total
  }

  setCards(storedCards: StoredCardType[]) {
    this.handCounts.clear(); // start fresh
    for (const { id ,suit,value, count } of storedCards) {
      this.handCounts.set(id, {count,id,suit,value});
    }
  }
  getStoredCards(): StoredCardType[] {
    const result: StoredCardType[] = [];
    for (const [_type, card] of this.handCounts.entries()) {
      result.push(card);
    }
    return result;
  }
  async addCards(count: number,  types:Card[]=generateAllCardTypes()) {
    console.log("Player: "+this.id+" adding cards:")
    if(count>400){
        this.addRandomCardsLarge(count,types)
    }else{
        this.addRandomCards(count,types)
    }
    await this.saveCurrentHand()
  }
  async removeCards(count: number, types:Card[]) {
    console.log("Player: "+this.id+" removing cards:")
    if(count>400){
        this.removeRandomCardsLarge(count,types)
    }else{
        this.removeRandomCards(count,types)
    }
    await this.saveCurrentHand()
  }
  addRandomCardsLarge(count: number, types:Card[]) {
    const typeCount = types.length;
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
      const card = types[i]!;
      const key = card.toString();
      let cardEntry = this.handCounts.get(key);
      if (!cardEntry) {
        cardEntry = { id: key, suit: card.suit, value: card.value, count: 0 };
        this.handCounts.set(key, cardEntry);
      }
      this.handCounts.set(key, {...cardEntry, count: cardEntry.count + allocations[i]!});
    }
  }
  addRandomCards(count: number, types:Card[]) {
    for (let i = 0; i < count; i++) {
      // pick a random type
      const card = types[Math.floor(Player.rng() * types.length)]!;
      const key = card!.toString();
      let cardEntry = this.handCounts.get(key);
      if (!cardEntry) {
        cardEntry = { id: key, suit: card.suit, value: card.value, count: 0 };
        this.handCounts.set(key, cardEntry);
      }
      this.handCounts.set(key, {...cardEntry, count: cardEntry.count + 1});
    }
  }
  removeRandomCards(count: number, types:Card[]) {
    const allTypes = Array.from(this.handCounts.values()).filter((key) =>
      types.some((t) => {
        return t.toString() == key.id
      })
    );console.log("here is all types needed to be removed")
    console.log(allTypes)
    for (let i = 0; i < count; i++) {
      if (allTypes.length === 0) break;
  
      // pick a random card type that the player has
      const card = allTypes[Math.floor(Player.rng() * allTypes.length)];
      const key = card;
      if(!key){
        continue
      }
      const cardEntry = this.handCounts.get(key.id)!;
  
      if (cardEntry.count > 0) {
        this.handCounts.set(key.id, {...cardEntry, count: cardEntry.count - 1});
        if (this.handCounts.get(key.id)?.count === 0) {
          this.handCounts.delete(key.id); // clean up empty entries
          allTypes.splice(allTypes.indexOf(key), 1);
        }
      }
    }
  }
  
  removeRandomCardsLarge(count: number, types:Card[]) {
    const keys = Array.from(this.handCounts.values()).filter((key) =>
      types.some((t) => t.toString() == key.id)
    );
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
      const current = this.handCounts.get(key.id) ?? 0;
      let cardEntry = this.handCounts.get(key.id);
      if (!cardEntry) {
        continue; // should not happen
      }
      const removeCount = Math.min(cardEntry.count, allocations[i]!);
      if (removeCount > 0) {
        this.handCounts.set(key.id, {...cardEntry,count:cardEntry.count - removeCount});
        if (this.handCounts.get(key.id)?.count === 0) {
          this.handCounts.delete(key.id);
        }
      }
    }
}
 async updateCards(multiplier:number, types:Card[]){
  let totalCards = this.getTotalCardsInHand()
  let deltaTotalCardCount = (multiplier*totalCards - totalCards)
  console.log("delta:"+deltaTotalCardCount)
  if(deltaTotalCardCount<0){
    await this.removeCards(Math.abs(deltaTotalCardCount),types)
  }else{
    await this.addCards(deltaTotalCardCount,types)
  }
 }
  
  
  /** Weighted random choice based on card counts */
  async chooseCard(): Promise<Card | null> {
    const entries = Array.from(this.handCounts.entries());
    if (entries.length === 0) return null;

    // Total number of cards
    const total = entries.reduce((sum, [, card]) => sum + card.count, 0);

    // Roll from 0..total-1
    const roll = Math.floor(Player.rng() * total);

    // Walk cumulative sum to find the chosen card
    let cum = 0;
    for (const [key, card] of entries) {
      cum += card.count;
      if (roll < cum) {
        // decrement count
        if (card.count === 1) this.handCounts.delete(key);
        else this.handCounts.set(key, {...card,count:card.count - 1});

        // parse back into a Card object
        return Card.fromString(key);
      }
    }
    await this.saveCurrentHand()
    return null;
  }

  /** Preview of cards for frontend (cap visual count) */
  async getHandPreview(cap: number = 300) {
    const cards: CardType[] = [];
    let overflow = 0;
  
    for (const [key, cardDetails] of this.handCounts.entries()) {
      const card = Card.fromString(key); // still returns class
      const add = Math.min(cap - cards.length, cardDetails.count);
  
      for (let i = 0; i < add; i++) {
        cards.push({ suit: card.suit,value: card.value }); // convert to plain type
      }
  
      overflow += cardDetails.count - add;
      if (cards.length >= cap) break;
    }
  
    return { cards, overflow }; // plain objects only
  }
  async getPlayerState(): Promise<PlayerStateType> {
    return {
      id: this.id,
      name: this.name,
      handSize: this.getTotalCardsInHand(),
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
  
    advanceTurn() {
      if (!this.current) return null;
      console.log("prev: "+this.current.player.id)
      while ( this.current.next.player.id!=this.current.player.id) {
        this.current = this.current.next;
        if(this.current.player.getTotalCardsInHand()!=0){
          break
        }
      }
      console.log("next: "+this.current.player.id)
      return this.current.player;
    }
    // Peek next active player without changing current
    peekNextPlayer(): Player | null {
      if (!this.current) return null;

      let node = this.current.next;
      while (node !== this.current) {
        if (node.player.getTotalCardsInHand() > 0) return node.player;
        node = node.next;
      }
      return this.current.player.getTotalCardsInHand() > 0 ? this.current.player : null;
    }

    // Get previous active player
    getPreviousPlayer(): Player | null {
      if (!this.current) return null;

      let node = this.current.prev;
      while (node !== this.current) {
        if (node.player.getTotalCardsInHand() > 0) return node.player;
        node = node.prev;
      }
      return this.current.player.getTotalCardsInHand() > 0 ? this.current.player : null;
    }

    // Get all active players
    getAllActivePlayers(): Player[] {
      if (!this.current) return [];

      const active: Player[] = [];
      let node = this.current;
      do {
        if (node.player.getTotalCardsInHand() > 0) active.push(node.player);
        node = node.next;
      } while (node !== this.current);

      return active;
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
  