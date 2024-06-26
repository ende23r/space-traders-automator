/**
 * This module controls data flow and caching.
 * This provides a transparent layer in front of the API methods.
 */

import {
  Ship,
  getShipList,
  dock,
  undock,
  extract,
  fuel as refuel,
  jettisonCargo,
  TradeSymbol,
  navShip,
  sellCargo,
  transferCargo,
  getShip,
  queryShipList,
} from "./Api.js";

// How do we handle preloading in a nice way?
// We'd like our script to have access to all ships and waypoints in the system
// And we'd also like it to load data on systems over time
// Actually, do I even care about other systems?
// No.
// So, conclusion: I don't care about late-loading.
export type GameState = {
  /** Mapping from ship symbol to ship data */
  shipMap: Record<string, Ship>;
  /** TODO: Mapping from waypoint symbol to waypoint data */
  /** TODO: Market data? */
  /** TODO: Shipyard data? */
};
async function getInitialGameState(): Promise<GameState> {
  console.log("Preloading...");
  // Load all ships
  const shipMap: GameState["shipMap"] = {};
  const shipArr = await getShipList();
  shipArr.forEach((ship) => {
    shipMap[ship.symbol] = ship;
    if (ship.cooldown.remainingSeconds > 0) {
      setTimeout(
        () => reloadShip(ship.symbol),
        (ship.cooldown.remainingSeconds + 1) * 1000,
      );
    }
    const arrivalTimestamp = Date.parse(ship.nav.route.arrival);
    const currentTimestamp = Date.now();
    if (arrivalTimestamp > currentTimestamp) {
      setTimeout(
        () => reloadShip(ship.symbol),
        arrivalTimestamp - currentTimestamp,
      );
    }
  });
  // TODO: preload waypoints

  console.log("Preloading finished!");
  return { shipMap };
}

let globalGameState: GameState | undefined;
export async function getGameState(): Promise<GameState> {
  if (!globalGameState) {
    globalGameState = await getInitialGameState();
  }
  return globalGameState;
}

export async function* incrementalLoad() {
  const { shipMap } = await getGameState();
  let page = 0;
  let maxPages = 1;
  while (true) {
    if (page >= maxPages) {
      page = 0;
    }

    const response = await queryShipList(page);
    page += 1;
    if (!response.hasData) {
      yield;
      continue;
    }
    const data = response.unwrap();
    maxPages = Math.ceil(data.meta.total / data.meta.limit);
    data.data.forEach((ship) => {
      Object.assign(shipMap[ship.symbol], ship);
    });
    yield;
  }
}

export async function reloadShip(shipSymbol: string) {
  const { shipMap } = await getGameState();
  console.log(`Reloading ${shipSymbol}`);
  const result = await getShip(shipSymbol);
  if (!result) {
    setTimeout(() => reloadShip(shipSymbol), 1000);
    return;
  }

  if (!shipMap[shipSymbol]) {
    shipMap[shipSymbol] = result;
  }
  Object.assign(shipMap[shipSymbol], result);
}

export async function dockShip(shipSymbol: string) {
  const { shipMap } = await getGameState();
  if (!shipMap.hasOwnProperty(shipSymbol)) {
    throw new Error(`You do not own a ship with the symbol ${shipSymbol}`);
  }

  const resultState = await dock(shipSymbol);
  Object.assign(shipMap[shipSymbol], resultState);
}

export async function undockShip(shipSymbol: string) {
  const { shipMap } = await getGameState();
  if (!shipMap.hasOwnProperty(shipSymbol)) {
    throw new Error(`You do not own a ship with the symbol ${shipSymbol}`);
  }

  const resultState = await undock(shipSymbol);
  Object.assign(shipMap[shipSymbol], resultState);
}

export async function shipExtract(shipSymbol: string) {
  const { shipMap } = await getGameState();
  if (!shipMap.hasOwnProperty(shipSymbol)) {
    throw new Error(`You do not own a ship with the symbol ${shipSymbol}`);
  }

  const { cooldown, extraction, cargo, events } = await extract(shipSymbol);
  console.log({ extraction });
  if (events.length > 0) {
    console.log({ events });
  }
  Object.assign(shipMap[shipSymbol], { cooldown, cargo });
  setTimeout(() => reloadShip(shipSymbol), cooldown.totalSeconds * 1000);
}

