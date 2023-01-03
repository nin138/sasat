/* eslint-disable */
import {
  QExpr,
  BooleanValueExpression,
  RelationMap,
  TableInfo,
  EntityResult,
} from "sasat";
import { GQLContext } from "../context.js";
import { PostIdentifiable, Post } from "./entities/Post.js";
import { StockIdentifiable, Stock } from "./entities/Stock.js";
import { User, UserIdentifiable } from "./entities/User.js";
export const relationMap: RelationMap<GQLContext> = {
  user: {
    uPost: {
      table: "post",
      condition: (arg): BooleanValueExpression => {
        return QExpr.conditions.and(
          QExpr.conditions.comparison(
            arg.parentTableAlias
              ? QExpr.field(arg.parentTableAlias, "userId")
              : QExpr.value(arg.parent?.userId),
            "=",
            QExpr.field(arg.childTableAlias, "uId")
          )
        );
      },
      relation: "Many",
    },
    stock_userStock: {
      table: "stock",
      condition: (arg): BooleanValueExpression => {
        return QExpr.conditions.and(
          QExpr.conditions.comparison(
            arg.parentTableAlias
              ? QExpr.field(arg.parentTableAlias, "userId")
              : QExpr.value(arg.parent?.userId),
            "=",
            QExpr.field(arg.childTableAlias, "user")
          )
        );
      },
      relation: "Many",
    },
  },
  post: {
    pUser: {
      table: "user",
      condition: (arg): BooleanValueExpression => {
        return QExpr.conditions.and(
          QExpr.conditions.comparison(
            arg.parentTableAlias
              ? QExpr.field(arg.parentTableAlias, "uId")
              : QExpr.value(arg.parent?.uId),
            "=",
            QExpr.field(arg.childTableAlias, "userId")
          )
        );
      },
      relation: "One",
    },
    vC: {
      table: "user",
      condition: (arg): BooleanValueExpression => {
        return QExpr.conditions.and(
          QExpr.conditions.comparison(
            arg.parentTableAlias
              ? QExpr.field(arg.parentTableAlias, "uid")
              : QExpr.value(arg.parent?.uid),
            "=",
            QExpr.value(arg.context?.vv || "ww")
          )
        );
      },
      relation: "One",
    },
    Stock: {
      table: "stock",
      condition: (arg): BooleanValueExpression => {
        return QExpr.conditions.and(
          QExpr.conditions.comparison(
            arg.parentTableAlias
              ? QExpr.field(arg.parentTableAlias, "postId")
              : QExpr.value(arg.parent?.postId),
            "=",
            QExpr.field(arg.childTableAlias, "post")
          )
        );
      },
      relation: "Many",
    },
  },
  stock: {
    stock_user: {
      table: "user",
      condition: (arg): BooleanValueExpression => {
        return QExpr.conditions.and(
          QExpr.conditions.comparison(
            arg.parentTableAlias
              ? QExpr.field(arg.parentTableAlias, "user")
              : QExpr.value(arg.parent?.user),
            "=",
            QExpr.field(arg.childTableAlias, "userId")
          )
        );
      },
      relation: "One",
    },
    postPost: {
      table: "post",
      condition: (arg): BooleanValueExpression => {
        return QExpr.conditions.and(
          QExpr.conditions.comparison(
            arg.parentTableAlias
              ? QExpr.field(arg.parentTableAlias, "post")
              : QExpr.value(arg.parent?.post),
            "=",
            QExpr.field(arg.childTableAlias, "postId")
          )
        );
      },
      relation: "One",
    },
  },
};
export const tableInfo: TableInfo = {
  user: {
    identifiableKeys: ["userId"],
    columnMap: {
      uid: "userId",
      NNN: "name",
      nick: "nickName",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
  post: {
    identifiableKeys: ["postId"],
    columnMap: { uId: "uId", pid: "postId", title: "title" },
  },
  stock: {
    identifiableKeys: ["id"],
    columnMap: {
      user: "user",
      post: "post",
      id: "id",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
};
export type UserRelations = {
  uPost: Array<EntityResult<PostWithRelations, PostIdentifiable>>;
  stock_userStock: Array<EntityResult<StockWithRelations, StockIdentifiable>>;
};
export type UserWithRelations = User & UserRelations;
export type UserResult = EntityResult<UserWithRelations, UserIdentifiable>;
export type PostRelations = {
  pUser: EntityResult<UserWithRelations, UserRelations>;
  vC: EntityResult<UserWithRelations, UserRelations>;
  Stock: Array<EntityResult<StockWithRelations, StockIdentifiable>>;
};
export type PostWithRelations = Post & PostRelations;
export type PostResult = EntityResult<PostWithRelations, PostIdentifiable>;
export type StockRelations = {
  stock_user: EntityResult<UserWithRelations, UserRelations>;
  postPost: EntityResult<PostWithRelations, PostRelations>;
};
export type StockWithRelations = Stock & StockRelations;
export type StockResult = EntityResult<StockWithRelations, StockIdentifiable>;
