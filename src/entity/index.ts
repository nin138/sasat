export interface Index {
  constraintName: string;
  columns: string[];
}

export class DBIndex implements Index {
  readonly constraintName: string;
  constructor(readonly tableName: string, readonly columns: string[]) {
    this.constraintName = this.toConstraintName(columns);
  }

  private toConstraintName(columns: string[]): string {
    return `index_${this.tableName}__${columns.join('_')}`;
  }

  addSql() {
    return `ALTER TABLE ${this.tableName} ADD INDEX ${this.constraintName}(${this.columns.join(',')})`;
  }

  dropSql() {
    return `DROP INDEX ${this.constraintName} ON ${this.tableName}`;
  }
}
