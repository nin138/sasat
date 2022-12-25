export const TsUtil = {
  readonly: (isReadonly: boolean): string => (isReadonly ? 'readonly ' : ''),
  questionToken: (isOptional: boolean): string => (isOptional ? '?' : ''),
};
