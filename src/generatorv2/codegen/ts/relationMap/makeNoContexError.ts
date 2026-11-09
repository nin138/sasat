import { type IfStatement, tsg } from "../../../../tsg/index.js";
import type {
  JoinConditionNode,
  JoinConditionRangeValue,
  JoinConditionValue,
} from "../../../nodes/JoinConditionNode.js";
import type { QueryConditionValue } from "../../../nodes/QueryConditionNode.js";

const makeJoinRangeConditionThrowExpressions = (
  cv: JoinConditionRangeValue,
): (IfStatement | null)[] => {
  if (cv.kind === "range") {
    const result = [];
    if (cv.begin.kind === "context")
      result.push(makeJoinConditionThrowExpressions(cv.begin));
    if (cv.end.kind === "context")
      result.push(makeJoinConditionThrowExpressions(cv.end));
    return result;
  }
  return [];
};

export const makeJoinConditionThrowExpressions = (
  cv: JoinConditionValue | QueryConditionValue,
  contextName = "arg.context",
) => {
  if (cv.kind !== "context") return null;
  if (cv.onNotDefined.action !== "error") return null;
  return tsg.if(
    tsg.binary(
      tsg.identifier(`!${contextName}`),
      "||",
      tsg.binary(
        tsg.identifier(contextName).property(cv.field),
        "===",
        tsg.identifier("undefined"),
      ),
    ),
    tsg.throw(
      tsg.new(tsg.identifier("Error"), tsg.string(cv.onNotDefined.message)),
    ),
  );
};

export const makeThrowExpressions = (condition: JoinConditionNode) => {
  if (condition.kind === "custom") return [];
  if (condition.kind === "isNull")
    return [makeJoinConditionThrowExpressions(condition.value)];
  if (condition.operator === "BETWEEN") {
    return [
      makeJoinConditionThrowExpressions(condition.left),
      ...(condition.right.kind === "range"
        ? makeJoinRangeConditionThrowExpressions(condition.right)
        : []),
    ];
  }
  if (condition.operator === "IN") {
    return [
      makeJoinConditionThrowExpressions(condition.left),
      ...condition.right.map((value) =>
        makeJoinConditionThrowExpressions(value),
      ),
    ];
  }
  return [
    makeJoinConditionThrowExpressions(condition.left),
    makeJoinConditionThrowExpressions(condition.right),
  ];
};
