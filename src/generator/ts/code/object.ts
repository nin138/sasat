import { tsValueString } from './value';

export class TsCodeGenObject {
  private obj: { [key: string]: string } = {};
  set(key: string, value: string) {
    this.obj[key] = value;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formatSet(key: string, value: any) {
    this.set(key, tsValueString(value));
  }

  toTsString() {
    return `{ ${Object.entries(this.obj)
      .map(([key, value]: [string, string]) => `${key}: ${value}`)
      .join(',')} }`;
  }
}
