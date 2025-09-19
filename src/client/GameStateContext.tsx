import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { GameStateType } from "../shared/types/api";
import { GameEngine }from "./logic/stateMachine"

interface GameStateContextType {
  gameState: GameStateType | undefined;
  loading: boolean;
  refreshGameState: () => Promise<void>;
  setPlayerChoice: (i:number)=>Promise<void>;
}

const GameStateContext = createContext<GameStateContextType>({
  gameState: undefined,
  loading: true,
  refreshGameState: async () => {},
  setPlayerChoice: async (i:number)=>{},
});

export const useGameState = () => useContext(GameStateContext);

export const GameStateProvider = ({ children }: { children: ReactNode }) => {
  const [gameState, setGameState] = useState<GameStateType | undefined>(undefined);
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
      setGameState(undefined);
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
    }, diff + 5000); // delay ensures smooth transition
  
    return () => clearTimeout(timer);
  }, [gameState?.endVotingTime]);
  

  return (
    <GameStateContext.Provider
      value={{ gameState, loading, refreshGameState: fetchGameState, setPlayerChoice: async (i:number)=>{} }}
    >
      {children}
    </GameStateContext.Provider>
  );
};



export const GameStateProviderLocal = ({ children }: { children: ReactNode }) => {
  
  const [gameState, setGameState] = useState<GameStateType|undefined>();
  const [loading, setLoading] = useState(false);

  const refreshGameState = async () => {
    setLoading(true);
    try {
      
    } finally {
      setLoading(false);
    }
  };
  const setPlayerChoice = async (choice:number) => {
    console.log("Player chose: "+choice)
    setLoading(true);
    async function executeChoice(){
      console.log("Executing choice: "+choice)
      await GameEngine.executeTurn(choice,gameState?.currentPlayer??"")
      const state = await GameEngine.getGameState()
      setGameState(state)
      setLoading(false);
    }
    await executeChoice()
  }
  useEffect(() => {
    async function init() {
      await GameEngine.initializeGame()
      const state = await GameEngine.getGameState()
      setGameState(state)
      setLoading(false)
    }
    init()
  }
  ,[])

  return (
    <GameStateContext.Provider value={{ gameState, loading, refreshGameState,setPlayerChoice }}>
      {children}
    </GameStateContext.Provider>
  );
};