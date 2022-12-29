/* eslint-disable */
import { StockWithRelations } from "../../relationMap.js";
import {
  StockIdentifiable,
  Stock,
  StockCreatable,
} from "../../entities/Stock.js";
import { StockFields } from "../../field.js";
import { BaseDBDataSource } from "../../../baseDBDataSource.js";
import { getCurrentDateTimeString, QueryOptions, QExpr } from "sasat";
import { GQLContext } from "../../../context.js";
import { UserIdentifiable } from "../../entities/User.js";
import { PostIdentifiable } from "../../entities/Post.js";
type QueryResult = Partial<StockWithRelations> & StockIdentifiable;
export abstract class GeneratedStockDBDataSource extends BaseDBDataSource<
  Stock,
  StockCreatable,
  StockIdentifiable,
  StockFields,
  QueryResult
> {
  readonly tableName: string = "stock";
  readonly fields: Array<string> = [
    "user",
    "post",
    "id",
    "createdAt",
    "updatedAt",
  ];
  protected readonly primaryKeys: Array<string> = ["id"];
  protected readonly autoIncrementColumn?: string | undefined = undefined;
  protected getDefaultValueString(): Pick<Stock, "createdAt" | "updatedAt"> {
    return {
      createdAt: getCurrentDateTimeString(),
      updatedAt: getCurrentDateTimeString(),
    };
  }
  findById(
    id: number,
    fields?: StockFields,
    options?: Omit<QueryOptions, "offset" | "limit" | "sort">,
    context?: GQLContext
  ): Promise<QueryResult | null> {
    const tableName = fields?.tableAlias || "t0";
    return this.first(
      fields,
      {
        ...options,
        where: QExpr.conditions.and(
          QExpr.conditions.eq(QExpr.field(tableName, "id"), QExpr.value(id)),
          options?.where
        ),
      },
      context
    );
  }
  findByUser(
    user: UserIdentifiable,
    fields?: StockFields,
    options?: Omit<QueryOptions, "offset" | "limit" | "sort">,
    context?: GQLContext
  ): Promise<QueryResult | null> {
    const tableName = fields?.tableAlias || "t0";
    return this.first(
      fields,
      {
        ...options,
        where: QExpr.conditions.and(
          QExpr.conditions.eq(
            QExpr.field(tableName, "user"),
            QExpr.value(user.uid)
          ),
          options?.where
        ),
      },
      context
    );
  }
  findByPost(
    post: PostIdentifiable,
    fields?: StockFields,
    options?: Omit<QueryOptions, "offset" | "limit" | "sort">,
    context?: GQLContext
  ): Promise<QueryResult | null> {
    const tableName = fields?.tableAlias || "t0";
    return this.first(
      fields,
      {
        ...options,
        where: QExpr.conditions.and(
          QExpr.conditions.eq(
            QExpr.field(tableName, "post"),
            QExpr.value(post.pid)
          ),
          options?.where
        ),
      },
      context
    );
  }
}
