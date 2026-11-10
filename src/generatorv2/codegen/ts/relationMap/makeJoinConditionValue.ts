import { nonNullable } from "../../../../runtime/util.js";
import { type TsExpression, tsg } from "../../../../tsg/index.js";
import type { EntityNode } from "../../../nodes/entityNode.js";
import type {
  JoinConditionNode,
  JoinConditionRangeValue,
  JoinConditionValue,
} from "../../../nodes/JoinConditionNode.js";
import type {
  ReferencedNode,
  ReferenceNode,
} from "../../../nodes/ReferencedNode.js";
import {
  makeConditionValueQExpr,
  makeConditionValueRaw,
} from "../scripts/makeConditonValueExpr.js";
import { makeThrowExpressions } from "./makeNoContexError.js";

const qExpr = tsg.identifier("qe").importFrom("sasat");
const parentTableAlias = "parentTableAlias";
const childTableAlias = "childTableAlias";

export const makeJoinConditionValueQExpr = (
  node: EntityNode,
  cv: JoinConditionValue,
  target: EntityNode = node,
): TsExpression => {
  const arg = tsg.identifier("arg");
  switch (cv.kind) {
    case "parent": {
      const columnName =
        (
          target.fields.find((it) => it.columnName === cv.field) ??
          target.fields.find((it) => it.fieldName === cv.field)
        )?.columnName ?? cv.field;
      return qExpr
        .property("field")
        .call(arg.property(childTableAlias), tsg.string(columnName));
    }
    case "child": {
      const field =
        node.fields.find((it) => it.columnName === cv.field) ??
        node.fields.find((it) => it.fieldName === cv.field);
      const columnName = field?.columnName ?? cv.field;
      return tsg.ternary(
        arg.property(parentTableAlias),
        qExpr
          .property("field")
          .call(arg.property(parentTableAlias), tsg.string(columnName)),
        qExpr
          .property("value")
          .call(arg.property("parent?").property(field?.fieldName ?? cv.field)),
      );
    }
    default:
      return makeConditionValueQExpr(cv);
  }
};

const makeRangeCondition = (
  entity: EntityNode,
  range: JoinConditionRangeValue,
  target: EntityNode,
): TsExpression[] => {
  if (range.kind === "range") {
    return [
      makeJoinConditionValueQExpr(entity, range.begin, target),
      makeJoinConditionValueQExpr(entity, range.end, target),
    ];
  }
  return [
    tsg.spread(
      tsg
        .identifier("getDayRangeQExpr")
        .importFrom("sasat")
        .call(
          tsg.new(tsg.identifier("Date")),
          range.thresholdHour !== undefined
            ? tsg.number(range.thresholdHour)
            : tsg.identifier("undefined"),
        ),
    ),
  ];
};

const makeConditionExpr = (
  entity: EntityNode,
  condition: JoinConditionNode,
  target: EntityNode,
) => {
  if (condition.kind === "custom") {
    return tsg
      .identifier(condition.conditionName)
      .importFrom("../conditions")
      .call(tsg.identifier("arg"));
  }
  if (condition.kind === "isNull") {
    return qExpr
      .property(condition.not ? "isNotNull" : "isNull")
      .call(makeJoinConditionValueQExpr(entity, condition.value, target));
  }
  if (condition.operator === "BETWEEN") {
    return qExpr
      .property("between")
      .call(
        makeJoinConditionValueQExpr(entity, condition.left, target),
        ...makeRangeCondition(entity, condition.right, target),
      );
  }
  if (condition.operator === "IN") {
    if (
      condition.right.some(
        (value) => value.kind === "parent" || value.kind === "child",
      )
    ) {
      return qExpr
        .property("or")
        .call(
          ...condition.right.map((value) =>
            qExpr
              .property("eq")
              .call(
                makeJoinConditionValueQExpr(entity, condition.left, target),
                makeJoinConditionValueQExpr(entity, value, target),
              ),
          ),
        );
    }
    return qExpr
      .property("in")
      .call(
        makeJoinConditionValueQExpr(entity, condition.left, target),
        tsg.array(condition.right.map((it) => makeConditionValueRaw(it))),
      );
  }
  return qExpr
    .property("comparison")
    .call(
      makeJoinConditionValueQExpr(entity, condition.left, target),
      tsg.string(condition.operator),
      makeJoinConditionValueQExpr(entity, condition.right, target),
    );
};

export const makeJoinConditionValue = (
  node: EntityNode,
  ref: ReferenceNode | ReferencedNode,
  target: EntityNode = node,
) => {
  const arg = tsg.identifier("arg");

  return tsg.propertyAssign(
    "condition",
    tsg.arrowFunc(
      [tsg.parameter(arg.toString())],
      tsg.typeRef("BooleanValueExpression").importFrom("sasat"),
      tsg.block(
        ...ref.joinCondition
          .flatMap((it) => makeThrowExpressions(it))
          .filter(nonNullable),
        tsg.return(
          qExpr
            .property("and")
            .call(
              ...ref.joinCondition.map((it) =>
                makeConditionExpr(node, it, target),
              ),
            ),
        ),
      ),
    ),
  );
};
