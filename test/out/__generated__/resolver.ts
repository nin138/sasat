/* eslint-disable */
import { query } from "./query.js";
import { mutation } from "./mutation.js";
import { subscription } from "./subscription.js";
import { UserResult, PostResult } from "./relationMap.js";
import { PostDBDataSource } from "../dataSources/db/Post.js";
import { UserDBDataSource } from "../dataSources/db/User.js";
export const resolvers = {
  Query: query,
  Mutation: mutation,
  Subscription: subscription,
  ...{
    User: {
      uPost: (user: UserResult) => {
        if (user.uPost !== undefined) return user.uPost;
        return new PostDBDataSource().findByUser(user);
      },
    },
    Post: {
      pUser: (post: PostResult) => {
        if (post.pUser !== undefined) return post.pUser;
        return new UserDBDataSource().findByPost(post);
      },
    },
  },
};
