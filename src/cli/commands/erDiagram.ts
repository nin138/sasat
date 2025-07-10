import { getCurrentStore } from '../commands/getCurrentStore.js';
import { config } from '../../config/config.js';
import fs from 'fs';
import { Directory } from '../../generatorv2/directory.js';
import { Relation } from '../../migration/data/relation.js';
import { DataStoreHandler } from '../../migration/dataStore.js';
import {
  BaseColumn,
  ReferenceColumn,
} from '../../migration/serializable/column.js';
import { TableHandler } from '../../migration/serializable/table.js';
import path from 'path';
import { Console } from '../console.js';

export const writeDiagram = async (): Promise<void> => {
  try {
    const store = new DataStoreHandler(await getCurrentStore());

    const entities = store.tables.map(it => processTable(store, it));
    const result = `erDiagram
${entities.join('\n')}
`;
    fs.writeFileSync(
      path.join(
        config().migration.out,
        Directory.paths.GENERATED,
        'er-diagram.mermaid',
      ),
      result,
    );
  } catch (e) {
    Console.error((e as Error).message);
    throw e;
  }
};

function getRefType(parent: BaseColumn, rel: Relation) {
  // |o	o|	Zero or one
  //   ||	||	Exactly one
  // }o	o{	Zero or more (no upper limit)
  // }|	|{	One or more (no upper limit)
  const left = parent.isNullable() ? '|o' : '||';

  const getRight = () => {
    switch (rel) {
      case 'One':
        return '||';
      case 'Many':
        return 'o{';
      case 'OneOrZero':
        return '|o';
    }
  };

  return `${left} -- ${getRight()}`;
}

function processTable(store: DataStoreHandler, table: TableHandler) {
  const rel = table.columns
    .filter(it => it.isReference())
    .map(it => {
      const rel = it as ReferenceColumn;
      const ref = rel.data.reference;
      const parent = store.table(ref.parentTable).column(ref.parentColumn);
      return `${ref.parentTable} ${getRefType(parent, ref.relation)} ${table.tableName} : ${
        ref.relationName ??
        `"${rel.data.reference.parentTable}__${rel.table.tableName}"`
      }`;
    });
  return `${table.tableName} {
${table.columns.map(it => `  ${it.columnName()} ${it.dataType()}`).join('\n')}
}
${rel.join('\n')}
`;
}
