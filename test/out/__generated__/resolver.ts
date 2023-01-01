/* eslint-disable */
import { query } from "./query.js";
import { mutation } from "./mutation.js";
import { subscription } from "./subscription.js";
import { UserResult, PostResult } from "./relationMap.js";
export const resolvers = {
  Query: query,
  Mutation: mutation,
  Subscription: subscription,
  ...{
    User: {
      uPost: (user: UserResult) => {
        if (user.uPost !== undefined) return user.uPost;
        throw "sasat: UNEXPECTED ERROR. path=uPost";
      },
      vP: (user: UserResult) => {
        if (user.vP !== undefined) return user.vP;
        throw "sasat: UNEXPECTED ERROR. path=vP";
      },
    },
    Post: {
      pUser: (post: PostResult) => {
        if (post.pUser !== undefined) return post.pUser;
        throw "sasat: UNEXPECTED ERROR. path=post.pUser";
      },
      vC: (post: PostResult) => {
        if (post.vC !== undefined) return post.vC;
        throw "sasat: UNEXPECTED ERROR. path=post.vC";
      },
    },
  },
};
