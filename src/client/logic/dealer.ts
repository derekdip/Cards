
import { Rule, allPossibleRules } from "./rules";
export class Dealer{
    // enforceRule(cardPlayed:Card){
    //     GameState.dealerRules[0].apply(GameState,GameState.placedCards[GameState.placedCards.length-1])
    // 
    static rng: ()=>number;
    static dealerRules: Rule[] = [];
    static setRNG(rng:()=>number){
        Dealer.rng = rng
    }
    static currentRulesDisplayed:Rule[] = []
    static initializeDealerDeck() {
        Dealer.dealerRules = [...allPossibleRules];
        this.shuffle(Dealer.dealerRules);
    }
    static getThreeCards(){
        Dealer.dealerRules = [...allPossibleRules];
        Dealer.shuffle(Dealer.dealerRules);
        const [rule1,rule2,rule3]= [Dealer.dealerRules.pop()!,Dealer.dealerRules.pop()!,Dealer.dealerRules.pop()!]
        Dealer.currentRulesDisplayed = [rule1,rule2,rule3]
        return { rule1, rule2, rule3 }
    }
    static getCurrentDealerCards(): Rule[] {
        const rules: Rule[] = [];
        for (const rule of Dealer.dealerRules) {
          rules.push(rule);
        }
        return rules;
    }
    static fromString(ruleID: string): Rule  {
        const id = parseInt(ruleID);
        for (const rule of allPossibleRules) {
          if (rule.id === id) return rule;
        }
        return allPossibleRules[0]!;
      }
      /** Shuffle an array using RNG */
    private static shuffle<T>(arr: T[]): T[] {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Dealer.rng() * (i + 1));
          [arr[i], arr[j]] = [arr[j]!, arr[i]!];
        }
        return arr;
    }
}