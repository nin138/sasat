import { TsFile, TsStatement, tsg } from '../../tsg/index.js';
import { EntityNode } from '../../parser/node/entityNode.js';

export class EntityGenerator {
  constructor(private node: EntityNode) {}

  generate(): TsFile {
    return new TsFile(
      this.entity(),
      this.creatable(),
      this.identifiable(),
    ).disableEsLint();
  }

  private entity(): TsStatement {
    return tsg
      .typeAlias(
        this.node.entityName.name,
        tsg.typeLiteral(this.node.fields.map(it => it.toPropertySignature())),
      )
      .export();
  }
  private creatable(): TsStatement {
    const onCreateRequiredFields = this.node.onCreateRequiredFields();
    return tsg
      .typeAlias(
        this.node.entityName.creatableInterface(),
        onCreateRequiredFields.length === 0
          ? tsg.typeRef(this.node.entityName.name).partial()
          : tsg.intersectionType(
              tsg.typeLiteral(
                this.node
                  .onCreateRequiredFields()
                  .map(it => it.toPropertySignature()),
              ),
              tsg.typeRef(this.node.entityName.name).partial(),
            ),
      )
      .export();
  }
  private identifiable(): TsStatement {
    return tsg
      .typeAlias(
        this.node.entityName.identifiableInterfaceName(),
        tsg.typeLiteral(
          this.node.identifiableFields().map(it => it.toPropertySignature()),
        ),
      )
      .export();
  }
}
