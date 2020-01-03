export interface GqlOption {
  subscription: {
    onCreate: boolean;
    onUpdate: boolean;
  };
}

export const getDefaultGqlOption = () => ({
  subscription: {
    onCreate: false,
    onUpdate: false,
  },
});
