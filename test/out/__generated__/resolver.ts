/* eslint-disable */
import { query } from "./query.js";
import { mutation } from "./mutation.js";
import { subscription } from "./subscription.js";
import { PostResult, UserResult } from "./relationMap.js";
import { UserDBDataSource } from "../dataSources/db/User.js";
export const resolvers = {
  Query: query,
  Mutation: mutation,
  Subscription: subscription,
  ...{
    User: {
      hogePost: (post: PostResult) => {
        if (post.hogePost !== undefined) return post.hogePost;
        return new UserDBDataSource().findByPost(post);
      },
    },
    Post: {
      hoge: (user: UserResult) => {
        if (user.hoge !== undefined) return user.hoge;
        return new UserDBDataSource().findByUser(user);
      },
    },
  },
};
