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

type VotingStatus = "not started"|"initial vote"|"already voted";
export const GameStateProvider = ({ children }: { children: ReactNode }) => {
  const [gameState, setGameState] = useState<GameStateType | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [votingStatus,setVotingStatus] = useState<VotingStatus>("not started")
  const [modalClosed,setModalClosed] = useState(false)
  const [gameOverStatus,setGameOverStatus] = useState(false)

  const fetchGameState = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/init");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: GameStateType = await res.json();
      console.log(data);
      setGameState(data);
      if(data.gameOver){
        setGameOverStatus(true)
      }
    } catch (err) {
      console.error(err);
      setGameState(undefined);
    } finally {
      setVotingStatus("not started")
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
  const setPlayerChoice = async (choice:number) => {
    console.log("Player chose: "+choice)
    async function executeChoice(){
      let resp = await fetch("/api/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ option:choice }),
      });
      console.log("Vote response: "+resp.status)
      if(resp.status ==200){
        setVotingStatus("initial vote")
        setModalClosed(false)
      }
      if(resp.status ==401){
        setVotingStatus("already voted")
        setModalClosed(false)
      }
    }
    await executeChoice()
  }

  return (
    <GameStateContext.Provider
      value={{ gameState, loading, refreshGameState: fetchGameState, setPlayerChoice }}
    >
      {gameOverStatus&&<GameOverModal gameOverStatus={gameOverStatus} onClose={()=>{setGameOverStatus(false)}}></GameOverModal>}
      {!modalClosed&&<VotingModal votingStatus={votingStatus} onClose={()=>{setModalClosed(true)}}></VotingModal>}
      {children}
    </GameStateContext.Provider>
  );
};

export const VotingModal = ({
  votingStatus,
  onClose,
}: {
  votingStatus: VotingStatus;
  onClose: () => void;
}) => {
  if (votingStatus=="not started") return null;

  const message =
    votingStatus === "initial vote"
      ? "🎉 Thanks for voting!"
      : "⚠️ You have already voted this round.";

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
      onClick={onClose} // clicking outside closes
    >
      <div
        className="bg-white p-6 rounded shadow-lg w-80 text-center"
        onClick={(e) => e.stopPropagation()} // prevent modal click closing
      >
        <p className="mb-4">{message}</p>
        <button
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
};
export const GameOverModal = ({
  gameOverStatus,
  onClose,
}: {
  gameOverStatus: boolean;
  onClose: () => void;
}) => {
  if (!gameOverStatus) return null;


  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
      onClick={onClose} // clicking outside closes
    >
      <div
        className="bg-white p-6 rounded shadow-lg w-80 text-center"
        onClick={(e) => e.stopPropagation()} // prevent modal click closing
      >
        <p className="mb-4">GAME OVER</p>
        <button
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          onClick={onClose}
        >
          Play Again
        </button>
      </div>
    </div>
  );
};



export const GameStateProviderLocal = ({ children }: { children: ReactNode }) => {
  
  const [gameState, setGameState] = useState<GameStateType|undefined>();
  const [loading, setLoading] = useState(false);
  const [gameOverStatus,setGameOverStatus] = useState(false)
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
      if(state.gameOver){
        setGameOverStatus(true)
      }
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
  ,[gameOverStatus])

  return (
    <GameStateContext.Provider value={{ gameState, loading, refreshGameState,setPlayerChoice }}>
      {gameOverStatus&&<GameOverModal gameOverStatus={gameOverStatus} onClose={()=>{setGameOverStatus(false)}}></GameOverModal>}
      {children}
    </GameStateContext.Provider>
  );
};