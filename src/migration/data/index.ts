import { Serializable } from '../serializable/serializable.js';

export interface Index {
  constraintName: string;
  columns: string[];
}

export class DBIndex implements Index, Serializable<Index> {
  readonly constraintName: string;
  constructor(readonly tableName: string, readonly columns: string[]) {
    this.constraintName = this.toConstraintName(columns);
  }

  private toConstraintName(columns: string[]): string {
    return `index_${this.tableName}__${columns.join('_')}`;
  }

  addSql(): string {
    return `ALTER TABLE ${this.tableName} ADD INDEX ${this.constraintName}(${this.columns.join(',')})`;
  }

  dropSql(): string {
    return `DROP INDEX ${this.constraintName} ON ${this.tableName}`;
  }
  serialize(): Index {
    return {
      constraintName: this.constraintName,
      columns: this.columns,
    };
  }
}
