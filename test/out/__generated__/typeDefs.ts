/* eslint-disable */
export const typeDefs = {
  User: {
    uid: { return: "Int!" },
    NNN: { return: "String!" },
    nick: { return: "String" },
    createdAt: { return: "String!" },
    updatedAt: { return: "String!" },
    uPost: { return: "[Post!]!" },
  },
  Post: {
    uId: { return: "Int!" },
    pid: { return: "Int!" },
    title: { return: "String!" },
    pUser: { return: "User!" },
    vC: { return: "User!" },
  },
  Query: {
    user: { return: "User", args: [{ name: "userId", type: "Int!" }] },
    users: {
      return: "[User!]!",
      args: [{ name: "option", type: "PagingOption!" }],
    },
    post: { return: "Post", args: [{ name: "postId", type: "Int!" }] },
    posts: { return: "[Post!]!", args: [] },
  },
  Mutation: {
    createUser: {
      return: "User!",
      args: [{ name: "user", type: "UserCreateInput!" }],
    },
    updateUser: {
      return: "Boolean!",
      args: [{ name: "user", type: "UserUpdateInput!" }],
    },
    createPost: {
      return: "Post!",
      args: [{ name: "post", type: "PostCreateInput!" }],
    },
    updatePost: {
      return: "Post!",
      args: [{ name: "post", type: "PostUpdateInput!" }],
    },
  },
  Subscription: {
    UserCreated: { return: "User!", args: [] },
    UserUpdated: { return: "User!", args: [{ name: "name", type: "String!" }] },
  },
};
export const inputs = {
  PagingOption: {
    numberOfItem: { return: "Int!" },
    offset: { return: "Int" },
    order: { return: "String" },
    asc: { return: "Boolean" },
  },
  UserCreateInput: { NNN: { return: "String" }, nick: { return: "String" } },
  PostCreateInput: { uId: { return: "Int!" }, title: { return: "String!" } },
  UserUpdateInput: {
    uid: { return: "Int!" },
    NNN: { return: "String" },
    nick: { return: "String" },
    createdAt: { return: "String" },
  },
  PostUpdateInput: {
    pid: { return: "Int!" },
    uId: { return: "Int" },
    title: { return: "String" },
  },
};
