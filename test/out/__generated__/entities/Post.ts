/* eslint-disable */
export type Post = {
  readonly uId: number;
  readonly pid: number;
  readonly title: string;
};
export type PostCreatable = { readonly uId: number; readonly title: string };
export type PostUpdatable = {
  readonly pid: number;
  readonly uId: number | null;
  readonly title: string | null;
};
export type PostIdentifiable = { readonly pid: number };
