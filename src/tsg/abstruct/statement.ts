import { TsCode } from "./tsCode.js";

export abstract class TsStatement extends TsCode {
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: <>
  private readonly codeType = "statement";
}
