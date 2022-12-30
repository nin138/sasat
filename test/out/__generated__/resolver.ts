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
      hogePost: (user: UserResult) => {
        if (user.hogePost !== undefined) return user.hogePost;
        return new PostDBDataSource().findByUser(user);
      },
    },
    Post: {
      hoge: (post: PostResult) => {
        if (post.hoge !== undefined) return post.hoge;
        return new UserDBDataSource().findByPost(post);
      },
    },
  },
};
