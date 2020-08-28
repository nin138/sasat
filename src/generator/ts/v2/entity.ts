import { EntityNode } from '../../../node/entity';
import { TsInterface } from './code/node/interface';
import { TsStatement } from './code/abstruct/statement';
import { TypeAliasDeclaration } from './code/node/type/typeAliasDeclaration';
import { IntersectionType } from './code/node/type/intersectionType';
import { TypeLiteral } from './code/node/type/typeLiteral';
import { TypeReference } from './code/node/type/typeReference';
import { TsFile } from './file';

export class TsEntityGenerator {
  constructor(private node: EntityNode) {}

  generate(): TsFile {
    return new TsFile(this.entity(), this.creatable(), this.identifiable());
  }

  private entity(): TsStatement {
    return new TsInterface(this.node.entityName.name)
      .addProperties(this.node.fields.map(it => it.toPropertySignature()))
      .export();
  }
  private creatable(): TsStatement {
    return new TypeAliasDeclaration(
      this.node.entityName.creatableInterface(),
      new IntersectionType(
        new TypeLiteral(this.node.onCreateRequiredFields().map(it => it.toPropertySignature())),
        new TypeReference(this.node.entityName.name).partial(),
      ),
    ).export();
  }
  private identifiable(): TsStatement {
    return new TsInterface(this.node.entityName.identifiableInterfaceName())
      .addProperties(this.node.identifiableFields().map(it => it.toPropertySignature()))
      .export();
  }
}
