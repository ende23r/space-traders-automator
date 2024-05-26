import { Ship } from "./Api.js";
import {
  getGameState,
  dockShip,
  undockShip,
  navigateShip,
  shipExtract,
  fuelShip,
  sellShipCargo,
  transferShipCargo,
  jettisonShipCargo,
} from "./Controller.js";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const haulerSymbol = "CINNAMON_SWIRL-4";
const minerSymbol = "CINNAMON_SWIRL-3";

const allowedGoods = ["IRON_ORE", "ALUMINUM_ORE", "COPPER_ORE"];
const miningOutpost = "X1-RV45-EC5X";
const marketPlace = "X1-RV45-H63";

interface Pilot {
  // TODO: get type for priorities/actions
  getPriorities(): any[];
}
const pilots: Pilot[] = [];
const registerPilot = (pilot: Pilot) => pilots.push(pilot);

class DumbMiner implements Pilot {
  ship: Ship | null;
  loaded: boolean;
  constructor(shipSymbol: string) {
    this.ship = null;
    this.loaded = false;
    this.loadShipData(shipSymbol);
  }

  async loadShipData(shipSymbol: string) {
    const gameState = await getGameState();
    this.ship = gameState.shipMap[shipSymbol];
    this.loaded = true;
  }

  getPriorities() {
    if (!this.loaded) {
      return [];
    }
    return [];
  }
}
registerPilot(new DumbMiner(minerSymbol));

const gameState = await getGameState();

// Very basic AI
// P1: hauler fuel X
// P2: hauler nav X
// P3: filter from miner X
// P4: transfer to hauler X
// P5: mine X
// P6: hauler sell
async function doTopPriority() {
  const hauler = gameState.shipMap[haulerSymbol];
  const miner = gameState.shipMap[minerSymbol];

  const haulerResting = hauler?.nav.status !== "IN_TRANSIT";
  const readyToHaul =
    haulerResting &&
    hauler?.cargo.units === 0 &&
    hauler?.nav.waypointSymbol !== miningOutpost;
  const readyToSell =
    haulerResting &&
    (hauler?.cargo.units || 0) >= 38 &&
    hauler?.nav.waypointSymbol !== marketPlace;
  // @ts-ignore
  const cargoToSell = hauler?.cargo.inventory.find((cargo) =>
    allowedGoods.includes(cargo.symbol),
  );

  // @ts-ignore
  const cargoToTransfer = miner?.cargo.inventory.find((cargo) =>
    allowedGoods.includes(cargo.symbol),
  );
  const cargoToJettison = miner?.cargo.inventory.find(
    // @ts-ignore
    (cargo) => !allowedGoods.includes(cargo.symbol),
  );

  if (hauler && hauler.nav.status === "DOCKED" && hauler.fuel.current < 100) {
    await fuelShip(haulerSymbol);
  } else if (readyToHaul) {
    await undockShip(haulerSymbol);
    // nav to haul spot
    await navigateShip(haulerSymbol, miningOutpost);
  } else if (readyToSell) {
    // await undock
    undockShip(haulerSymbol);
    // nav to haul spot
    await navigateShip(haulerSymbol, marketPlace);
  } else if (
    hauler &&
    hauler.nav.waypointSymbol === miningOutpost &&
    haulerResting &&
    cargoToTransfer
  ) {
    await transferShipCargo({
      fromShipSymbol: minerSymbol,
      toShipSymbol: haulerSymbol,
      tradeSymbol: cargoToTransfer.symbol,
      quantity: cargoToTransfer.units,
    });
  } else if (cargoToJettison) {
    await jettisonShipCargo(
      minerSymbol,
      cargoToJettison.symbol,
      cargoToJettison.units,
    );
  } else if (
    miner &&
    miner.cargo.units < miner.cargo.capacity &&
    miner.cooldown.remainingSeconds === 0
  ) {
    await shipExtract(minerSymbol);
  } else if (
    cargoToSell &&
    haulerResting &&
    hauler?.nav.waypointSymbol === marketPlace
  ) {
    await dockShip(haulerSymbol);
    await sellShipCargo(haulerSymbol, cargoToSell.symbol, cargoToSell.units);
  } else {
    // console.log("Could not pick a priority!");
  }
}

// May want to bump up to 500 later if we want to push the performance
const MS_PER_FRAME = 700;
async function main() {
  // const gameState = getGameState();
  while (true) {
    // await dockShip("CINNAMON_SWIRL-3");
    // console.log((await gameState).shipMap["CINNAMON_SWIRL-3"].nav)
    await doTopPriority();
    await sleep(MS_PER_FRAME);
    // TODO: refresh ship list
    // await sleep(MS_PER_FRAME);
  }
}

main();
