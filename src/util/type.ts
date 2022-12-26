export type NestedPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer R>
    ? Array<NestedPartial<R>>
    : NestedPartial<T[K]>;
};

export const nonNullableFilter = <T>(
  item: T,
): item is NonNullable<typeof item> => item != null;
