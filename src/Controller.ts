/**
 * This module controls data flow and caching.
 * This provides a transparent layer in front of the API methods.
 */

import { Ship, getShipList, dock, undock } from "./Api.js";

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
