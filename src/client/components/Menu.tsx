import { useState } from "react";
import { useGameState } from "../GameStateContext"; // your context hook
import { PlayerModal } from "./Grid";

// Menu bar at top
export const TopMenu = () => {
  const { gameState,loading } = useGameState();
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);

  if (loading || !gameState) return <div>Loading timer...</div>;
  return (
    <div className="relative">
      {/* Top bar */}
      <div className="w-full bg-gray-800 text-white py-2 flex gap-4 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
        {gameState.players.map(player => (
          <button
            key={player.id}
            onClick={() => setSelectedPlayer(player)}
            className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 transition shrink-0"
          >
            hello{player.name}
          </button>
        ))}
      </div>

      {/* Player modal */}
      {selectedPlayer && (
        <PlayerModal
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
};
