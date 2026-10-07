/* eslint-disable */
import {UserCreatable,UserIdentifiable,UserUpdatable,User} from "./entities/User.js";
import {testMiddleware,hoge} from "../middlewares.js";
import {GQLContext} from "../context.js";
import {ResolverMiddleware,makeResolver,publishAfterWrite,CommandResponse,pick,gqlResolveInfoToField} from "sasat";
import {UserHashId,PostHashId} from "../idEncoder.js";
import {PostCreatable,PostIdentifiable,PostUpdatable} from "./entities/Post.js";
import {UserDBDataSource} from "../dataSources/db/User.js";
import {publishUserCreated,publishUserUpdated} from "./subscription.js";
import {PostDBDataSource} from "../dataSources/db/Post.js";
import {PostFields} from "./fields.js";
type UserCreateInput = {user: UserCreatable}
const createUserMiddleware: Array<ResolverMiddleware<GQLContext,UserCreateInput>> = [testMiddleware,hoge];
type GQLUserUpdateInput = {user: {userId: string;NNN?: string | null;nick?: string | null;foo?: string | null}}
type UserUpdateInput = {user: UserIdentifiable & UserUpdatable}
const updateUserMiddleware: Array<ResolverMiddleware<GQLContext,UserUpdateInput,GQLUserUpdateInput>> = [(args) => {args[1]={...args[1],user: {...args[1].user,userId: (args[1].user.userId===null||args[1].user.userId===undefined)?args[1].user.userId:UserHashId.decode(args[1].user.userId as string)}};
return args;}];
type GQLPostCreateInput = {post: {uId: string;title: string}}
type PostCreateInput = {post: PostCreatable}
const createPostMiddleware: Array<ResolverMiddleware<GQLContext,PostCreateInput,GQLPostCreateInput>> = [(args) => {args[1]={...args[1],post: {...args[1].post,uId: (args[1].post.uId===null||args[1].post.uId===undefined)?args[1].post.uId:UserHashId.decode(args[1].post.uId as string)}};
return args;}];
type GQLPostUpdateInput = {post: {postId: string;title?: string | null}}
type PostUpdateInput = {post: PostIdentifiable & PostUpdatable}
const updatePostMiddleware: Array<ResolverMiddleware<GQLContext,PostUpdateInput,GQLPostUpdateInput>> = [(args) => {args[1]={...args[1],post: {...args[1].post,postId: (args[1].post.postId===null||args[1].post.postId===undefined)?args[1].post.postId:PostHashId.decode(args[1].post.postId as string)}};
return args;}];
export const mutation = {createUser: makeResolver<GQLContext,UserCreateInput>(async (_,{user}) => {const ds = new UserDBDataSource();
const result = await ds.create(user);
await publishAfterWrite('publishUserCreated',() => publishUserCreated((result) as unknown as User));
return result;},createUserMiddleware),updateUser: makeResolver<GQLContext,UserUpdateInput,GQLUserUpdateInput>(async (_,{user},context) => {const ds = new UserDBDataSource();
const result = await ds.update(user).then((it: CommandResponse): boolean => it.changedRows===1);
const identifiable = pick(user,['userId']) as unknown as UserIdentifiable;
const fetched = await ds.findByUserId(identifiable.userId,undefined,undefined,context);
await publishAfterWrite('publishUserUpdated',() => publishUserUpdated(((fetched)?pick(fetched,['userId','NNN','nick','createdAt','updatedAt','foo']):fetched) as unknown as User));
return result;},updateUserMiddleware),createPost: makeResolver<GQLContext,PostCreateInput,GQLPostCreateInput>(async (_,{post},context,info) => {const ds = new PostDBDataSource();
const result = await ds.create(post);
const fields = (info)?gqlResolveInfoToField(info) as PostFields:undefined;
const identifiable = pick(result,['postId']) as unknown as PostIdentifiable;
const fetched = await ds.findByPostId(identifiable.postId,fields,undefined,context);
return fetched;},createPostMiddleware),updatePost: makeResolver<GQLContext,PostUpdateInput,GQLPostUpdateInput>(async (_,{post},context,info) => {const ds = new PostDBDataSource();
await ds.update(post);
const fields = (info)?gqlResolveInfoToField(info) as PostFields:undefined;
const identifiable = pick(post,['postId']) as unknown as PostIdentifiable;
const fetched = await ds.findByPostId(identifiable.postId,fields,undefined,context);
return fetched;},updatePostMiddleware)};