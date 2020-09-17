import { escapeId, escape } from 'sqlstring';

export const SqlString = {
  escape: escape,
  escapeId: (name: string): string => escapeId(name),
};
