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
  }, [gameState?.currentRules]);

  if (loading) return <div>Loading rules...</div>;
  if (!gameState) return <div>No game state found.</div>;

  return (
    <div className="flex justify-center p-4 gap-2">
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

// ---------- RuleReel (spinning column) ----------
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

  const cardWidth = 70;
  const cardHeight = 88;

  useEffect(() => {
    const seq = buildSpinSequence(allCards, chosen, loops);
    setSequence(seq);

    const timer = setTimeout(() => {
      const totalWidth = seq.length * (cardWidth); // include gap

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
    <div
      className="overflow-hidden relative rounded-xl"
      style={{ width: cardWidth, height: cardHeight, perspective: 1200 }}
    >
      {sequence.length > 0 && (
       <motion.div
       animate={controls}
       initial={{ x: cardWidth }}
       className="flex flex-row absolute top-0 left-0"
     >
       {sequence.map((card, i) => (
         <div
           key={i}
           className="flex items-center justify-center"
           style={{
             width: cardWidth,
             height: cardHeight,
           }}
         >
           <RuleCard
             back={card.id.toString()}
             front={card.description}
             onPick={() => {}}
             revealed={revealed && i === sequence.length - 1} // only reveal last card
             disabled={true} // spinning cards aren’t clickable
             width={cardWidth}
             height={cardHeight}
           />
         </div>
       ))}
     </motion.div>     
      )}
    </div>
  );
}

// ---------- RuleCard (flippable card) ----------
// ---------- RuleCard (flippable card with improved styling) ----------
export function RuleCard({
  onPick,
  revealed,
  disabled,
  back,
  front,
  width = 112,
  height = 168,
}: {
  onPick: () => void;
  revealed: boolean;
  disabled: boolean;
  back: string;
  front: string;
  width?: number;
  height?: number;
}) {
  // Calculate font sizes based on card dimensions
  const backFontSize = Math.max(12, width * 0.18); // 18% of width, min 12px
  const frontFontSize = Math.max(10, width * 0.12); // 12% of width, min 10px

  return (
    <motion.div
      className={clsx(
        "cursor-pointer perspective",
        disabled && "cursor-not-allowed"
      )}
      style={{ width, height }}
      onClick={!disabled ? onPick : undefined}
    >
      <motion.div
        className="relative w-full h-full transition-transform preserve-3d"
        animate={{ rotateY: revealed ? 180 : 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Face Down */}
        <div
          className="absolute w-full h-full flex items-center justify-center backface-hidden shadow-lg border-2 border-gray-700 "
          style={{
            backgroundColor: "#374151" // fully opaque dark gradient
          }}
        >
          <span
            className="text-white font-bold"
            style={{ fontSize: backFontSize }}
          >
            {back}
          </span>
        </div>

        {/* Face Up */}
        <div className="absolute w-full h-full rounded-xl flex flex-col items-center justify-center backface-hidden rotate-y-180 shadow-lg border-2 border-yellow-400 bg-gradient-to-br from-yellow-200 via-yellow-300 to-yellow-100 p-2">
          <span
            className="text-black text-center font-semibold"
            style={{ fontSize: frontFontSize }}
          >
            {front}
          </span>
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
