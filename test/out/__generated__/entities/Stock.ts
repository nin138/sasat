/* eslint-disable */
export type Stock = {
  readonly user: number;
  readonly post: number;
  readonly id: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};
export type StockCreatable = {
  readonly user: number;
  readonly post: number;
  readonly id: number;
};
export type StockUpdatable = {
  readonly id: number;
  readonly user: number | null;
  readonly post: number | null;
  readonly createdAt: string | null;
};
export type StockIdentifiable = { readonly id: number };
