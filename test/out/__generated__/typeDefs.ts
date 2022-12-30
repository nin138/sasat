/* eslint-disable */
export const typeDefs = {
  User: [
    "uid: Int!",
    "NNN: String!",
    "nick: String",
    "createdAt: String!",
    "updatedAt: String!",
    "hogePost: [Post!]!",
  ],
  Post: ["userId: Int!", "pid: Int!", "title: String!", "hoge: User!"],
  Query: [
    "user(userId: Int!): User",
    "users(option: PagingOption!): [User!]!",
    "post(postId: Int!): Post",
    "posts: [Post!]!",
  ],
  Mutation: [
    "createUser(User: UserCreateInput!): User!",
    "updateUser(User: UserUpdateInput!): Boolean!",
    "createPost(Post: PostCreateInput!): Post!",
    "updatePost(Post: PostUpdateInput!): Post!",
  ],
  Subscription: ["UserCreated: User!", "UserUpdated(name: String!): User!"],
};
export const inputs = {
  PagingOption: [
    "numberOfItem: Int!",
    "offset: Int",
    "order: String",
    "asc: Boolean",
  ],
  UserCreateInput: ["NNN: String", "nick: String"],
  PostCreateInput: ["userId: Int!", "title: String!"],
  UserUpdateInput: ["uid: Int!"],
  PostUpdateInput: ["pid: Int!"],
};
