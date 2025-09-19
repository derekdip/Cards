import { motion, AnimatePresence } from "motion/react";
import { PlayerStateType } from "../../shared/types/api";
import { Carousel } from "./Carousel";
import { useEffect, useRef, useState, useMemo } from "react";

const suits = [{str:"Clubs",val:"♣"},{str:"Diamonds",val:"♦"},{str:"Hearts",val:"♥"},{str:"Spades",val:"♠"}]
const values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export function PlayerModal({
  players,
  onClose,
}: {
  players: PlayerStateType[];
  onClose: () => void;
}) {
  if (!players) return null;

  const containerRef = useRef<HTMLDivElement>(null);
  const [slideWidth, setSlideWidth] = useState(0);
  const [slideHeight,setSlideHeight] = useState(0)
  const [toggledCards, setToggledCards] = useState<Record<string, boolean>>({});

  const handleToggle = (key: string,player:PlayerStateType) => {
    for(let card of player.handCounts){
      if(`${player.id}-${card.value}-${card.suit}`==key){
        setToggledCards((prev) => ({
          ...prev,
          [key]: !prev[key],
        }));
        break
      }
    }
  };

  // Resize handler
  useEffect(() => {
    function handleResize() {
      if (containerRef.current) {
        setSlideWidth(containerRef.current.offsetWidth * 0.8);
        setSlideHeight(containerRef.current.offsetHeight*3)
      }
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Build lookup map { "value-suit": count }

  return (
    <AnimatePresence>
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        ref={containerRef}
        className="bg-white rounded-2xl p-6 max-w-4xl w-full shadow-lg"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
              <Carousel snapToInterval={slideWidth} height={slideHeight}>
                {players.map((player)=>{
                  const cardCounts = useMemo(() => {
                    const map: Record<string, number> = {};
                    for (const c of player.handCounts) {
                      const key = `${player.id}-${c.value}-${c.suit}`;
                      map[key] = c.count;
                    }
                    return map;
                  }, [players]);
                
                  // Compute total of toggled cards
                  const toggledTotal = useMemo(() => {
                    return Object.entries(toggledCards).reduce((sum, [key, active]) => {
                      if (active) sum += cardCounts[key] ?? 0;
                      return sum;
                    }, 0);
                  }, [toggledCards, cardCounts]);
                  return(
                    <div>
                      <h2 className="text-xl font-bold mb-2">{player.id}’s Cards</h2>
                      <p className="mb-2 text-gray-600">
                        Total: {player.handSize} cards in hand
                      </p>
                      <p className="mb-4 text-green-600 font-semibold">
                        Toggled Total: {toggledTotal}
                      </p>
            
                      <div className="w-full max-w-4xl">
                    <div className="grid grid-cols-10 text-center text-sm">
                      {suits.map((suit) =>
                        values.map((val) => {
                          const key = `${player.id}-${val}-${suit.str}`;
                          const count = cardCounts[key] ?? 0;
                          const isToggled = toggledCards[key] ?? false;

                          return (
                            <div
                              key={key}
                              className={`h-10 w-8 border rounded-md flex flex-col items-center justify-center cursor-pointer ${
                                count == 0?"bg-gray-500": isToggled ? "bg-green-400" : "bg-gray-100"
                              }`}
                              style={{ marginLeft: "-8px" }}
                              onClick={() => handleToggle(key,player)}
                            >
                              {count > 0&&
                                <span>
                                  {val}
                                  {suit.val}
                                </span>
                              }
                            </div>
                          );
                        })
                      )}
                    </div>
              </div>
                  </div>
                  )
                })}
              </Carousel>

          <div className="mt-6 flex justify-end">
            <button
              className="px-4 py-2 rounded-md bg-red-500 text-white"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
