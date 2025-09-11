import { useState } from "react";
import { RuleCard } from "./RuleCard";

interface RuleHandProps {
  rules: string[]; // list of rule descriptions
}

export function RuleHand({ rules }: RuleHandProps) {
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);

  const handlePick = (index: number) => {
    if (pickedIndex === null) {
      setPickedIndex(index);
    }
  };

  return (
    <div className="flex flex-wrap gap-4 justify-center p-4">
      {rules.map((rule, i) => (
        <RuleCard
          key={i}
          text={rule}
          onPick={() => handlePick(i)}
          revealed={pickedIndex === i}
          disabled={pickedIndex !== null && pickedIndex !== i}
        />
      ))}
    </div>
  );
}
