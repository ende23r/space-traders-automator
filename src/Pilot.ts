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

import { Ship, TradeSymbol } from "./Api.js";
import {
  GameState,
  dockShip,
  fuelShip,
  jettisonShipCargo,
  navigateShip,
  sellShipCargo,
  shipExtract,
  transferShipCargo,
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

const minerMounts = [
  "MOUNT_MINING_LASER_I",
  "MOUNT_MINING_LASER_II",
  "MOUNT_MINING_LASER_III",
];

export class DumbMiner implements Pilot {
  ship: Ship;
  miningWaypoint: string;
  allowedGoods: string[];
  constructor(
    gameState: GameState,
    shipSymbol: string,
    miningWaypoint: string,
    allowedGoods: string[],
  ) {
    this.ship = gameState.shipMap[shipSymbol];
    this.miningWaypoint = miningWaypoint;
    this.allowedGoods = allowedGoods;
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

    if (this.ship.nav.waypointSymbol !== this.miningWaypoint) {
      return [
        {
          priority: 49,
          callback: async () => {
            await undockShip(shipSymbol);
            await navigateShip(shipSymbol, this.miningWaypoint);
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
      (good) => this.allowedGoods.includes(good.symbol),
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

export class OneRouteHauler implements Pilot {
  gameState: GameState;
  ship: Ship;
  readonly sourceWaypoint: string;
  readonly destWaypoint: string;
  readonly sellableGoods: TradeSymbol[];
  readonly fuelThreshold: number;
  constructor(
    gameState: GameState,
    shipSymbol: string,
    buyWaypoint: string,
    sellWaypoint: string,
    sellableGoods: TradeSymbol[],
    fuelThreshold: number,
  ) {
    this.gameState = gameState;
    this.ship = this.gameState.shipMap[shipSymbol];
    this.sourceWaypoint = buyWaypoint;
    this.destWaypoint = sellWaypoint;
    this.sellableGoods = sellableGoods;
    this.fuelThreshold = fuelThreshold;
  }

  /*
   * # Ship necessities
   * 50 - Refuel
   * # Things with cooldowns
   * 49 - Navigate
   * # Things that can block
   * 39 - Transfer from miner
   * 35 - Sell from hauler
   */
  getPriorities() {
    if (!this.ship) {
      return [];
    }

    const shipSymbol = this.ship.symbol;
    // Can't do anything while in flight
    if (this.ship.nav.status === "IN_TRANSIT") {
      return [];
    }

    // # Ship necessities
    // 50 - Refuel
    if (this.ship.fuel.current < this.fuelThreshold) {
      return [
        {
          priority: 50,
          callback: async () => {
            await dockShip(shipSymbol);
            await fuelShip(shipSymbol);
          },
        },
      ];
    }

    // * # Things with cooldowns
    // * 49 - Navigate
    // Hysteresis up to 37 units, because a miner can pick up up to 3 units at a time
    if (
      this.ship.cargo.units > 37 &&
      this.ship.nav.waypointSymbol !== this.destWaypoint
    ) {
      return [
        {
          priority: 49,
          callback: async () => {
            await undockShip(shipSymbol);
            await navigateShip(shipSymbol, this.destWaypoint);
          },
        },
      ];
    }
    if (
      this.ship.cargo.units === 0 &&
      this.ship.nav.waypointSymbol !== this.sourceWaypoint
    ) {
      return [
        {
          priority: 49,
          callback: async () => {
            await undockShip(shipSymbol);
            await navigateShip(shipSymbol, this.sourceWaypoint);
          },
        },
      ];
    }

    const nonCooldownActions: PilotAction[] = [];
    // # Things that can block
    // 39 - Transfer from miner
    if (
      this.gameState &&
      this.ship.nav.waypointSymbol === this.sourceWaypoint
    ) {
      const gameState = this.gameState;
      const nearbyMiners = Object.entries(gameState.shipMap)
        .map(([_symbol, ship]) => ship)
        .filter(
          (ship) =>
            ship.nav.waypointSymbol === this.sourceWaypoint &&
            ship.mounts.some((shipMount) =>
              minerMounts.includes(shipMount.symbol),
            ),
        );
      // console.log({ nearbyMiners })

      nearbyMiners.forEach((miner) => {
        miner.cargo.inventory
          .filter((good) => this.sellableGoods.includes(good.symbol))
          .forEach((good) => {
            console.log(
              `Can get ${good.units} ${good.symbol} from ${miner.symbol}`,
            );
            nonCooldownActions.push({
              priority: 39,
              callback: async () => {
                await undockShip(shipSymbol);
                await transferShipCargo({
                  fromShipSymbol: miner.symbol,
                  toShipSymbol: shipSymbol,
                  tradeSymbol: good.symbol,
                  quantity: good.units,
                });
              },
            });
          });
      });
    }

    // 35 - Sell from hauler
    if (this.ship.nav.waypointSymbol === this.destWaypoint) {
      this.ship.cargo.inventory.forEach((good) => {
        nonCooldownActions.push({
          priority: 35,
          callback: async () => {
            await dockShip(shipSymbol);
            await sellShipCargo(shipSymbol, good.symbol, good.units);
          },
        });
      });
    }
    return nonCooldownActions;
  }
}
