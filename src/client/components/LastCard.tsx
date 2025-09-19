import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useGameState } from "../GameStateContext";
import { Card } from "./Card";
import { CardType } from "../../shared/types/api";

export const LastCard = () => {
  const { gameState, loading } = useGameState();
  const [lastCard, setLastCard] = useState<CardType>();

  useEffect(() => {
    if (gameState?.lastCardPlaced) {
      setLastCard(gameState.lastCardPlaced);
    }
  }, [gameState]);

  if (loading) return <div>Loading rules...</div>;
  if (!gameState) return <div>No game state found.</div>;

  return (
    <div className="flex-1 flex justify-center items-center relative">
      <AnimatePresence mode="wait">
        {lastCard && (
          <motion.div
            key={lastCard.value} // unique key per card so animation triggers correctly
            initial={{ y: -200, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-row items-center gap-6"
          >
            {/* Actual card */}
            <Card {...lastCard} />

            {/* Example placeholder “Front” card */}
            <div className="w-20 h-14 bg-white rounded-xl flex items-center justify-center shadow-md border-2 border-yellow-400">
              <span className="text-black text-center font-semibold">{gameState.previousRuleEnforced.description}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
