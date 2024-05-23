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

export async function getShipList() {
  const { data } = await api["get-my-ships"](bearerOptions());
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
