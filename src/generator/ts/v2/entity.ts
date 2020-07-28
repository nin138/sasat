import { EntityNode } from '../../../generatable/entity';
import { TsInterface } from './code/node/interface';
import { TsStatement } from './code/abstruct/statement';
import { TypeAliasDeclaration } from './code/node/type/typeAliasDeclaration';
import {
  creatableInterfaceName,
  identifiableInterfaceName,
} from '../../../constants/interfaceConstants';
import { IntersectionType } from './code/node/type/intersectionType';
import { TypeLiteral } from './code/node/type/typeLiteral';
import { TypeReference } from './code/node/type/typeReference';
import { TsFile } from './file';

export class TsEntityGenerator {
  constructor(private node: EntityNode) {}

  generate() {
    return new TsFile(
      this.entity(),
      this.creatable(),
      this.identifiable(),
    ).toTsString();
  }

  private entity(): TsStatement {
    return new TsInterface(this.node.entityName).addProperties(
      this.node.fields.map(it => it.toPropertySignature()),
    );
  }
  private creatable(): TsStatement {
    return new TypeAliasDeclaration(
      creatableInterfaceName(this.node.entityName),
      new IntersectionType([
        new TypeLiteral(
          this.node
            .onCreateRequiredFields()
            .map(it => it.toPropertySignature()),
        ),
        new TypeReference(this.node.entityName).partial(),
      ]),
    );
  }
  private identifiable(): TsStatement {
    return new TsInterface(identifiableInterfaceName(this.node.entityName))
      .addProperties(
        this.node.identifiableFields().map(it => it.toPropertySignature()),
      )
      .export();
  }
}
