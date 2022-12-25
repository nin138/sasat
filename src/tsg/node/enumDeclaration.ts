import { ExportableDeclaration } from '../abstruct/exportableDeclaration.js';
import { EnumMember } from './enumMember.js';
import { Identifier } from './expressions.js';

export class EnumDeclaration extends ExportableDeclaration {
  constructor(
    private readonly identifier: Identifier,
    private readonly members: EnumMember[],
  ) {
    super();
    this.mergeImport(identifier, ...members);
  }

  addMembers(...members: EnumMember[]): this {
    this.members.push(...members);
    this.mergeImport(...members);
    return this;
  }

  protected toTsString(): string {
    return `enum ${this.identifier}{${this.members
      .map(it => it.toString() + ',')
      .join('')}}`;
  }
}
