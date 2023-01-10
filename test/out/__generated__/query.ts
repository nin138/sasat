/* eslint-disable */
import {
  makeResolver,
  gqlResolveInfoToField,
  pagingOption,
  PagingOption,
  QExpr,
} from "sasat";
import { UserFields, PostFields, StockFields } from "./fields.js";
import { UserDBDataSource } from "../dataSources/db/User.js";
import { GQLContext } from "../context.js";
import { PostDBDataSource } from "../dataSources/db/Post.js";
import { StockDBDataSource } from "../dataSources/db/Stock.js";
export const query = {
  user: makeResolver<GQLContext, { uid: number }>(
    async (_, { uid }, context, info) => {
      const fields = gqlResolveInfoToField(info) as UserFields;
      return new UserDBDataSource().findByUid(uid, fields, undefined, context);
    }
  ),
  users: makeResolver<GQLContext, { option: PagingOption }>(
    async (_, { option }, context, info) => {
      const fields = gqlResolveInfoToField(info) as UserFields;
      return new UserDBDataSource().findPageable(
        pagingOption(option),
        fields,
        undefined,
        context
      );
    }
  ),
  www: makeResolver<GQLContext, { a1: number }>(
    async (_, { a1 }, context, info) => {
      const fields = gqlResolveInfoToField(info) as UserFields;
      const where = QExpr.conditions.and(
        QExpr.conditions.comparison(QExpr.value(1), "=", QExpr.value(a1))
      );
      return new UserDBDataSource().first(fields, { where }, context);
    }
  ),
  la: makeResolver<GQLContext, {}>(async (_, {}, context, info) => {
    const fields = gqlResolveInfoToField(info) as UserFields;
    return new UserDBDataSource().find(fields, undefined, context);
  }),
  p: makeResolver<GQLContext, { option: PagingOption }>(
    async (_, { option }, context, info) => {
      const fields = gqlResolveInfoToField(info) as UserFields;
      return new UserDBDataSource().findPageable(
        pagingOption(option),
        fields,
        undefined,
        context
      );
    }
  ),
  post: makeResolver<GQLContext, { pid: number }>(
    async (_, { pid }, context, info) => {
      const fields = gqlResolveInfoToField(info) as PostFields;
      return new PostDBDataSource().findByPid(pid, fields, undefined, context);
    }
  ),
  posts: makeResolver<GQLContext, { option: PagingOption }>(
    async (_, { option }, context, info) => {
      const fields = gqlResolveInfoToField(info) as PostFields;
      return new PostDBDataSource().findPageable(
        pagingOption(option),
        fields,
        undefined,
        context
      );
    }
  ),
  stock: makeResolver<GQLContext, { id: number }>(
    async (_, { id }, context, info) => {
      const fields = gqlResolveInfoToField(info) as StockFields;
      return new StockDBDataSource().findById(id, fields, undefined, context);
    }
  ),
  stocks: makeResolver<GQLContext, {}>(async (_, {}, context, info) => {
    const fields = gqlResolveInfoToField(info) as StockFields;
    return new StockDBDataSource().find(fields, undefined, context);
  }),
};
