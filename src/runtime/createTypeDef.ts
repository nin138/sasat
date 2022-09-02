const createTypeString = (key: string, values: string[], keyword: 'type'|'input') => `\
${keyword} ${key} {
${values.map(it => `  ${it}`).join('\n')}
}
`;

export const createTypeDef = (typeDef: Record<string, string[]>, inputs: Record<string, string[]>): string =>
  Object.entries(typeDef)
    .map(([key, value]) => createTypeString(key, value, 'type'))
    .join('\n')
  + Object.entries(inputs)
    .map(([key, value]) => createTypeString(key, value, 'input'))
    .join('\n');
