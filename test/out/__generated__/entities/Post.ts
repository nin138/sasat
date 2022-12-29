/* eslint-disable */
export type Post = {
  readonly userId: number;
  readonly pid: number;
  readonly title: string;
};
export type PostCreatable = { readonly userId: number; readonly title: string };
type PostUpdatable = {
  readonly pid: number;
  readonly userId: number | null;
  readonly title: string | null;
};
export type PostIdentifiable = { readonly pid: number };
