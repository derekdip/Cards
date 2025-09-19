import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useGameState } from "../GameStateContext";
import { Card } from "./Card";
import { CardType } from "../../shared/types/api";

export const LastCard = () => {
  const { gameState, loading } = useGameState();
  const [lastCard, setLastCard] = useState<CardType>();

  // Trigger animation when the lastCard changes
  useEffect(() => {
    if (gameState?.lastCardPlaced) {
      setLastCard(gameState.lastCardPlaced);
    }
  }, [gameState]);
  if (loading) return <div>Loading rules...</div>;
  if (!gameState) return <div>No game state found.</div>;

  return (
    <div className="flex-1 flex justify-center items-center relative">
      <AnimatePresence>
        {lastCard && (
          <motion.div
            key={lastCard.suit}
            initial={{ y: -200, opacity: 0, scale: 0.8 }} // start near player side (top)
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute"
          >
            <Card {...lastCard} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
