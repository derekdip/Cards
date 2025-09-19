import { useState } from "react";
import { useGameState } from "../GameStateContext"; // your context hook
import { PlayerModal } from "./Grid";
import { Timer } from "./timer";

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
        <div className="flex items-center justify-between ml-2 w-full">
          <span className="text-white font-medium">Show Cards</span>
          <span className="text-white font-medium">Round: {gameState.moves}</span>
          <Timer />
        </div>
        
      </div>

      {/* Player modal */}
      {selectedPlayer && (
        <PlayerModal
          players={gameState.players}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
      {gameState.players.map(p => (
  <div key={p.id} className="relative flex items-center mb-2">
    {gameState.currentPlayer === p.id && (
      <span className="text-green-500 mr-2 text-xl">➡️</span>
    )}
    <div className="px-3 py-1 text-white rounded bg-gray-800 text-sm">
      {p.id}: {p.handSize} cards
    </div>
  </div>
))}

    </div>
  );
};
