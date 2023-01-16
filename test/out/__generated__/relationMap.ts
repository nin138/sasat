/* eslint-disable */
import {
  QExpr,
  BooleanValueExpression,
  getDayRangeQExpr,
  RelationMap,
  TableInfo,
  EntityResult,
} from "sasat";
import { hoge } from "../conditions.js";
import { GQLContext } from "../context.js";
import { PostIdentifiable, Post } from "./entities/Post.js";
import { User, UserIdentifiable } from "./entities/User.js";
import { Stock, StockIdentifiable } from "./entities/Stock.js";
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
      requiredColumns: [],
    },
    vP: {
      table: "post",
      condition: (arg): BooleanValueExpression => {
        return QExpr.conditions.and(
          hoge(arg),
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
      requiredColumns: ["createdAt"],
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
      requiredColumns: ["uId"],
    },
    vC: {
      table: "user",
      condition: (arg): BooleanValueExpression => {
        return QExpr.conditions.and(
          hoge(arg),
          QExpr.conditions.between(
            QExpr.field(arg.childTableAlias, "createdAt"),
            ...getDayRangeQExpr(new Date(), undefined)
          )
        );
      },
      array: true,
      nullable: false,
      requiredColumns: [],
    },
  },
  stock: {},
};
export const tableInfo: TableInfo = {
  user: {
    identifiableKeys: ["userId"],
    identifiableFields: ["userId"],
    columnMap: {
      userId: "userId",
      NNN: "name",
      nick: "nickName",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
  post: {
    identifiableKeys: ["postId"],
    identifiableFields: ["pid"],
    columnMap: { pid: "postId", uId: "uId", title: "title" },
  },
  stock: {
    identifiableKeys: ["id"],
    identifiableFields: ["id"],
    columnMap: {
      id: "id",
      user: "user",
      post: "post",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
};
export type UserRelations = {
  uPost: Array<EntityResult<PostWithRelations, PostIdentifiable>>;
  vP: Array<EntityResult<PostWithRelations, PostIdentifiable>>;
};
export type UserWithRelations = User & UserRelations;
export type UserResult = EntityResult<UserWithRelations, UserIdentifiable>;
export type PostRelations = {
  pUser: EntityResult<UserWithRelations, UserRelations>;
  vC: EntityResult<UserWithRelations, UserRelations>;
};
export type PostWithRelations = Post & PostRelations;
export type PostResult = EntityResult<PostWithRelations, PostIdentifiable>;
export type StockRelations = Record<never, never>;
export type StockWithRelations = Stock & StockRelations;
export type StockResult = EntityResult<StockWithRelations, StockIdentifiable>;
