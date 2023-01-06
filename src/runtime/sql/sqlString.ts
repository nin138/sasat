import pkg from 'sqlstring';
const { escapeId, escape } = pkg;

export const SqlString = {
  escape: (value: Parameters<typeof escape>[0]) => escape(value, true),
  escapeId: (name: string): string => escapeId(name),
};
