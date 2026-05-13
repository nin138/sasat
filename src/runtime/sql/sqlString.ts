import pkg from "sqlstring";

// biome-ignore lint/suspicious/noShadowRestrictedNames: <>
const { escape, escapeId } = pkg;

export const SqlString = {
  escape: (value: Parameters<typeof escape>[0]) => escape(value, true),
  escapeId: (name: string): string => escapeId(name),
};
