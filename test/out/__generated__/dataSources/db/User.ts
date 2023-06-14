/* eslint-disable */
import { UserWithRelations } from "../../relationMap.js";
import {
  UserIdentifiable,
  User,
  UserCreatable,
  UserUpdatable,
} from "../../entities/User.js";
import { UserFields } from "../../fields.js";
import { BaseDBDataSource } from "../../../baseDBDataSource.js";
import { getCurrentDateTimeString, QueryOptions, QExpr } from "sasat";
import { GQLContext } from "../../../context.js";
type QueryResult = Partial<UserWithRelations> & UserIdentifiable;
export abstract class GeneratedUserDBDataSource extends BaseDBDataSource<
  User,
  UserIdentifiable,
  UserCreatable,
  UserUpdatable,
  UserFields,
  QueryResult
> {
  readonly tableName: string = "user";
  readonly fields: Array<string> = [
    "userId",
    "NNN",
    "nick",
    "createdAt",
    "updatedAt",
    "foo",
  ];
  protected readonly primaryKeys: Array<string> = ["userId"];
  protected readonly identifyFields: Array<string> = ["userId"];
  protected readonly autoIncrementColumn?: string | undefined = "userId";
  protected getDefaultValueString(): Pick<
    User,
    "NNN" | "createdAt" | "updatedAt" | "foo"
  > {
    return {
      NNN: "no name",
      createdAt: getCurrentDateTimeString(),
      updatedAt: getCurrentDateTimeString(),
      foo: "www",
    };
  }
  findByUserId(
    userId: number,
    fields?: UserFields,
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
            QExpr.field(tableName, "userId"),
            QExpr.value(userId)
          ),
          options?.where
        ),
      },
      context
    );
  }
}
