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
import { FieldNode } from '../../../generatable/field';
import { PropertySignature } from './code/node/propertySignature';
import { TsFile } from './file';

export class TsEntityGenerator {
  constructor(private node: EntityNode) {}

  generate() {
    return new TsFile([
      this.entity(),
      this.creatable(),
      this.identifiable(),
    ]).toTsString();
  }

  private entity(): TsStatement {
    return new TsInterface(this.node.entityName).addProperties(
      this.node.fields.map(this.fieldToProperty),
    );
  }
  private creatable(): TsStatement {
    return new TypeAliasDeclaration(
      creatableInterfaceName(this.node.entityName),
      new IntersectionType([
        new TypeLiteral(
          this.node.onCreateRequiredFields().map(this.fieldToProperty),
        ),
        new TypeReference(this.node.entityName).partial(),
      ]),
    );
  }
  private identifiable(): TsStatement {
    return new TsInterface(identifiableInterfaceName(this.node.entityName))
      .addProperties(this.node.identifiableFields().map(this.fieldToProperty))
      .export();
  }

  private fieldToProperty(field: FieldNode) {
    return new PropertySignature(field.fieldName, field.tsType(), false, true);
  }
}
