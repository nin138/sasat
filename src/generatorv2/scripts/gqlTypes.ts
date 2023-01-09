export enum GqlPrimitive {
  Int = 'Int',
  Float = 'Float',
  String = 'String',
  Boolean = 'Boolean',
  // ID = 'ID',
}

export const toTsType = (type: 'Int' | 'String' | 'Float') => {
  switch (type) {
    case 'Int':
    case 'Float':
      return 'number';
    // case GqlPrimitive.Boolean: return 'boolean';
    // case GqlPrimitive.ID:
    case 'String':
      return 'string';
  }
};
