import { escapeId } from 'sqlstring';

export const escapeName = (name: string): string => escapeId(name);
