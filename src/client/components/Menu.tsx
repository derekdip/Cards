import { useState } from "react";
import { useGameState } from "../GameStateContext"; // your context hook
import { PlayerModal } from "./Grid";

// Menu bar at top
export const TopMenu = ({setToggleMultiplayer}:{setToggleMultiplayer:React.Dispatch<React.SetStateAction<boolean | null>>}) => {
  const { gameState,loading } = useGameState();
  const [selectedPlayer, setSelectedPlayer] = useState<boolean | null>(null);

  if (loading || !gameState) return <div>Loading timer...</div>;
  return (
    <div className="relative">
      {/* Top bar */}
      <div 
      role="button"
        className="left-2 w-full bg-gray-700 cursor-pointer text-white py-2 flex gap-4 text-white overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
        onClick={() => setSelectedPlayer(true)}>
        
        Show Cards
      </div>

      {/* Player modal */}
      {selectedPlayer && (
        <PlayerModal
          players={gameState.players}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
      {gameState.players.map(p=>{return(
        <div key={p.id} className="top-2 left-2 px-3 py-1 text-white rounded text-sm">
          {p.name}: {p.handSize} cards
        </div>
      )})}
    </div>
  );
};
