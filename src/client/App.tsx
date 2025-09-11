//import { navigateTo } from '@devvit/web/client';
//import { useCounter } from './hooks/useCounter';

import { GameStateType } from "../shared/types/api";
import { TopMenu } from "./components/Menu";
import { RuleHand } from "./components/RuleSpinner";
import { Timer } from "./components/timer";
import { GameStateProvider } from "./GameStateContext";

export const App = () => {
  const rules = [
    "Draw 2 extra cards",
    "Skip your next turn",
    "Swap hands with another player",
    "Play twice in a row",
    "Discard half your hand",
  ];
  //const { count, username, loading, increment, decrement } = useCounter();
  return (
    <GameStateProvider>
      <div className="flex relative flex-col justify-center items-center min-h-screen gap-4">
        <TopMenu />
        <Timer />
        <div>this is new</div>
        <RuleHand/>
        <button onClick={async()=>{
            try {
                    const res = await fetch('/api/init');
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const data: GameStateType = await res.json();
                    console.log(data)
            } catch (err) {
                    console.error('Failed to init counter', err);
            }
          }}>hello</button>
      </div>
    </GameStateProvider>
  );
};
