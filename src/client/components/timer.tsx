import { useEffect, useState } from "react";
import { useGameState } from "../GameStateContext";

export const Timer = () => {
  const { gameState, loading } = useGameState();
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!gameState?.endVotingTime) return;
    console.log("Setting up timer for", gameState.endVotingTime);
    const tick = () => {
      const now = Date.now();
      console.log("diff",gameState.endVotingTime - now);
      setTimeLeft(Math.max(0, gameState.endVotingTime - now));
    };

    tick(); // immediately update
    const interval = setInterval(tick, 1000);

    return () => clearInterval(interval);
  }, [gameState?.endVotingTime]);

  if (loading || !gameState) return <div>Loading timer...</div>;

  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
  const seconds = Math.floor((timeLeft / 1000) % 60);

  return (
    <div>
      {hours.toString().padStart(2, "0")}:
      {minutes.toString().padStart(2, "0")}:
      {seconds.toString().padStart(2, "0")}
    </div>
  );
};
