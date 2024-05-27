import { Pilot, DumbMiner, OneRouteHauler } from "./Pilot.js";
import { getGameState, incrementalLoad } from "./Controller.js";
import type { TradeSymbol } from "./Api.js";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const haulerSymbol = "CINNAMON_SWIRL-4";
const minerSymbols = [
  "CINNAMON_SWIRL-3",
  "CINNAMON_SWIRL-5",
  "CINNAMON_SWIRL-6",
  "CINNAMON_SWIRL-7",
  "CINNAMON_SWIRL-8",
];

const allowedGoods: TradeSymbol[] = ["IRON_ORE", "ALUMINUM_ORE", "COPPER_ORE"];
const miningOutpost = "X1-RV45-EC5X";
const marketPlace = "X1-RV45-H63";

const gameState = await getGameState();

const registeredPilots: Pilot[] = [];
const registerPilot = (pilot: Pilot) => registeredPilots.push(pilot);

minerSymbols.forEach((minerSymbol) =>
  registerPilot(new DumbMiner(gameState, minerSymbol)),
);
registerPilot(
  new OneRouteHauler(
    gameState,
    haulerSymbol,
    miningOutpost,
    marketPlace,
    allowedGoods,
  ),
);

function getSystemPriority() {
  return {
    priority: -1,
    callback: async () => {
      incrementalLoad();
    },
  };
}

async function doPilotPriority() {
  const allPriorities = await Promise.all(
    registeredPilots.flatMap((pilot) => pilot.getPriorities()),
  );
  const topPriority = allPriorities.reduce((bestSoFar, currentAction) => {
    if (bestSoFar.priority < currentAction.priority) {
      return currentAction;
    }
    return bestSoFar;
  }, getSystemPriority());
  await topPriority.callback();
}

// May want to bump up to 500 later if we want to push the performance
const MS_PER_FRAME = 700;
async function main() {
  // const gameState = getGameState();
  while (true) {
    // await dockShip("CINNAMON_SWIRL-3");
    // console.log((await gameState).shipMap["CINNAMON_SWIRL-3"].nav)
    // await doTopPriority();
    await doPilotPriority();
    await sleep(MS_PER_FRAME);
    // TODO: refresh ship list
    // await sleep(MS_PER_FRAME);
  }
}

main();
