import { useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import clsx from "clsx";
import { useGameState } from "../GameStateContext"; // adjust path
import { RuleType } from "../../shared/types/api"; // adjust path

// ---------- RuleHand (top-level controller) ----------
export function RuleHand({ loops = 2}: { loops?: number}) {
  const { gameState, loading, setPlayerChoice } = useGameState();
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!gameState?.currentRules) return;

    // Reset before each spin
    setRevealed(false);

    const totalSpinTime = 2000 + (gameState.currentRules.length - 1) * 300;
    const timer = setTimeout(() => {
      setRevealed(true); // reveal chosen cards after spin
    }, totalSpinTime + 120);

    return () => clearTimeout(timer);
  }, [gameState?.currentRules]);

  if (loading) return <div>Loading rules...</div>;
  if (!gameState) return <div>No game state found.</div>;

  return (
    <div className="flex justify-center p-4 gap-2">
      {gameState.currentRules.map((rule, i) => (
        <RuleReel
          index={i}
          key={i}
          allCards={gameState.allRules}
          chosen={rule}
          delay={i * 0.5}
          loops={loops}
          revealed={revealed}
          setPlayerChoice={setPlayerChoice}
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
  setPlayerChoice,
  index,
}: {
  allCards: RuleType[];
  chosen: RuleType;
  delay?: number;
  loops: number;
  revealed: boolean;
  setPlayerChoice: (choice:number)=>void,
  index: number; 
}) {
  const controls = useAnimation();
  const [sequence, setSequence] = useState<RuleType[]>([]);

  const cardWidth = 100;
  const cardHeight = 148;

  useEffect(() => {
    const seq = buildSpinSequence(allCards, chosen, loops);
    setSequence(seq);

    const timer = setTimeout(() => {
      const totalWidth = seq.length * (cardWidth); // include gap

      controls.start({
        x: -(totalWidth - cardWidth),
        transition: {
          duration: 2 + delay,
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
             front={card}
             onPick={() => {setPlayerChoice(index)}}
             revealed={revealed && i === sequence.length - 1} // only reveal last card
             disabled={false} // spinning cards aren’t clickable
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
  width = 132,
  height = 200,
}: {
  onPick: () => void;
  revealed: boolean;
  disabled: boolean;
  back: string;
  front: RuleType;
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
        <div className="absolute w-full h-full rounded-xl flex flex-col justify-center backface-hidden rotate-y-180 shadow-lg border-2 border-yellow-400 bg-gradient-to-br from-yellow-200 via-yellow-300 to-yellow-100 p-4 space-y-1">
  {/* Description */}
  <div className="text-black text-center font-semibold" style={{ fontSize: frontFontSize }}>
    {front.description}
  </div>

  {/* Divider */}
  <div className="w-full border-t-2 border-yellow-500 opacity-70" />

  {/* Success text */}
  <div className="text-green-700 text-center font-medium" style={{ fontSize: frontFontSize * 0.9 }}>
    ✅ {front.successText}
  </div>

  {/* Divider */}
  <div className="w-full border-t border-yellow-400 opacity-50" />

  {/* Fail text */}
  <div className="text-red-700 text-center font-medium" style={{ fontSize: frontFontSize * 0.9 }}>
    ❌ {front.failText}
  </div>
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
