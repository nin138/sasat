import { TsFile } from './file';
import { EntityNode } from '../../node/entityNode';
import { tsg } from './code/factory';
import { RootNode } from '../../node/rootNode';
import { Relation } from '../..';

export class RelationMapGenerator {
  generate(root: RootNode): TsFile {
    return new TsFile(this.relationMap(root), this.identifiableKeyMap(root), this.resolveFunc());
  }

  private relationMap(root: RootNode) {
    return tsg
      .variable(
        'const',
        tsg.identifier('relationMap'),
        tsg.object(...root.entities().map(it => this.entityRelation(it))),
        tsg.typeRef(
          `{[from: string]: {[to: string]: {table: string, on: [string, '=' | '>' | '<' | '>=' | '<=' | '<>', string], relation: 'One' | 'OneOrZero' |'Many'}}}`,
        ),
      )
      .export();
  }

  private identifiableKeyMap(root: RootNode) {
    return tsg
      .variable(
        'const',
        'identifiableKeyMap',
        tsg.object(
          ...root.repositories.map(it => tsg.propertyAssign(it.tableName, tsg.array(it.primaryKeys.map(tsg.string)))),
        ),
        tsg.typeRef('Record<string, string[]>'),
      )
      .export();
  }

  private resolveFunc() {
    return tsg
      .variable(
        'const',
        tsg.identifier('resolveField'),
        tsg
          .identifier('createFieldResolver')
          .importFrom('sasat')
          .call(tsg.identifier('relationMap'), tsg.identifier('identifiableKeyMap')),
      )
      .export();
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
                tsg.array([tsg.array([tsg.string(rel.fromColumn), tsg.string('='), tsg.string(rel.toColumn)])]),
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
                  tsg.array([tsg.array([tsg.string(rel.toColumn), tsg.string('='), tsg.string(rel.fromColumn)])]),
                ),
                tsg.propertyAssign('relation', tsg.string(Relation.One)),
              ),
            ),
          ),
      ),
    );
  }
}
