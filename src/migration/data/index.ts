import {
  createSqlGenerator,
  type SqlGenerator,
} from "../../db/sqlGenerator.js";
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

  addSql(generator: SqlGenerator = createSqlGenerator()): string {
    return generator.addIndex(this.tableName, this);
  }

  dropSql(generator: SqlGenerator = createSqlGenerator()): string {
    return generator.dropIndex(this.tableName, this);
  }
  serialize(): Index {
    return {
      constraintName: this.constraintName,
      columns: this.columns,
    };
  }
}
