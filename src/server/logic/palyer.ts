import { redis } from "@devvit/web/server";
import { Card, generateAllCardTypes } from "./card"; // your Card class
import { PlayerStateType, StoredCardType, CardType } from "../../shared/types/api";

export class Player {
  id: string;
  name: string;
  static rng: () => number;
  // Hand stored as counts for each card type
  handCounts: Map<string, StoredCardType>;
  handSize:number=0

  constructor(id: string, name?: string, map?:Map<string, StoredCardType>) {
    this.id = id ;
    this.name = name ?? `Bot-${this.id.slice(0, 4)}`;
    this.handCounts = map?map:new Map<string, StoredCardType>();
  }
  static setRNG(rng: () => number) {
    Player.rng = rng;
  }

  async saveCurrentHand() {
    console.log(`Player: ${this.id} hand contents:`);
    let total = 0
    for (const [key, card] of this.handCounts.entries()) {
        await redis.set(`player-${this.id}-${key}`,card.count.toString())
        console.log(`${key}: ${card.count}`);
        total+= card.count
    }
    this.handSize = total
    console.log("Total cards now: " + this.handSize);
  }

  setCards(storedCards: StoredCardType[]) {
    this.handCounts.clear(); // start fresh
    console.log("Player: "+this.id+" adding cards:")
    let total = 0
    for (const card of storedCards) {
      this.handCounts.set(card.id, card);
      console.log(`${card.id}: count ${card.count}`)
      total+= card.count
    }
    this.handSize = total
  }
  getStoredCards(): StoredCardType[] {
    const result: StoredCardType[] = [];
    for (const [_type, card] of this.handCounts.entries()) {
      result.push(card);
    }
    return result;
  }
  async addCards(count: number, cardTypesToAdd:Card[]=generateAllCardTypes()) {
    console.log("Player: "+this.id+" adding cards:")
    if(count>20){
        this.addRandomCardsLarge(count,cardTypesToAdd)
    }else{
        this.addRandomCards(count,cardTypesToAdd)
    }
    console.log("Total cards now: "+this.handSize)
    await this.saveCurrentHand()
  }
  async removeCards(count: number, cardTypesToRemove:Card[]=generateAllCardTypes()) {
    console.log("Player: "+this.id+" removing cards:")
    if(count>20){
        this.removeRandomCardsLarge(count,cardTypesToRemove)
    }else{
        this.removeRandomCards(count,cardTypesToRemove)
    }
    console.log("Total cards now: "+this.handSize)
    await this.saveCurrentHand()
  }
  addRandomCardsLarge(count: number, cardTypesToAdd:Card[]=generateAllCardTypes()) {
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
      const playerCard =  this.handCounts.get(key)
      if(!playerCard){
        this.handCounts.set(key, {id:card.toString(),suit:card.suit,value:card.value,count: allocations[i]!})
      }else{
        this.handCounts.set(key, {...playerCard,count:playerCard.count + allocations[i]!});
      }
      console.log(`${key}: ${this.handCounts.get(key)}`)
    }
  }
  addRandomCards(count: number, cardTypesToAdd:Card[]=generateAllCardTypes()) {
    const allTypes = generateAllCardTypes();
    for (let i = 0; i < count; i++) {
      // pick a random type
      const card = allTypes[Math.floor(Player.rng() * allTypes.length)]!;
      const key = card!.toString();
      const playerCard =  this.handCounts.get(key)
      if(!playerCard){
        this.handCounts.set(key, {id:card.toString(),suit:card.suit,value:card.value,count: 1})
      }else{
        this.handCounts.set(key, {...playerCard,count:playerCard.count + 1});
      }
      console.log(`${key}: ${this.handCounts.get(key)}`)
    }
  }
  async removeRandomCards(count: number,cardTypesToRemove:Card[]=generateAllCardTypes()) {
    const handTypes = Array.from(this.handCounts.keys())
    // Find the intersection by matching `id`
    const sharedTypes = handTypes.filter(handType =>
      cardTypesToRemove.some(removeType => removeType.toString() == handType)
    );
    for (let i = 0; i < count; i++) {
      if (sharedTypes.length === 0) break;
  
      // pick a random card type that the player has
      const card = sharedTypes[Math.floor(Player.rng() * sharedTypes.length)];
      if(!card){
        continue
      }
      const key = card.toString();
      const playerCard = this.handCounts.get(key);
      if(!playerCard){
        continue
      }
  
      if (playerCard.count > 0) {
        this.handCounts.set(key, {...playerCard,count:(playerCard.count - 1)});
        console.log(`Removed 1 ${key}, now ${this.handCounts.get(key)}`);
        if (playerCard.count <= 0) {
          this.handCounts.delete(key); // clean up empty entries
          await redis.del(`player-${this.id}-${key}`)
          sharedTypes.splice(sharedTypes.indexOf(key), 1);
        }
      }
    }
  }
  
  async removeRandomCardsLarge(count: number, cardTypesToRemove:Card[]=generateAllCardTypes()) {
    const handTypes = Array.from(this.handCounts.keys())
    // Find the intersection by matching `id`
    const sharedTypes = handTypes.filter(handType =>
      cardTypesToRemove.some(removeType => removeType.toString() == handType)
    );
    const typeCount = sharedTypes.length;
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
    let overflow = 0
    for (let i = 0; i < typeCount; i++) {
      const key = sharedTypes[i]!;
      const playerCard = this.handCounts.get(key);
      if(!playerCard){
        continue
      }
      const removeCount = Math.min(playerCard.count, allocations[i]!)+overflow;
      let cardsRemoved = playerCard.count - removeCount
      if (cardsRemoved>=0) {
        this.handCounts.set(key, {...playerCard, count: (playerCard.count - removeCount)});
        console.log(`Removed ${removeCount} ${key}, now ${this.handCounts.get(key)}`);
        if (playerCard.count <= 0) {
          this.handCounts.delete(key);
          await redis.del(`player-${this.id}-${key}`)
        }
      }else{
        overflow= Math.abs(cardsRemoved)
        this.handCounts.delete(key);
        await redis.del(`player-${this.id}-${key}`)
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
        this.handCounts.delete(key);
        await redis.del(`player-${this.id}-${key}`)
      }
    }
  
    console.log("Total cards now: " + this.handSize);
    await this.saveCurrentHand();
  }
  async updateCards(multiplier:number,cardTypesToAddOrRemove:Card[]){
    let totalCards = this.handSize
    let deltaTotalCardCount = (multiplier*totalCards - totalCards)
    console.log("delta:"+deltaTotalCardCount)
    if(deltaTotalCardCount<0){
      await this.removeCards(Math.abs(deltaTotalCardCount),cardTypesToAddOrRemove)
    }else{
      await this.addCards(deltaTotalCardCount,cardTypesToAddOrRemove)
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
    for (const [key, playerCard] of entries) {
      cum += playerCard.count;
      if (roll < cum) {
        // decrement count
        if (playerCard.count === 1) {
          this.handCounts.delete(key);
          await redis.del(`player-${this.id}-${key}`)
        }
        else this.handCounts.set(key, {...playerCard,count:(playerCard.count - 1)});
        await this.saveCurrentHand()

        // parse back into a Card object
        return Card.fromString(key);
      }
    }
    return null;
  }

  /** Preview of cards for frontend (cap visual count) */
  async getHandPreview(cap: number = 300) {
    const cards: CardType[] = [];
    let overflow = 0;
  
    for (const [key, playerCard] of this.handCounts.entries()) {
      const card = Card.fromString(key); // still returns class
      const add = Math.min(cap - cards.length, playerCard.count);
  
      for (let i = 0; i < add; i++) {
        cards.push({ suit: card.suit,value: card.value }); // convert to plain type
      }
  
      overflow += playerCard.count - add;
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
      let starting = this.current.player
      let next = this.current.next
      while (next.player.handSize === 0) {
        this.current = this.current.next;
        next = this.current.next
        if(this.current.player.id==starting.id){
          return null
        }
      }
      this.current = next
      return next.player;
    }
    peekNextPlayer(){
      if (!this.current) return null;
      let starting = this.current.player
      let next = this.current.next
      let current = this.current
      while (next.player.handSize === 0) {
        current = current.next;
        next = current.next
        if(current.player.id==starting.id){
          return null
        }
      }
      return next.player;
    }
    getPreviousPlayer(){
      if (!this.current) return null;
      let starting = this.current
      let prev = this.current.prev
      let current = this.current
      while (prev.player.handSize === 0) {
        current = current.prev;
        prev = current.prev
        if(current.player.id==starting.player.id){
          return null
        }
      }
      return prev.player;
    }
    getAllActivePlayers(){
      let activePlayers:Player[]=[]
      if (!this.current) return [];
      let starting = this.current.player
      let next = this.current.next
      let current = this.current
      if(current.player.handSize != 0){
        activePlayers.push(current.player)
      }
      while (next.player.id!=starting.id) {
        if(next.player.handSize>0){
          activePlayers.push(next.player)
        }
        current = current.next;
        next = current.next
      }
      return activePlayers;
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
  