import { bearerToken } from "./token.js";
import { api, schemas } from "./SpaceTradersAPI.js";
import { z } from "zod";

export type TradeSymbol = z.infer<typeof schemas.TradeSymbol>;

const bearerOptions = (token: string = bearerToken) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
const bearerHeaders = (token = bearerToken) => ({
  Authorization: `Bearer ${token}`,
});

const bearerPostOptions = (token = bearerToken) => {
  const options = bearerOptions(token);
  return {
    headers: {
      method: "POST",
      ...options.headers,
    },
  };
};
const bearerPostHeaders = (token = bearerToken) => {
  const headers = bearerHeaders(token);
  return {
    method: "POST",
    ...headers,
  };
};

type None = {
  unwrap: () => never;
};
type Some<T> = {
  unwrap: () => T;
};
type Option<T> = Some<T> | None;

function makeNone(_item?: unknown): None {
  return {
    unwrap: () => {
      throw new Error("Unwrapped None");
    },
  };
}
function makeSome<T>(item: T): Some<T> {
  return {
    unwrap: () => item,
  };
}
function makeOption<T>(item: T): Option<NonNullable<T>> {
  if (item === null || item === undefined) {
    return makeNone(item);
  } else {
    return makeSome(item);
  }
}

// TODO: make this return a more specific type than any
function safeAsyncQuery(
  originalMethod: any,
  _context?: ClassMethodDecoratorContext,
) {
  async function safeMethod(this: any, ...args: any[]) {
    try {
      return makeOption(await originalMethod(args));
    } catch (e) {
      console.error(e);
      return makeNone();
    }
  }

  return safeMethod;
}

export const queryShipList = safeAsyncQuery(async () => {
  return await api["get-my-ships"](bearerOptions());
});

export async function getShipList() {
  const { data } = (await queryShipList()).unwrap();
  return data;
}

export async function fuelShip(shipSymbol: string) {
  const options = { headers: bearerPostHeaders(), params: { shipSymbol } };
  const { data } = await api["refuel-ship"]({}, options);
  return data;
}

export async function extract(shipSymbol: string) {
  const options = { headers: bearerPostHeaders(), params: { shipSymbol } };
  const { data } = await api["extract-resources"]({}, options);
  return data;
}

export async function jettisonCargo(
  shipSymbol: string,
  tradeSymbol: TradeSymbol,
  units: number,
) {
  const options = { headers: bearerPostHeaders(), params: { shipSymbol } };
  const { data } = await api["jettison"](
    { symbol: tradeSymbol, units },
    options,
  );
  return data;
}

export async function transferCargo({
  from,
  to,
  tradeSymbol,
  units,
}: {
  from: string;
  to: string;
  tradeSymbol: TradeSymbol;
  units: number;
}) {
  const options = {
    headers: bearerPostHeaders(),
    params: { shipSymbol: from },
  };
  const { data } = await api["transfer-cargo"](
    { tradeSymbol, units, shipSymbol: to },
    options,
  );
  return data;
}

export async function dock(shipSymbol: string) {
  const options = { headers: bearerPostHeaders(), params: { shipSymbol } };
  const { data } = await api["dock-ship"](undefined, options);
  return data;
}

export async function undock(shipSymbol: string) {
  const options = { headers: bearerPostHeaders(), params: { shipSymbol } };
  const { data } = await api["orbit-ship"](undefined, options);
  return data;
}

export async function navShip(shipSymbol: string, destination: string) {
  const options = { headers: bearerPostHeaders(), params: { shipSymbol } };
  const { data } = await api["navigate-ship"](
    { waypointSymbol: destination },
    options,
  );
  return data;
}

export async function sellCargo(
  shipSymbol: string,
  cargoSymbol: TradeSymbol,
  units: number,
) {
  const options = { headers: bearerPostHeaders(), params: { shipSymbol } };
  const { data } = await api["sell-cargo"](
    { symbol: cargoSymbol, units },
    options,
  );
  return data;
}
