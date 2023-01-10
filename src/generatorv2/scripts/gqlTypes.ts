export type GQLPrimitive = 'Int' | 'Float' | 'String' | 'Boolean';

export const toTsType = (type: GQLPrimitive | string) => {
  switch (type) {
    case 'Int':
    case 'Float':
      return 'number';
    // case 'ID':
    case 'String':
      return 'string';
    case 'Boolean':
      return 'boolean';
    default:
      return type;
  }
};
