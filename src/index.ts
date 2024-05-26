import {
  extract,
  fuelShip,
  jettisonCargo,
  navShip,
  sellCargo,
  transferCargo,
} from "./Api.js";
import {
  getGameState,
  dockShip,
  undockShip,
  shipExtract,
} from "./Controller.js";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const haulerSymbol = "CINNAMON_SWIRL-4";
const minerSymbol = "CINNAMON_SWIRL-3";

const allowedGoods = ["IRON_ORE", "ALUMINUM_ORE", "COPPER_ORE"];
const miningOutpost = "X1-RV45-EC5X";
const marketPlace = "X1-RV45-H63";
const gameState = await getGameState();
// Very basic AI
// P1: hauler gas X
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
    const result = await fuelShip(haulerSymbol);
    console.log(result);
  } else if (readyToHaul) {
    await undockShip(haulerSymbol);
    // nav to haul spot
    const result2 = await navShip(haulerSymbol, miningOutpost);
    console.log(result2);
  } else if (readyToSell) {
    // await undock
    undockShip(haulerSymbol);
    // nav to haul spot
    const result2 = await navShip(haulerSymbol, marketPlace);
    console.log(result2);
  } else if (
    hauler &&
    hauler.nav.waypointSymbol === miningOutpost &&
    haulerResting &&
    cargoToTransfer
  ) {
    const result = await transferCargo({
      from: minerSymbol,
      to: haulerSymbol,
      tradeSymbol: cargoToTransfer.symbol,
      units: cargoToTransfer.units,
    });
    console.log(result);
  } else if (cargoToJettison) {
    const result = await jettisonCargo(
      minerSymbol,
      cargoToJettison.symbol,
      cargoToJettison.units,
    );
    console.log(result);
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
    const result2 = await sellCargo(
      haulerSymbol,
      cargoToSell.symbol,
      cargoToSell.units,
    );
    console.log(result2);
  } else {
    console.log("Could not pick a priority!");
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
