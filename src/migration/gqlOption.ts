import { NestedPartial } from '../util/type';

export interface GqlFromContextParam {
  column: string;
  contextName?: string;
}

export interface GqlOption {
  mutation: {
    create: boolean;
    update: boolean;
    delete: boolean;
    fromContextColumns: GqlFromContextParam[];
  };
  subscription: {
    onCreate: boolean;
    onUpdate: boolean;
    onDelete: boolean;
    filter: string[];
  };
}

export const getDefaultGqlOption = (): GqlOption => ({
  mutation: {
    create: true,
    update: true,
    delete: false,
    fromContextColumns: [],
  },
  subscription: {
    onCreate: false,
    onUpdate: false,
    onDelete: false,
    filter: [],
  },
});

export const mergeGqlOption = (prev: GqlOption, update: NestedPartial<GqlOption>): GqlOption => {
  return {
    ...prev,
    mutation: {
      ...prev.mutation,
      ...update.mutation,
      fromContextColumns:
        (update.mutation?.fromContextColumns?.filter(it => it.column) as Array<{
          column: string;
          contextName?: string;
        }>) || prev.mutation.fromContextColumns,
    },
    subscription: {
      ...prev.subscription,
      ...update.subscription,
    },
  };
};
