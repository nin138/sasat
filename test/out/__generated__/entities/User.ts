/* eslint-disable */
export type User = {
  readonly uid: number;
  readonly NNN: string;
  readonly nick?: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};
export type UserCreatable = {
  readonly NNN?: string | null;
  readonly nick?: string | null;
};
export type UserUpdatable = {
  readonly uid: number;
  readonly NNN?: string | null;
  readonly nick?: string | null;
  readonly createdAt?: string | null;
};
export type UserIdentifiable = { readonly uid: number };
