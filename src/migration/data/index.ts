import { getDialect } from "../../db/dialect.js";
import { SqlString } from "../../runtime/sql/sqlString.js";
import type { Serializable } from "../serializable/serializable.js";

export interface Index {
  constraintName: string;
  columns: string[];
}

export class DBIndex implements Index, Serializable<Index> {
  readonly constraintName: string;
  constructor(
    readonly tableName: string,
    readonly columns: string[],
  ) {
    this.constraintName = this.toConstraintName(columns);
  }

  private toConstraintName(columns: string[]): string {
    return `index_${this.tableName}__${columns.join("_")}`;
  }

  addSql(): string {
    if (getDialect() === "postgres")
      return `CREATE INDEX ${SqlString.escapeId(this.constraintName)} ON ${SqlString.escapeId(this.tableName)} (${this.columns.map(SqlString.escapeId).join(",")})`;
    return `ALTER TABLE ${this.tableName} ADD INDEX ${
      this.constraintName
    }(${this.columns.join(",")})`;
  }

  dropSql(): string {
    if (getDialect() === "postgres")
      return `DROP INDEX ${SqlString.escapeId(this.constraintName)}`;
    return `DROP INDEX ${this.constraintName} ON ${this.tableName}`;
  }
  serialize(): Index {
    return {
      constraintName: this.constraintName,
      columns: this.columns,
    };
  }
}
