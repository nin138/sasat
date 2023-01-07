/* eslint-disable */
import { query } from "./query.js";
import { mutation } from "./mutation.js";
import { subscription } from "./subscription.js";
import { UserResult, PostResult, StockResult } from "./relationMap.js";
import { GQLContext } from "../context.js";
import { PostDBDataSource } from "../dataSources/db/Post.js";
import { StockDBDataSource } from "../dataSources/db/Stock.js";
import { UserDBDataSource } from "../dataSources/db/User.js";
export const resolvers = {
  Query: query,
  Mutation: mutation,
  Subscription: subscription,
  ...{
    User: {
      uPost: (user: UserResult, context: GQLContext) => {
        if (user.uPost !== undefined) return user.uPost;
        const ds = new PostDBDataSource();
        const where = ds
          .getRelationMap()
          .uPost.condition({ parent: user, childTableAlias: "t0", context });
        return ds.find(undefined, { where });
      },
      stock_userStock: (user: UserResult, context: GQLContext) => {
        if (user.stock_userStock !== undefined) return user.stock_userStock;
        const ds = new StockDBDataSource();
        const where = ds
          .getRelationMap()
          .stock_userStock.condition({
            parent: user,
            childTableAlias: "t0",
            context,
          });
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
      Stock: (post: PostResult, context: GQLContext) => {
        if (post.Stock !== undefined) return post.Stock;
        const ds = new StockDBDataSource();
        const where = ds
          .getRelationMap()
          .Stock.condition({ parent: post, childTableAlias: "t0", context });
        return ds.find(undefined, { where });
      },
    },
    Stock: {
      stock_user: (stock: StockResult, context: GQLContext) => {
        if (stock.stock_user !== undefined) return stock.stock_user;
        const ds = new UserDBDataSource();
        const where = ds
          .getRelationMap()
          .stock_user.condition({
            parent: stock,
            childTableAlias: "t0",
            context,
          });
        return ds.first(undefined, { where });
      },
      postPost: (stock: StockResult, context: GQLContext) => {
        if (stock.postPost !== undefined) return stock.postPost;
        const ds = new PostDBDataSource();
        const where = ds
          .getRelationMap()
          .postPost.condition({
            parent: stock,
            childTableAlias: "t0",
            context,
          });
        return ds.first(undefined, { where });
      },
    },
  },
};
