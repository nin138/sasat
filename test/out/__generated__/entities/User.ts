/* eslint-disable */
export type User = {
  readonly userId: number;
  readonly NNN: string;
  readonly nick?: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly foo: string;
};
export type UserCreatable = {
  readonly NNN?: string | null;
  readonly nick?: string | null;
  readonly foo?: string | null;
};
export type UserUpdatable = {
  readonly userId: number;
  readonly NNN?: string | null;
  readonly nick?: string | null;
  readonly foo?: string | null;
};
export type UserIdentifiable = { readonly userId: number };
