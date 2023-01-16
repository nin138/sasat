import {
  ObjectLiteral,
  PropertyAssignment,
  tsg,
} from '../../../../tsg/index.js';
import { nonNullableFilter } from '../../../../util/type.js';

export type TypeFieldDefinition = {
  return: string;
  args?: { name: string; type: string }[];
};

export const typeFieldDefinitionToTsg = (
  def: TypeFieldDefinition,
): ObjectLiteral => {
  const properties: (PropertyAssignment | null)[] = [
    tsg.propertyAssign('return', tsg.string(def.return)),
    def.args
      ? tsg.propertyAssign(
          'args',
          tsg.array(
            def.args.map(it => {
              return tsg.object(
                tsg.propertyAssign('name', tsg.string(it.name)),
                tsg.propertyAssign('type', tsg.string(it.type)),
              );
            }),
          ),
        )
      : null,
  ];
  return tsg.object(...properties.filter(nonNullableFilter));
};
