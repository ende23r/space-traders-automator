import { Pilot, DumbMiner, OneRouteHauler } from "./Pilot.js";
import { getGameState, incrementalLoad } from "./Controller.js";
import type { TradeSymbol } from "./Api.js";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const haulerSymbol = "CINNAMON_SWIRL-4";
const group1Miners = [
  "CINNAMON_SWIRL-3",
  "CINNAMON_SWIRL-5",
  "CINNAMON_SWIRL-6",
  "CINNAMON_SWIRL-7",
  "CINNAMON_SWIRL-8",
];

// Group 2 (hauler is -B)
const group2Miners = [
  "CINNAMON_SWIRL-9",
  "CINNAMON_SWIRL-A",
  "CINNAMON_SWIRL-C",
  "CINNAMON_SWIRL-D",
  "CINNAMON_SWIRL-E",
];

const allowedGoods: TradeSymbol[] = ["IRON_ORE", "ALUMINUM_ORE", "COPPER_ORE"];
const miningOutpost = "X1-RV45-EC5X";
const marketPlace = "X1-RV45-H63";

const gameState = await getGameState();

// TODO: make it so that only 1 pilot can control each ship
const registeredPilots: Pilot[] = [];
const registerPilot = (pilot: Pilot) => registeredPilots.push(pilot);

group1Miners.forEach((minerSymbol) =>
  registerPilot(
    new DumbMiner(gameState, minerSymbol, miningOutpost, allowedGoods),
  ),
);
group2Miners.forEach((minerSymbol) =>
  registerPilot(
    new DumbMiner(gameState, minerSymbol, "X1-RV45-B14", allowedGoods),
  ),
);
// Group 1 hauler
registerPilot(
  new OneRouteHauler(
    gameState,
    haulerSymbol,
    miningOutpost,
    marketPlace,
    allowedGoods,
    24,
  ),
);
// Group 2 hauler
registerPilot(
  new OneRouteHauler(
    gameState,
    "CINNAMON_SWIRL-B",
    "X1-RV45-B14",
    marketPlace,
    allowedGoods,
    290,
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
    await doPilotPriority();
    await sleep(MS_PER_FRAME);
    // TODO: refresh ship list
    // await sleep(MS_PER_FRAME);
  }
}

main();
