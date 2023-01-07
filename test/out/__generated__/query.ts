/* eslint-disable */
import {
  makeResolver,
  gqlResolveInfoToField,
  PagingOption,
  QExpr,
} from "sasat";
import { UserDBDataSource } from "../dataSources/db/User.js";
import { UserFields, PostFields, StockFields } from "./fields.js";
import { GQLContext } from "../context.js";
import { PostDBDataSource } from "../dataSources/db/Post.js";
import { StockDBDataSource } from "../dataSources/db/Stock.js";
export const query = {
  user: makeResolver<GQLContext, { userId: number }>(
    async (_, { userId }, context, info) =>
      new UserDBDataSource().findByUid(
        userId,
        gqlResolveInfoToField(info) as UserFields,
        undefined,
        context
      )
  ),
  users: makeResolver<GQLContext, { option: PagingOption }>(
    async (_, { option }, context, info) => {
      const fields = gqlResolveInfoToField<UserFields>(info);
      const sort = option.order
        ? [
            QExpr.sort(
              QExpr.field("t1", option.order),
              option?.asc === false ? "DESC" : "ASC"
            ),
          ]
        : [];
      return new UserDBDataSource().findPageable(
        { numberOfItem: option.numberOfItem, offset: option.offset, sort },
        fields,
        undefined,
        context
      );
    }
  ),
  post: makeResolver<GQLContext, { postId: number }>(
    async (_, { postId }, context, info) =>
      new PostDBDataSource().findByPid(
        postId,
        gqlResolveInfoToField(info) as PostFields,
        undefined,
        context
      )
  ),
  posts: makeResolver<GQLContext, {}>(async (_, {}, context, info) => {
    const fields = gqlResolveInfoToField<PostFields>(info);
    return new PostDBDataSource().find(fields, undefined, context);
  }),
  stock: makeResolver<GQLContext, { id: number }>(
    async (_, { id }, context, info) =>
      new StockDBDataSource().findById(
        id,
        gqlResolveInfoToField(info) as StockFields,
        undefined,
        context
      )
  ),
  stocks: makeResolver<GQLContext, {}>(async (_, {}, context, info) => {
    const fields = gqlResolveInfoToField<StockFields>(info);
    return new StockDBDataSource().find(fields, undefined, context);
  }),
};
