/* eslint-disable */
export const typeDefs = {
  User: {
    uid: { return: "Int!" },
    NNN: { return: "String!" },
    nick: { return: "String" },
    createdAt: { return: "String!" },
    updatedAt: { return: "String!" },
    uPost: { return: "[Post!]!" },
    stock_userStock: { return: "[Stock!]!" },
    vP: { return: "[Post!]!" },
  },
  Post: {
    uId: { return: "Int!" },
    pid: { return: "Int!" },
    title: { return: "String!" },
    pUser: { return: "User!" },
    vC: { return: "[User!]!" },
    Stock: { return: "[Stock!]!" },
  },
  Stock: {
    post: { return: "Int!" },
    id: { return: "Int!" },
    createdAt: { return: "String!" },
    updatedAt: { return: "String!" },
    stock_user: { return: "User!" },
    postPost: { return: "Post!" },
  },
  Query: {
    user: { return: "User", args: [{ name: "userId", type: "Int!" }] },
    users: {
      return: "[User!]!",
      args: [{ name: "option", type: "PagingOption!" }],
    },
    post: { return: "Post", args: [{ name: "postId", type: "Int!" }] },
    posts: { return: "[Post!]!", args: [] },
    stock: { return: "Stock", args: [{ name: "id", type: "Int!" }] },
    stocks: { return: "[Stock!]!", args: [] },
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
    createStock: {
      return: "Stock!",
      args: [{ name: "stock", type: "StockCreateInput!" }],
    },
    updateStock: {
      return: "Stock!",
      args: [{ name: "stock", type: "StockUpdateInput!" }],
    },
    deleteStock: {
      return: "Boolean!",
      args: [{ name: "stock", type: "StockUpdateInput!" }],
    },
  },
  Subscription: {
    UserCreated: { return: "User!", args: [] },
    UserUpdated: { return: "User!", args: [{ name: "name", type: "String!" }] },
    StockDeleted: { return: "Stock!", args: [] },
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
  StockCreateInput: { post: { return: "Int!" }, id: { return: "Int!" } },
  UserUpdateInput: {
    uid: { return: "Int!" },
    NNN: { return: "String" },
    nick: { return: "String" },
  },
  PostUpdateInput: {
    pid: { return: "Int!" },
    uId: { return: "Int" },
    title: { return: "String" },
  },
  StockUpdateInput: { id: { return: "Int!" }, post: { return: "Int" } },
};
