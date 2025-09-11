import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { GameStateType } from "../shared/types/api";

interface GameStateContextType {
  gameState: GameStateType | null;
  loading: boolean;
  refreshGameState: () => Promise<void>;
}

const GameStateContext = createContext<GameStateContextType>({
  gameState: null,
  loading: true,
  refreshGameState: async () => {},
});

export const useGameState = () => useContext(GameStateContext);

export const GameStateProvider = ({ children }: { children: ReactNode }) => {
  const [gameState, setGameState] = useState<GameStateType | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchGameState = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/init");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: GameStateType = await res.json();
      console.log(data);
      setGameState(data);
    } catch (err) {
      console.error(err);
      setGameState(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGameState();
  }, []);

  // Automatically refresh when voting ends
  useEffect(() => {
    if (!gameState?.endVotingTime) return;
  
    const now = Date.now();
    const diff = gameState.endVotingTime - now;
  
    if (diff <= 0) {
      // Voting already ended, fetch immediately
      fetchGameState();
      return;
    }
  
    const timer = setTimeout(() => {
      fetchGameState();
    }, diff + 2000); // delay ensures smooth transition
  
    return () => clearTimeout(timer);
  }, [gameState?.endVotingTime]);
  

  return (
    <GameStateContext.Provider
      value={{ gameState, loading, refreshGameState: fetchGameState }}
    >
      {children}
    </GameStateContext.Provider>
  );
};
