/* eslint-disable */
export type Stock = {
  readonly id: number;
  readonly user: number;
  readonly post: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};
export type StockCreatable = {
  readonly id: number;
  readonly user: number;
  readonly post: number;
};
export type StockUpdatable = { readonly id: number };
export type StockIdentifiable = { readonly id: number };
