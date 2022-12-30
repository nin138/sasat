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
export const mutation = {
  createUser: makeResolver<GQLContext, UserCreatable>(async (_, params) => {
    const ds = new UserDBDataSource();
    const result = await ds.create(params);
    await publishUserCreated(result as User);
    return result;
  }),
  updateUser: makeResolver<GQLContext, UserIdentifiable & UserUpdatable>(
    async (_, params) => {
      const ds = new UserDBDataSource();
      const result = await ds
        .update(params)
        .then((it: CommandResponse): boolean => it.changedRows === 1);
      const identifiable = pick(params, ["uid"]) as unknown as UserIdentifiable;
      const refetched = await ds.findByUid(identifiable.uid);
      await publishUserUpdated(refetched as User);
      return refetched;
    }
  ),
  createPost: makeResolver<GQLContext, PostCreatable>(async (_, params) => {
    const ds = new PostDBDataSource();
    const result = await ds.create(params);
    const identifiable = pick(result, ["pid"]) as unknown as PostIdentifiable;
    const refetched = await ds.findByPid(identifiable.pid);
    return refetched;
  }),
  updatePost: makeResolver<GQLContext, PostIdentifiable & PostUpdatable>(
    async (_, params) => {
      const ds = new PostDBDataSource();
      const result = await ds
        .update(params)
        .then((it: CommandResponse): boolean => it.changedRows === 1);
      const identifiable = pick(params, ["pid"]) as unknown as PostIdentifiable;
      const refetched = await ds.findByPid(identifiable.pid);
      return refetched;
    }
  ),
};
