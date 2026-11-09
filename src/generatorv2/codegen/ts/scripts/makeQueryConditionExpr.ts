import { tsg } from "../../../../tsg/index.js";
import type { QueryConditionNode } from "../../../nodes/QueryConditionNode.js";
import { makeConditionValueQExpr } from "./makeConditonValueExpr.js";

const qExpr = tsg.identifier("qe").importFrom("sasat");

export const makeQueryConditionExpr = (condition: QueryConditionNode) => {
  const value = (cv: Parameters<typeof makeConditionValueQExpr>[0]) =>
    makeConditionValueQExpr(cv, tsg.identifier("context?"));
  if (condition.kind === "between") {
    return qExpr
      .property("between")
      .call(
        value(condition.left),
        value(condition.begin),
        value(condition.end),
      );
  }
  return qExpr
    .property("comparison")
    .call(
      value(condition.left),
      tsg.string(condition.operator),
      value(condition.right),
    );
};
