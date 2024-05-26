/**
 * A Pilot is a basic ship controller.
 *
 * The Pilot controls the ship by setting priorities based on the ship's state. The main script picks among these priorities to execute.
 * Common priorities
 * # Ship necessities
 * 50 - Refuel
 * # Things with cooldowns
 * 49 - Navigate
 * 40 - Mine
 * # Things that can block
 * 39 - Transfer from miner
 * 38 - Filter from miner
 * 35 - Sell from hauler
 */

import { Ship } from "./Api.js";
import {
  getGameState,
  jettisonShipCargo,
  navigateShip,
  shipExtract,
  undockShip,
} from "./Controller.js";
import { partition } from "./Util.js";

export type PilotAction = {
  priority: number;
  callback: () => Promise<void>;
};
export interface Pilot {
  getPriorities(): PilotAction[];
}

const allowedGoods = ["IRON_ORE", "ALUMINUM_ORE", "COPPER_ORE"];
const miningOutpost = "X1-RV45-EC5X";

export class DumbMiner implements Pilot {
  ship: Ship | null;
  constructor(shipSymbol: string) {
    this.ship = null;
    this.loadShipData(shipSymbol);
  }

  async loadShipData(shipSymbol: string) {
    const gameState = await getGameState();
    this.ship = gameState.shipMap[shipSymbol];
  }

  getPriorities() {
    if (!this.ship) {
      return [];
    }
    const shipSymbol = this.ship.symbol;

    // const atRest = ["DOCKED", "IN_ORBIT"].includes(this.ship.nav.status);
    if (this.ship.nav.status === "IN_TRANSIT") {
      // Can't do anything in flight
      return [];
    }

    if (this.ship.nav.waypointSymbol !== miningOutpost) {
      return [
        {
          priority: 49,
          callback: async () => {
            await undockShip(shipSymbol);
            await navigateShip(shipSymbol, miningOutpost);
          },
        },
      ];
    }

    if (this.ship.cooldown.remainingSeconds === 0) {
      return [
        {
          priority: 40,
          callback: async () => {
            await shipExtract(shipSymbol);
          },
        },
      ];
    }
    /*
     * # Things that can block
     * 39 - Transfer from miner
     * 38 - Filter from miner
     */

    const nonCooldownActions: PilotAction[] = [];
    const [_cargoToTransfer, cargoToFilter] = partition(
      this.ship.cargo.inventory,
      (good) => allowedGoods.includes(good.symbol),
    );
    /*
    if (cargoToTransfer) {
      nonCooldownActions.push({
        priority: 39,
        callback: async () => {
          
        }
      })
    }
    */
    if (cargoToFilter) {
      cargoToFilter.forEach((cargo) =>
        nonCooldownActions.push({
          priority: 38,
          callback: async () =>
            jettisonShipCargo(shipSymbol, cargo.symbol, cargo.units),
        }),
      );
    }
    return nonCooldownActions;
  }
}
