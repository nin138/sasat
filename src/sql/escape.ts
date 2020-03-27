import { escapeId } from 'sqlstring';

export const escapeName = (name: string) => escapeId(name);
