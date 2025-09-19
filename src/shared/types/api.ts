export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
  username: string;
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};

export type StoredCardType = {
  suit:string;
  value:number;
  id: string; // e.g., "5-Hearts" or "-1-Special"
  count: number;
};
export type CardType = {
  value: number; // 0-9 for regular, -1 for special
  suit: string;  // e.g., "Hearts", "Diamonds", "Special"
};
export type Target = "self" | "next" | "previous" | "all";

export type RuleType = {
  id: number;
  description: string;
  successText: string;
  failText: string;
  successTarget: Target;
  failTarget: Target;
};
export type PlayerStateType = {
  id: string;
  name: string;
  handSize: number;
  handPreview: { cards: CardType[]; overflow: number };
  handCounts: StoredCardType[];
};
export type GameStateType = {
  players:  PlayerStateType[];
  currentPlayer: string | undefined;
  lastCardPlaced: CardType;
  currentRules: RuleType[];
  endVotingTime: number;
  allRules: RuleType[];
}