//import { navigateTo } from '@devvit/web/client';
//import { useCounter } from './hooks/useCounter'

import { useState } from "react";
import { LastCard } from "./components/LastCard";
import { TopMenu } from "./components/Menu";
import { RuleHand } from "./components/RuleSpinner";
import { Timer } from "./components/timer";
import { GameStateProvider, GameStateProviderLocal } from "./GameStateContext";


export const App = () => {
  const [toggleMultiplayer, setToggleMultiplayer] = useState<boolean | null>(null);

  if (toggleMultiplayer === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white px-6 text-center">
        <h1 className="text-4xl font-bold mb-4">🎴 Crooked Dealer</h1>
        <p className="text-lg mb-10 opacity-80">Choose your game mode</p>
        
        <div className="flex gap-6 mb-12">
          <button
            onClick={() => setToggleMultiplayer(true)}
            className="px-6 py-3 bg-indigo-600 rounded-xl text-lg font-semibold hover:bg-indigo-500 transition transform hover:scale-105 shadow-lg"
          >
            🌍 Community Game
          </button>
          <button
            onClick={() => setToggleMultiplayer(false)}
            className="px-6 py-3 bg-green-600 rounded-xl text-lg font-semibold hover:bg-green-500 transition transform hover:scale-105 shadow-lg"
          >
            🎮 Solo
          </button>
        </div>

        {/* Instructions */}
        <div className="max-w-xl text-sm text-gray-300 space-y-3 opacity-90">
          <p>
            In <span className="font-semibold text-indigo-400">Community Game</span>, 
            everyone plays together with hourly votes deciding the dealer’s moves.
          </p>
          <p>
            In <span className="font-semibold text-green-400">Solo Mode</span>, 
            you control the dealer and try to keep your chosen player alive.
          </p>
          <p>
            The dealer is crooked. Rules may help or hurt — pick wisely, and see if luck is on your side.
          </p>
        </div>
      </div>
    );
  }

  if (toggleMultiplayer === false) {
    return <SoloGame setToggleMultiplayer={setToggleMultiplayer} />;
  }

  return <CommunityGame setToggleMultiplayer={setToggleMultiplayer} />;
};


const SoloGame = ({setToggleMultiplayer}:{setToggleMultiplayer:React.Dispatch<React.SetStateAction<boolean | null>>}) => {
  return (
    <GameStateProviderLocal>
    <div className="relative w-full h-screen bg-black flex flex-col">
      {/* Fixed top bar */}
      <button
            onClick={() => setToggleMultiplayer(null)}
            className="cursor-pointer top-2 right-2 px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 transition shrink-0"
          >Main Menu</button>
      <TopMenu setToggleMultiplayer={setToggleMultiplayer} />

      {/* Game table fills remaining space */}
      <div className="flex-1 flex justify-center items-center overflow-hidden">
        <div className="relative w-[90%] h-[80%] bg-green-800 rounded-full shadow-2xl border-8 border-yellow-900 flex flex-col items-center">
          
          {/* Centered Last Card */}
          <div className="flex justify-center items-center flex-1">
            <LastCard />
          </div>

          {/* Dealer / Rule Hand pushed down */}
          <div className="flex justify-center items-center mt-6 mb-8">
            <RuleHand />
          </div>
        </div>
      </div>
    </div>
    </GameStateProviderLocal>
  )
}

const CommunityGame = ({setToggleMultiplayer}:{setToggleMultiplayer:React.Dispatch<React.SetStateAction<boolean | null>>}) => {
  return (
    <GameStateProvider>
    <div className="relative w-full h-screen bg-black flex flex-col">
    <button
            onClick={() => setToggleMultiplayer(null)}
            className="top-2 right-2 px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 transition shrink-0"
          >Main Menu</button>
      {/* Fixed top bar */}
      <TopMenu setToggleMultiplayer={setToggleMultiplayer} />
      {/* Timer just under menu */}
      <div className="py-2">
        <Timer />
      </div>

      {/* Game table fills remaining space */}
      <div className="flex-1 flex justify-center items-center overflow-hidden">
        <div className="relative w-[90%] h-[80%] bg-green-800 rounded-full shadow-2xl border-8 border-yellow-900 flex flex-col items-center">
          
          {/* Centered Last Card */}
          <div className="flex justify-center items-center flex-1">
            <LastCard />
          </div>

          {/* Dealer / Rule Hand pushed down */}
          <div className="flex justify-center items-center mt-6 mb-8">
            <RuleHand />
          </div>
        </div>
      </div>
    </div>
    </GameStateProvider>
  )
}