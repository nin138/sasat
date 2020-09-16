import { ParameterNode } from './parameterNode';
import { TypeNode } from './typeNode';
import { capitalizeFirstLetter } from '../../util/stringUtil';

export class FindMethodNode {
  static paramsToName(...params: string[]): string {
    return 'findBy' + params.map(capitalizeFirstLetter).join('And');
  }
  readonly name: string;
  constructor(
    readonly params: ParameterNode[],
    readonly returnType: TypeNode, // TODO fix
    readonly isPrimary: boolean,
  ) {
    this.name = FindMethodNode.paramsToName(...params.map(it => it.name));
  }
}
