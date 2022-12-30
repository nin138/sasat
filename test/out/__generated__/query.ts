/* eslint-disable */
import { makeResolver, gqlResolveInfoToField, PagingOption } from "sasat";
import { UserDBDataSource } from "../dataSources/db/User.js";
import { UserFields, PostFields } from "./fields.js";
import { GQLContext } from "../context.js";
import { PostDBDataSource } from "../dataSources/db/Post.js";
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
      return new UserDBDataSource().findPageable(
        { numberOfItem: option.numberOfItem, offset: option.offset },
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
};
