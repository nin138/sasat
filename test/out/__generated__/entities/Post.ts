/* eslint-disable */
export type Post = {
  readonly postId: number;
  readonly uId: number;
  readonly title: string;
};
export type PostCreatable = { readonly uId: number; readonly title: string };
export type PostUpdatable = {
  readonly postId: number;
  readonly title?: string | null;
};
export type PostIdentifiable = { readonly postId: number };
