import { tsValueString } from './value';

type Obj = { [key: string]: string | Obj };

export class TsCodeGenNestedObject {
  private obj: Obj = {};

  set(path: string[], value: string) {
    let target = this.obj;
    for (let i = 0; i < path.length - 1; i++) {
      if (!target[path[i]]) {
        target[path[i]] = {};
      }
      target = target[path[i]] as Obj;
    }
    target[path.pop()!] = value;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formatSet(path: string[], value: any) {
    this.set(path, tsValueString(value));
  }

  private objToTsString(obj: Obj): string {
    return `{ ${Object.entries(obj)
      .map(([key, value]) => `${key}: ${typeof value !== 'string' ? this.objToTsString(obj[key] as Obj) : value}`)
      .join(',')} }`;
  }

  toTsString() {
    return this.objToTsString(this.obj);
  }
}
