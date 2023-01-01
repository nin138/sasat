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
    "uid",
    "NNN",
    "nick",
    "createdAt",
    "updatedAt",
  ];
  protected readonly primaryKeys: Array<string> = ["userId"];
  protected readonly identifyFields: Array<string> = ["uid"];
  protected readonly autoIncrementColumn?: string | undefined = "uid";
  protected getDefaultValueString(): Pick<
    User,
    "NNN" | "createdAt" | "updatedAt"
  > {
    return {
      NNN: "no name",
      createdAt: getCurrentDateTimeString(),
      updatedAt: getCurrentDateTimeString(),
    };
  }
  findByUid(
    uid: number,
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
            QExpr.value(uid)
          ),
          options?.where
        ),
      },
      context
    );
  }
}
