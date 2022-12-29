/* eslint-disable */
import { makeResolver, CommandResponse, pick } from "sasat";
import { UserDBDataSource } from "../dataSources/db/User.js";
import { publishUserCreated, publishUserUpdated } from "./subscription.js";
import { GQLContext } from "../context.js";
import {
  UserCreatable,
  UserIdentifiable,
  UserUpdatable,
} from "./entities/User.js";
import { PostDBDataSource } from "../dataSources/db/Post.js";
import {
  PostIdentifiable,
  PostCreatable,
  PostUpdatable,
} from "./entities/Post.js";
const mutation = {
  createUser: makeResolver<GQLContext, UserCreatable>(
    (_, params, context, info) => {
      const ds = new UserDBDataSource();
      const result = await ds.create(params);
      await publishUserCreated(result as User);
      return result;
    }
  ),
  updateUser: makeResolver<GQLContext, UserIdentifiable & UserUpdatable>(
    (_, params, context, info) => {
      const ds = new UserDBDataSource();
      const result = await ds
        .update(params)
        .then((it: CommandResponse): boolean => it.changedRows === 1);
      const identifiable = pick(result, [
        "userId",
      ]) as unknown as UserIdentifiable;
      const refetch = await ds.findByUserId(identifiable.userId);
      await publishUserUpdated(refetch as User);
      return refetch;
    }
  ),
  createPost: makeResolver<GQLContext, PostCreatable>(
    (_, params, context, info) => {
      const ds = new PostDBDataSource();
      const result = await ds.create(params);
      const identifiable = pick(result, [
        "postId",
      ]) as unknown as PostIdentifiable;
      const refetch = await ds.findByPostId(identifiable.postId);
      return refetch;
    }
  ),
  updatePost: makeResolver<GQLContext, PostIdentifiable & PostUpdatable>(
    (_, params, context, info) => {
      const ds = new PostDBDataSource();
      const result = await ds
        .update(params)
        .then((it: CommandResponse): boolean => it.changedRows === 1);
      const identifiable = pick(result, [
        "postId",
      ]) as unknown as PostIdentifiable;
      const refetch = await ds.findByPostId(identifiable.postId);
      return refetch;
    }
  ),
};
