import { TsFile } from './file';
import { EntityNode } from '../../node/entityNode';
import { TsStatement } from './code/abstruct/statement';
import { tsg } from './code/factory';

export class EntityGenerator {
  constructor(private node: EntityNode) {}

  generate(): TsFile {
    return new TsFile(this.entity(), this.creatable(), this.identifiable());
  }

  private entity(): TsStatement {
    return tsg
      .interface(this.node.entityName.name)
      .addProperties(this.node.fields.map(it => it.toPropertySignature()))
      .export();
  }
  private creatable(): TsStatement {
    return tsg
      .typeAlias(
        this.node.entityName.creatableInterface(),
        tsg.intersectionType(
          tsg.typeLiteral(this.node.onCreateRequiredFields().map(it => it.toPropertySignature())),
          tsg.typeRef(this.node.entityName.name).partial(),
        ),
      )
      .export();
  }
  private identifiable(): TsStatement {
    return tsg
      .interface(this.node.entityName.identifiableInterfaceName())
      .addProperties(this.node.identifiableFields().map(it => it.toPropertySignature()))
      .export();
  }
}
