/**
 * This module controls data flow and caching.
 * This provides a transparent layer in front of the API methods.
 */

import { Ship, getShipList as getShipListOp } from "./Api.js";

let singleShipList: ShipList;
export async function getShipList() {
  if (!singleShipList) {
    // Preload
    const shipArr = await getShipListOp();
    const shipMap: Record<string, Ship> = {};
    shipArr.forEach((ship) => {
      shipMap[ship.symbol] = ship;
    });
    singleShipList = new ShipList(shipMap, new Date());
  }
  return singleShipList;
}

class ShipList {
  ships: Record<string, Ship>;
  lastUpdated: Date;
  constructor(ships: Record<string, Ship>, lastUpdated: Date) {
    this.ships = ships;
    this.lastUpdated = lastUpdated;
  }
}
