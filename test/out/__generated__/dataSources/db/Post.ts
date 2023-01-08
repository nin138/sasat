/* eslint-disable */
import { PostWithRelations } from "../../relationMap.js";
import {
  PostIdentifiable,
  Post,
  PostCreatable,
  PostUpdatable,
} from "../../entities/Post.js";
import { PostFields } from "../../fields.js";
import { BaseDBDataSource } from "../../../baseDBDataSource.js";
import { QueryOptions, QExpr } from "sasat";
import { GQLContext } from "../../../context.js";
type QueryResult = Partial<PostWithRelations> & PostIdentifiable;
export abstract class GeneratedPostDBDataSource extends BaseDBDataSource<
  Post,
  PostIdentifiable,
  PostCreatable,
  PostUpdatable,
  PostFields,
  QueryResult
> {
  readonly tableName: string = "post";
  readonly fields: Array<string> = ["pid", "uId", "title"];
  protected readonly primaryKeys: Array<string> = ["postId"];
  protected readonly identifyFields: Array<string> = ["pid"];
  protected readonly autoIncrementColumn?: string | undefined = "pid";
  protected getDefaultValueString(): Record<string, never> {
    return {};
  }
  findByPid(
    pid: number,
    fields?: PostFields,
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
            QExpr.field(tableName, "postId"),
            QExpr.value(pid)
          ),
          options?.where
        ),
      },
      context
    );
  }
}
