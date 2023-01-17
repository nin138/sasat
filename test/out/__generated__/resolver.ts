/* eslint-disable */
import { query } from "./query.js";
import { mutation } from "./mutation.js";
import { subscription } from "./subscription.js";
import { UserResult, PostResult } from "./relationMap.js";
import { UserHashId, PostHashId } from "../idEncoder.js";
import { GQLContext } from "../context.js";
import { PostDBDataSource } from "../dataSources/db/Post.js";
import { UserDBDataSource } from "../dataSources/db/User.js";
export const resolvers = {
  Query: query,
  Mutation: mutation,
  Subscription: subscription,
  ...{
    User: {
      userId: (user: UserResult) =>
        user.userId && UserHashId.encode(user.userId),
      uPost: (user: UserResult, context: GQLContext) => {
        if (user.uPost !== undefined) return user.uPost;
        const ds = new PostDBDataSource();
        const where = ds
          .getRelationMap()
          .uPost.condition({ parent: user, childTableAlias: "t0", context });
        return ds.find(undefined, { where });
      },
      vP: (user: UserResult, context: GQLContext) => {
        if (user.vP !== undefined) return user.vP;
        const ds = new PostDBDataSource();
        const where = ds
          .getRelationMap()
          .vP.condition({ parent: user, childTableAlias: "t0", context });
        return ds.find(undefined, { where });
      },
    },
    Post: {
      postId: (post: PostResult) =>
        post.postId && PostHashId.encode(post.postId),
      uId: (post: PostResult) => post.uId && UserHashId.encode(post.uId),
      pUser: (post: PostResult, context: GQLContext) => {
        if (post.pUser !== undefined) return post.pUser;
        const ds = new UserDBDataSource();
        const where = ds
          .getRelationMap()
          .pUser.condition({ parent: post, childTableAlias: "t0", context });
        return ds.first(undefined, { where });
      },
      vC: (post: PostResult, context: GQLContext) => {
        if (post.vC !== undefined) return post.vC;
        const ds = new UserDBDataSource();
        const where = ds
          .getRelationMap()
          .vC.condition({ parent: post, childTableAlias: "t0", context });
        return ds.first(undefined, { where });
      },
    },
  },
};
