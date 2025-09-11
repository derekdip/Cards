import { motion } from "motion/react";
import clsx from "clsx";

interface RuleCardProps {
  text: string;
  onPick: () => void;
  revealed: boolean;
  disabled: boolean;
}

export function RuleCard({ onPick, revealed, disabled }: RuleCardProps) {
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
        {/* Front (Face Down) */}
        <div className="absolute w-full h-full bg-gray-800 rounded-xl flex items-center justify-center backface-hidden">
          <span className="text-white font-bold">Back</span>
        </div>

        {/* Back (Face Up) */}
        <div className="absolute w-full h-full bg-white rounded-xl flex items-center justify-center backface-hidden rotate-y-180 shadow-md">
          <span className="text-black text-center p-2">Front</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
