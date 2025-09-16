import { motion, AnimatePresence } from "motion/react";
import { PlayerStateType } from "../../shared/types/api";
import { Carousel } from "./Carousel";
import { useEffect, useRef, useState } from "react";

const suits = ["♣", "♦", "♥", "♠"];
const values = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function PlayerModal({ player, onClose }: { player: PlayerStateType; onClose: () => void }) {
  if (!player) return null;
  const containerRef = useRef<HTMLDivElement>(null);
  const [slideWidth, setSlideWidth] = useState(0);
  const [toggledCards, setToggledCards] = useState<Record<string, boolean>>({});

  const handleToggle = (key: string) => {
    setToggledCards((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  // measure on mount + resize
  useEffect(() => {
    function handleResize() {
      if (containerRef.current) {
        setSlideWidth(containerRef.current.offsetWidth*.80);
      }
    }
    handleResize(); // initial
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Build lookup map { "value-suit": count }
  const cardCounts: Record<string, number> = {};
  for (const c of player.handCounts) {
    const key = `${c.type}`;
    cardCounts[key] = c.count;
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white rounded-2xl p-6 max-w-4xl w-full shadow-lg"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
        >
          <h2 className="text-xl font-bold mb-2">{player.name}’s Cards</h2>
          <p className="mb-4 text-gray-600">
            Total: {player.handSize} cards in hand
          </p>
          <div
      ref={containerRef}
      className="w-full max-w-4xl" // keeps modal contained
    >
      {slideWidth > 0 && (
          <Carousel snapToInterval={slideWidth} >
            <div>hello</div>
          {/* Grid of 9x4 fixed slots */}
          {/* Grid of cards */}
          <div className="grid grid-cols-9 text-center text-sm">
            {suits.map((suit) =>
              values.map((val) => {
                const key = `${val}-${suit}`;
                const count = cardCounts[key] ?? 0;
                const isToggled = toggledCards[key] ?? false;

                return (
                  <div
                    key={key}
                    className={`h-10 w-8 border rounded-md flex flex-col items-center justify-center cursor-pointer ${
                      isToggled ? "bg-green-400" : "bg-gray-100"
                    }`}
                    style={{ marginLeft: "-8px" }}
                    onClick={() => handleToggle(key)}
                  >
                    <span>{val}{suit}</span>
                    <span className="text-xs text-gray-500">
                      {count > 0 ? `×${count}` : ""}
                    </span>
                  </div>
                );
              })
            )}
          </div>
          </Carousel>)}
          </div>

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