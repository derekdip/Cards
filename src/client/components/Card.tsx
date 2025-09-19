import { CardType } from "../../shared/types/api";
const suits = [{str:"Clubs",val:"♣"},{str:"Diamonds",val:"♦"},{str:"Hearts",val:"♥"},{str:"Spades",val:"♠"}]
export function Card({value,suit}: CardType) {
    return (
        <div
        className={`h-10 w-8 border rounded-md flex flex-col items-center justify-center cursor-pointer bg-gray-100`}
        style={{ marginLeft: "-8px" }}
      >
        
          <span>
            {value}
            {suits.find(s=>s.str===suit)?.val}
          </span>
      </div>
    );
  }