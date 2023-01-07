/* eslint-disable */
import {
  QExpr,
  BooleanValueExpression,
  getDayRangeQExpr,
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
            QExpr.field(arg.childTableAlias, "uId"),
            "=",
            arg.parentTableAlias
              ? QExpr.field(arg.parentTableAlias, "userId")
              : QExpr.value(arg.parent?.userId)
          )
        );
      },
      array: true,
      nullable: false,
      requiredColumns: ["uId"],
    },
    stock_userStock: {
      table: "stock",
      condition: (arg): BooleanValueExpression => {
        return QExpr.conditions.and(
          QExpr.conditions.comparison(
            QExpr.field(arg.childTableAlias, "user"),
            "=",
            arg.parentTableAlias
              ? QExpr.field(arg.parentTableAlias, "userId")
              : QExpr.value(arg.parent?.userId)
          )
        );
      },
      array: true,
      nullable: false,
      requiredColumns: ["user"],
    },
    vP: {
      table: "post",
      condition: (arg): BooleanValueExpression => {
        return QExpr.conditions.and(
          QExpr.conditions.between(
            arg.parentTableAlias
              ? QExpr.field(arg.parentTableAlias, "createdAt")
              : QExpr.value(arg.parent?.createdAt),
            ...getDayRangeQExpr(new Date(), undefined)
          )
        );
      },
      array: true,
      nullable: false,
      requiredColumns: [],
    },
  },
  post: {
    pUser: {
      table: "user",
      condition: (arg): BooleanValueExpression => {
        return QExpr.conditions.and(
          QExpr.conditions.comparison(
            QExpr.field(arg.childTableAlias, "userId"),
            "=",
            arg.parentTableAlias
              ? QExpr.field(arg.parentTableAlias, "uId")
              : QExpr.value(arg.parent?.uId)
          )
        );
      },
      array: false,
      nullable: false,
      requiredColumns: [],
    },
    vC: {
      table: "user",
      condition: (arg): BooleanValueExpression => {
        return QExpr.conditions.and(
          QExpr.conditions.between(
            QExpr.field(arg.childTableAlias, "createdAt"),
            ...getDayRangeQExpr(new Date(), undefined)
          )
        );
      },
      array: true,
      nullable: false,
      requiredColumns: ["createdAt"],
    },
    Stock: {
      table: "stock",
      condition: (arg): BooleanValueExpression => {
        return QExpr.conditions.and(
          QExpr.conditions.comparison(
            QExpr.field(arg.childTableAlias, "post"),
            "=",
            arg.parentTableAlias
              ? QExpr.field(arg.parentTableAlias, "postId")
              : QExpr.value(arg.parent?.postId)
          )
        );
      },
      array: true,
      nullable: false,
      requiredColumns: ["post"],
    },
  },
  stock: {
    stock_user: {
      table: "user",
      condition: (arg): BooleanValueExpression => {
        return QExpr.conditions.and(
          QExpr.conditions.comparison(
            QExpr.field(arg.childTableAlias, "userId"),
            "=",
            arg.parentTableAlias
              ? QExpr.field(arg.parentTableAlias, "user")
              : QExpr.value(arg.parent?.user)
          )
        );
      },
      array: false,
      nullable: false,
      requiredColumns: [],
    },
    postPost: {
      table: "post",
      condition: (arg): BooleanValueExpression => {
        return QExpr.conditions.and(
          QExpr.conditions.comparison(
            QExpr.field(arg.childTableAlias, "postId"),
            "=",
            arg.parentTableAlias
              ? QExpr.field(arg.parentTableAlias, "post")
              : QExpr.value(arg.parent?.post)
          )
        );
      },
      array: false,
      nullable: false,
      requiredColumns: [],
    },
  },
};
export const tableInfo: TableInfo = {
  user: {
    identifiableKeys: ["userId"],
    identifiableFields: ["uid"],
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
    identifiableFields: ["pid"],
    columnMap: { uId: "uId", pid: "postId", title: "title" },
  },
  stock: {
    identifiableKeys: ["id"],
    identifiableFields: ["id"],
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
  vP: Array<EntityResult<PostWithRelations, PostIdentifiable>>;
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