export async function fuelShip(shipSymbol: string) {
  const { shipMap } = await getGameState();
  if (!shipMap.hasOwnProperty(shipSymbol)) {
    throw new Error(`You do not own a ship with the symbol ${shipSymbol}`);
  }

  const { fuel, /*agent,*/ transaction } = await refuel(shipSymbol);
  console.log({ transaction });
  Object.assign(shipMap[shipSymbol], { fuel });
}

export async function jettisonShipCargo(
  shipSymbol: string,
  tradeSymbol: TradeSymbol,
  quantity: number,
) {
  const { shipMap } = await getGameState();
  if (!shipMap.hasOwnProperty(shipSymbol)) {
    throw new Error(`You do not own a ship with the symbol ${shipSymbol}`);
  }

  const { cargo } = await jettisonCargo(shipSymbol, tradeSymbol, quantity);
  console.log({ cargo });
  Object.assign(shipMap[shipSymbol], { cargo });
}

export async function navigateShip(
  shipSymbol: string,
  destinationSymbol: string,
) {
  const { shipMap } = await getGameState();
  if (!shipMap.hasOwnProperty(shipSymbol)) {
    throw new Error(`You do not own a ship with the symbol ${shipSymbol}`);
  }

  const { fuel, nav, events } = await navShip(shipSymbol, destinationSymbol);
  if (events.length > 0) {
    console.log({ events });
  }
  Object.assign(shipMap[shipSymbol], { fuel, nav });
  const arrivalDelay = Date.parse(nav.route.arrival) - Date.now();
  console.log(`Arriving in ${arrivalDelay}`);
  setTimeout(() => reloadShip(shipSymbol), arrivalDelay);
}

export async function sellShipCargo(
  shipSymbol: string,
  tradeSymbol: TradeSymbol,
  quantity: number,
) {
  const { shipMap } = await getGameState();
  if (!shipMap.hasOwnProperty(shipSymbol)) {
    throw new Error(`You do not own a ship with the symbol ${shipSymbol}`);
  }

  const { /*agent, */ cargo, transaction } = await sellCargo(
    shipSymbol,
    tradeSymbol,
    quantity,
  );
  console.log({ transaction });
  Object.assign(shipMap[shipSymbol], { cargo });
}

export async function transferShipCargo({
  fromShipSymbol,
  toShipSymbol,
  tradeSymbol,
  quantity,
}: {
  fromShipSymbol: string;
  toShipSymbol: string;
  tradeSymbol: TradeSymbol;
  quantity: number;
}) {
  const { shipMap } = await getGameState();
  if (!shipMap.hasOwnProperty(fromShipSymbol)) {
    throw new Error(`You do not own a ship with the symbol ${fromShipSymbol}`);
  }
  if (!shipMap.hasOwnProperty(toShipSymbol)) {
    throw new Error(`You do not own a ship with the symbol ${toShipSymbol}`);
  }

  const { cargo } = await transferCargo({
    from: fromShipSymbol,
    to: toShipSymbol,
    tradeSymbol,
    units: quantity,
  });
  Object.assign(shipMap[fromShipSymbol], { cargo });
  const toShipCargo = shipMap[toShipSymbol].cargo;
  const indexToUpdate = toShipCargo.inventory.findIndex(
    (item) => item.symbol === tradeSymbol,
  );
  let itemToUpdate = {
    symbol: tradeSymbol,
    units: 0,
    name: "TBD",
    description: "TBD",
  };
  if (indexToUpdate > -1) {
    itemToUpdate = toShipCargo.inventory[indexToUpdate];
    toShipCargo.inventory.splice(indexToUpdate, 1);
  }

  itemToUpdate.units += quantity;
  toShipCargo.inventory.push(itemToUpdate);
  toShipCargo.units += quantity;
}
