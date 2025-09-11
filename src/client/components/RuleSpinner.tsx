import { useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import clsx from "clsx";
import { useGameState } from "../GameStateContext"; // adjust path
import { RuleType } from "../../shared/types/api"; // adjust path

// ---------- RuleHand (top-level controller) ----------
export function RuleHand({ loops = 2 }: { loops?: number }) {
    const { gameState, loading } = useGameState();
    const [revealed, setRevealed] = useState(false);
  
    useEffect(() => {
      if (!gameState?.currentRules) return;
  
      // Reset before each spin
      setRevealed(false);
  
      const totalSpinTime = 4000 + (gameState.currentRules.length - 1) * 500;
      const timer = setTimeout(() => {
        setRevealed(true); // reveal chosen cards after spin
      }, totalSpinTime + 200);
  
      return () => clearTimeout(timer);
    }, [gameState?.currentRules]); // <-- reset/retrigger when rules change
  
    if (loading) return <div>Loading rules...</div>;
    if (!gameState) return <div>No game state found.</div>;
  
    return (
      <div className="flex gap-6 justify-center p-4">
        {gameState.currentRules.map((rule, i) => (
          <RuleReel
            key={i}
            allCards={gameState.allRules}
            chosen={rule}
            delay={i * 0.5}
            loops={loops}
            revealed={revealed}
          />
        ))}
      </div>
    );
  }
  

// ---------- RuleReel (one spinning column) ----------
function RuleReel({
  allCards,
  chosen,
  delay = 0,
  loops,
  revealed,
}: {
  allCards: RuleType[];
  chosen: RuleType;
  delay?: number;
  loops: number;
  revealed: boolean;
}) {
  const controls = useAnimation();
  const [sequence, setSequence] = useState<RuleType[]>([]);

  useEffect(() => {
    const seq = buildSpinSequence(allCards, chosen, loops);
    setSequence(seq);

    const timer = setTimeout(() => {
      const cardWidth = 96; // width for RuleCard
      const totalWidth = seq.length * cardWidth;

      controls.start({
        x: -(totalWidth - cardWidth),
        transition: {
          duration: 4 + delay,
          ease: [0.25, 1, 0.5, 1],
        },
      });
    }, 50);

    return () => clearTimeout(timer);
  }, [allCards, chosen, delay, loops, controls]);

  return (
    <div className="h-36 w-24 bg-gray-800 rounded-xl overflow-hidden relative">
      {sequence.length > 0 && (
        <motion.div
          animate={controls}
          initial={{ x: 96 }} // just off right
          className="flex flex-row absolute top-0 left-0"
        >
          {sequence.map((card, i) => (
            <div key={i} className="flex items-center justify-center">
              {/* The last card in the sequence is the chosen one */}
              {i === sequence.length - 1 ? (
                <RuleCard
                  back={card.id.toString()}
                  front={card.description}
                  onPick={() => {}}
                  revealed={revealed}
                  disabled={false}
                />
              ) : (
                <div className="w-24 h-36 flex items-center justify-center text-white text-xl font-bold">
                  {card.id}
                </div>
              )}
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

// ---------- RuleCard (flippable card) ----------
export function RuleCard({
  onPick,
  revealed,
  disabled,
  back,
  front
}: {
  onPick: () => void;
  revealed: boolean;
  disabled: boolean;
  back: string;
  front: string;
}) {
  return (
    <motion.div
      className={clsx(
        "w-24 h-36 cursor-pointer perspective",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onClick={!disabled ? onPick : undefined}
    >
      <motion.div
        className="relative w-full h-full transition-transform preserve-3d"
        animate={{ rotateY: revealed ? 180 : 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Face Down */}
        <div className="absolute w-full h-full bg-gray-800 rounded-xl flex items-center justify-center backface-hidden">
          <span className="text-white font-bold">{back}</span>
        </div>

        {/* Face Up */}
        <div className="absolute w-full h-full bg-white rounded-xl flex items-center justify-center backface-hidden rotate-y-180 shadow-md">
          <span className="text-black text-center p-2">{front}</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------- Helper: build spin sequence ----------
function buildSpinSequence(
  allCards: RuleType[],
  chosen: RuleType,
  loops: number = 1
): RuleType[] {
  const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

  let sequence: RuleType[] = [];
  for (let i = 0; i < loops; i++) {
    sequence = sequence.concat(shuffle(allCards));
  }
  return sequence.concat([chosen]);
}
