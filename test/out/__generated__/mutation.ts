/* eslint-disable */
import { makeResolver, CommandResponse, pick } from "sasat";
import { UserDBDataSource } from "../dataSources/db/User.js";
import { publishUserCreated, publishUserUpdated } from "./subscription.js";
import {
  User,
  UserCreatable,
  UserIdentifiable,
  UserUpdatable,
} from "./entities/User.js";
import { GQLContext } from "../context.js";
import { PostDBDataSource } from "../dataSources/db/Post.js";
import {
  PostIdentifiable,
  PostCreatable,
  PostUpdatable,
} from "./entities/Post.js";
import { StockDBDataSource } from "../dataSources/db/Stock.js";
import {
  StockIdentifiable,
  StockCreatable,
  StockUpdatable,
} from "./entities/Stock.js";
export const mutation = {
  createUser: makeResolver<GQLContext, { user: UserCreatable }>(
    async (_, { user }) => {
      const ds = new UserDBDataSource();
      const result = await ds.create(user);
      await publishUserCreated(result as User);
      return result;
    }
  ),
  updateUser: makeResolver<
    GQLContext,
    { user: UserIdentifiable & UserUpdatable }
  >(async (_, { user }) => {
    const ds = new UserDBDataSource();
    const result = await ds
      .update(user)
      .then((it: CommandResponse): boolean => it.changedRows === 1);
    const identifiable = pick(user, ["uid"]) as unknown as UserIdentifiable;
    const fetched = await ds.findByUid(identifiable.uid);
    await publishUserUpdated(fetched as User);
    return result;
  }),
  createPost: makeResolver<GQLContext, { post: PostCreatable }>(
    async (_, { post }) => {
      const ds = new PostDBDataSource();
      const result = await ds.create(post);
      const identifiable = pick(result, ["pid"]) as unknown as PostIdentifiable;
      const fetched = await ds.findByPid(identifiable.pid);
      return fetched;
    }
  ),
  updatePost: makeResolver<
    GQLContext,
    { post: PostIdentifiable & PostUpdatable }
  >(async (_, { post }) => {
    const ds = new PostDBDataSource();
    const result = await ds
      .update(post)
      .then((it: CommandResponse): boolean => it.changedRows === 1);
    const identifiable = pick(post, ["pid"]) as unknown as PostIdentifiable;
    const fetched = await ds.findByPid(identifiable.pid);
    return fetched;
  }),
  createStock: makeResolver<GQLContext, { stock: StockCreatable }>(
    async (_, { stock }) => {
      const ds = new StockDBDataSource();
      const result = await ds.create(stock);
      const identifiable = pick(result, ["id"]) as unknown as StockIdentifiable;
      const fetched = await ds.findById(identifiable.id);
      return fetched;
    }
  ),
  updateStock: makeResolver<
    GQLContext,
    { stock: StockIdentifiable & StockUpdatable }
  >(async (_, { stock }) => {
    const ds = new StockDBDataSource();
    const result = await ds
      .update(stock)
      .then((it: CommandResponse): boolean => it.changedRows === 1);
    const identifiable = pick(stock, ["id"]) as unknown as StockIdentifiable;
    const fetched = await ds.findById(identifiable.id);
    return fetched;
  }),
  deleteStock: makeResolver<GQLContext, { stock: StockIdentifiable }>(
    async (_, { stock }) => {
      const ds = new StockDBDataSource();
      const result = await ds
        .delete(stock)
        .then((it: CommandResponse): boolean => it.affectedRows === 1);
      return result;
    }
  ),
};
