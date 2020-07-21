export const TsUtil = {
  export: (isExported: boolean) => (isExported ? 'export ' : ''),
  readonly: (isReadonly: boolean) => (isReadonly ? 'readonly ' : ''),
  questionToken: (isOptional: boolean) => (isOptional ? '?' : ''),
};
