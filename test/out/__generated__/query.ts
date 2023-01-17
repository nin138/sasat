/* eslint-disable */
import {
  makeResolver,
  gqlResolveInfoToField,
  pagingOption,
  PagingOption,
  QExpr,
} from "sasat";
import { UserFields, PostFields } from "./fields.js";
import { UserDBDataSource } from "../dataSources/db/User.js";
import { UserHashId, PostHashId } from "../idEncoder.js";
import { GQLContext } from "../context.js";
import { PostDBDataSource } from "../dataSources/db/Post.js";
export const query = {
  user: makeResolver<GQLContext, { userId: number }, { userId: string }>(
    async (_, { userId }, context, info) => {
      const fields = gqlResolveInfoToField(info) as UserFields;
      return new UserDBDataSource().findByUserId(
        userId,
        fields,
        undefined,
        context
      );
    },
    [
      (args) => {
        args[1] = {
          ...args[1],
          userId: UserHashId.decode(args[1].userId as string),
        };
        return args;
      },
    ]
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
  post: makeResolver<GQLContext, { postId: number }, { postId: string }>(
    async (_, { postId }, context, info) => {
      const fields = gqlResolveInfoToField(info) as PostFields;
      return new PostDBDataSource().findByPostId(
        postId,
        fields,
        undefined,
        context
      );
    },
    [
      (args) => {
        args[1] = {
          ...args[1],
          postId: PostHashId.decode(args[1].postId as string),
        };
        return args;
      },
    ]
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
};
