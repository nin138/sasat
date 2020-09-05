import { TsFile } from './file';
import { EntityNode } from '../../node/entityNode';
import { tsg } from './code/factory';
import { RootNode } from '../../node/rootNode';
import { Relation } from '../..';
import { KeywordTypeNode } from './code/node/type/typeKeyword';
import { RawCodeStatement } from './code/node/rawCodeStatement';

export class RelationMapGenerator {
  generate(root: RootNode): TsFile {
    return new TsFile(
      tsg
        .variable(
          'const',
          tsg.identifier('relationMap'),
          tsg.object(...root.entities().map(it => this.entityRelation(it))),
          tsg
            .typeRef(
              '{[from: string]: {[to: string]: {table: string, on: [string, ComparisonOperators, string], relation: Relation}}}',
            )
            .addImport(['ComparisonOperators'], 'sasat'),
        )
        .export(),
      tsg.typeAlias(
        'Field',
        tsg.typeLiteral([
          tsg.propertySignature('fields', tsg.typeRef('any[]')),
          tsg.propertySignature('relations', tsg.typeRef('Record<string, Field>')),
        ]),
      ),
      tsg.variable('const', tsg.identifier('resolveField'), this.resolveFunc()).export(),
    );
  }

  private resolveFunc() {
    return tsg.arrowFunc(
      [
        tsg.parameter('field', tsg.typeRef('Field')),
        tsg.parameter('from', KeywordTypeNode.string),
        tsg.parameter('depth', tsg.typeRef('number')),
      ],
      tsg.typeRef('{ select: string[], join: SQLJoin<unknown, unknown, unknown>[] }'),
      tsg.block(
        new RawCodeStatement(`\
const select: string[] = f.fields.map(it => \`t\${depth}.\${it}\`);
//    const join: SQLJoin<unknown, any, any>[] = [];
    Object.entries(f.relations).forEach(([rel, field]: [string, Field]) => {
      field.relations
      const data = relationMap[from][rel];
      join.push({
        select: field.fields,
        table: data.table,
        on: [[['t' + depth ,data.on[0]], data.on[1], ['t' + (depth + 1), data.on[2]]]],
      });
      const r = ftoJoin(field, data.table, depth + 1);
      select.push(...r.select);
      join.push(...r.join);
    });

    return  {
      select,
      join,
    };
`),
      ),
    );
  }

  private entityRelation(node: EntityNode) {
    return tsg.propertyAssign(
      node.repository.tableName,
      tsg.object(
        ...node.relations.map(rel =>
          tsg.propertyAssign(
            rel.refPropertyName(),
            tsg.object(
              tsg.propertyAssign('table', tsg.string(rel.toTableName)),
              tsg.propertyAssign(
                'on',
                tsg.array([tsg.string(rel.fromColumn), tsg.string('='), tsg.string(rel.toColumn)]),
              ),
              tsg.propertyAssign('relation', tsg.string(rel.relation)),
            ),
          ),
        ),
        ...node
          .findReferencedRelations()
          .map(rel =>
            tsg.propertyAssign(
              rel.refPropertyName(),
              tsg.object(
                tsg.propertyAssign('table', tsg.string(rel.parent.repository.tableName)),
                tsg.propertyAssign(
                  'on',
                  tsg.array([tsg.string(rel.toColumn), tsg.string('='), tsg.string(rel.fromColumn)]),
                ),
                tsg.propertyAssign('relation', tsg.string(Relation.One)),
              ),
            ),
          ),
      ),
    );
  }
}
