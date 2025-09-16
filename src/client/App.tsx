//import { navigateTo } from '@devvit/web/client';
//import { useCounter } from './hooks/useCounter'

import { LastCard } from "./components/LastCard";
import { TopMenu } from "./components/Menu";
import { RuleHand } from "./components/RuleSpinner";
import { Timer } from "./components/timer";
import { GameStateProvider } from "./GameStateContext";

export const App = () => {
  return (
    <GameStateProvider>
  <div className="relative w-full h-screen bg-black flex flex-col">
    {/* Fixed top bar */}
    <TopMenu />

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

  );
};
