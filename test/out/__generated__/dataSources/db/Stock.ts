/* eslint-disable */
import { StockWithRelations } from "../../relationMap.js";
import {
  StockIdentifiable,
  Stock,
  StockCreatable,
  StockUpdatable,
} from "../../entities/Stock.js";
import { StockFields } from "../../fields.js";
import { BaseDBDataSource } from "../../../baseDBDataSource.js";
import { getCurrentDateTimeString, QueryOptions, QExpr } from "sasat";
import { GQLContext } from "../../../context.js";
type QueryResult = Partial<StockWithRelations> & StockIdentifiable;
export abstract class GeneratedStockDBDataSource extends BaseDBDataSource<
  Stock,
  StockIdentifiable,
  StockCreatable,
  StockUpdatable,
  StockFields,
  QueryResult
> {
  readonly tableName: string = "stock";
  readonly fields: Array<string> = [
    "id",
    "user",
    "post",
    "createdAt",
    "updatedAt",
  ];
  protected readonly primaryKeys: Array<string> = ["id"];
  protected readonly identifyFields: Array<string> = ["id"];
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
    context?: GQLContext,
  ): Promise<QueryResult | null> {
    const tableName = fields?.tableAlias || "t0";
    return this.first(
      fields,
      {
        ...options,
        where: QExpr.conditions.and(
          QExpr.conditions.eq(QExpr.field(tableName, "id"), QExpr.value(id)),
          options?.where,
        ),
      },
      context,
    );
  }
}
