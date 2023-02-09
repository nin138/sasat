/* eslint-disable */
import {
  UserCreatable,
  UserIdentifiable,
  UserUpdatable,
  User,
} from "./entities/User.js";
import { testMiddleware, hoge } from "../middlewares.js";
import { GQLContext } from "../context.js";
import { ResolverMiddleware, makeResolver, CommandResponse, pick } from "sasat";
import { UserHashId, PostHashId } from "../idEncoder.js";
import {
  PostCreatable,
  PostIdentifiable,
  PostUpdatable,
} from "./entities/Post.js";
import { UserDBDataSource } from "../dataSources/db/User.js";
import { publishUserCreated, publishUserUpdated } from "./subscription.js";
import { PostDBDataSource } from "../dataSources/db/Post.js";
type UserCreateInput = { user: UserCreatable };
const createUserMiddleware: Array<
  ResolverMiddleware<GQLContext, UserCreateInput>
> = [testMiddleware, hoge];
type GQLUserUpdateInput = {
  user: { userId: string; NNN: string; nick: string };
};
type UserUpdateInput = { user: UserIdentifiable & UserUpdatable };
const updateUserMiddleware: Array<
  ResolverMiddleware<GQLContext, UserUpdateInput, GQLUserUpdateInput>
> = [
  (args) => {
    args[1] = {
      ...args[1],
      user: {
        ...args[1].user,
        userId: UserHashId.decode(args[1].user.userId as string),
      },
    };
    return args;
  },
];
type GQLPostCreateInput = { post: { uId: string; title: string } };
type PostCreateInput = { post: PostCreatable };
const createPostMiddleware: Array<
  ResolverMiddleware<GQLContext, PostCreateInput, GQLPostCreateInput>
> = [
  (args) => {
    args[1] = {
      ...args[1],
      post: {
        ...args[1].post,
        uId: UserHashId.decode(args[1].post.uId as string),
      },
    };
    return args;
  },
];
type GQLPostUpdateInput = { post: { postId: string; title: string } };
type PostUpdateInput = { post: PostIdentifiable & PostUpdatable };
const updatePostMiddleware: Array<
  ResolverMiddleware<GQLContext, PostUpdateInput, GQLPostUpdateInput>
> = [
  (args) => {
    args[1] = {
      ...args[1],
      post: {
        ...args[1].post,
        postId: PostHashId.decode(args[1].post.postId as string),
      },
    };
    return args;
  },
];
export const mutation = {
  createUser: makeResolver<GQLContext, UserCreateInput>(async (_, { user }) => {
    const ds = new UserDBDataSource();
    const result = await ds.create(user);
    await publishUserCreated(result as User);
    return result;
  }, createUserMiddleware),
  updateUser: makeResolver<GQLContext, UserUpdateInput, GQLUserUpdateInput>(
    async (_, { user }) => {
      const ds = new UserDBDataSource();
      const result = await ds
        .update(user)
        .then((it: CommandResponse): boolean => it.changedRows === 1);
      const identifiable = pick(user, [
        "userId",
      ]) as unknown as UserIdentifiable;
      const fetched = await ds.findByUserId(identifiable.userId);
      await publishUserUpdated(fetched as User);
      return result;
    },
    updateUserMiddleware
  ),
  createPost: makeResolver<GQLContext, PostCreateInput, GQLPostCreateInput>(
    async (_, { post }) => {
      const ds = new PostDBDataSource();
      const result = await ds.create(post);
      const identifiable = pick(result, [
        "postId",
      ]) as unknown as PostIdentifiable;
      const fetched = await ds.findByPostId(identifiable.postId);
      return fetched;
    },
    createPostMiddleware
  ),
  updatePost: makeResolver<GQLContext, PostUpdateInput, GQLPostUpdateInput>(
    async (_, { post }) => {
      const ds = new PostDBDataSource();
      const result = await ds
        .update(post)
        .then((it: CommandResponse): boolean => it.changedRows === 1);
      const identifiable = pick(post, [
        "postId",
      ]) as unknown as PostIdentifiable;
      const fetched = await ds.findByPostId(identifiable.postId);
      return fetched;
    },
    updatePostMiddleware
  ),
};
