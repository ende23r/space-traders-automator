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
} from "./Api.js";

let gameState: GameState;
export async function getGameState() {
  if (!gameState) {
    gameState = new GameState();
    await gameState.preload();
  }
  return gameState;
}

class GameState {
  /** Mapping from ship symbol to ship data */
  shipMap: Record<string, Ship> = {};
  async preload() {
    // Preload ship list
    const shipArr = await getShipList();
    shipArr.forEach((ship) => {
      this.shipMap[ship.symbol] = ship;
    });
    // TODO: preload waypoints
  }
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
