import pkg from 'sqlstring';
const { escapeId, escape } = pkg;

export const SqlString = {
  escape: escape,
  escapeId: (name: string): string => escapeId(name),
};
