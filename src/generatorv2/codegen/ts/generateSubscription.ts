import {
  type ArrowFunction,
  KeywordTypeNode,
  TsFile,
  tsg,
  type VariableDeclaration,
} from "../../../tsg/index.js";
import { Directory } from "../../directory.js";
import type { RootNode } from "../../nodes/rootNode.js";
import type { SubscriptionFilterNode } from "../../nodes/subscriptionNode.js";
import { makeTypeRef } from "./scripts/getEntityTypeRefs.js";
import { tsFileNames } from "./tsFileNames.js";

export const generateSubscription = (root: RootNode) => {
  const subscriptionEnum = tsg
    .enum(tsg.identifier("SubscriptionName"), [])
    .export();
  const subscriptions = tsg.object();
  const publishFunctions: VariableDeclaration[] = [];

  root.subscriptions.forEach((it) => {
    subscriptionEnum.addMembers(
      tsg.enumMember(
        tsg.identifier(it.subscriptionName),
        tsg.string(it.subscriptionName),
      ),
    );
    if (it.gqlEnabled) {
      const fn =
        it.filters.length === 0
          ? makeAsyncIteratorCall(it.subscriptionName)
          : makeWithFilter(it.subscriptionName, it.filters);
      subscriptions.addProperties(
        tsg.propertyAssign(
          it.subscriptionName,
          tsg.object(tsg.propertyAssign("subscribe", fn)),
        ),
      );
    }
    publishFunctions.push(
      tsg
        .variable(
          "const",
          tsg.identifier(it.publishFunctionName),
          tsg.arrowFunc(
            [
              tsg.parameter(
                "entity",
                makeTypeRef(
                  it.entity,
                  it.mutationType === "delete" ? "identifiable" : "entity",
                  "GENERATED",
                ),
              ),
            ],
            tsg.typeRef("Promise", [KeywordTypeNode.void]),
            tsg
              .identifier("pubsub.publish")
              .call(
                tsg.identifier(`SubscriptionName.${it.subscriptionName}`),
                tsg.object(
                  tsg.propertyAssign(
                    it.subscriptionName,
                    tsg.identifier("entity"),
                  ),
                ),
              ),
          ),
        )
        .export(),
    );
  });

  return new TsFile(
    subscriptionEnum,
    tsg
      .variable("const", tsg.identifier("subscription"), subscriptions)
      .export(),
    ...publishFunctions,
  ).disableEsLint();
};

const makeAsyncIteratorCall = (event: string): ArrowFunction => {
  return tsg.arrowFunc(
    [],
    undefined,
    tsg
      .identifier("pubsub")
      .importFrom("../pubsub")
      .property("asyncIterableIterator")
      .call(tsg.array([tsg.identifier(`SubscriptionName.${event}`)])),
  );
};

const makeWithFilter = (event: string, filters: SubscriptionFilterNode[]) => {
  const hashedFilters = filters.filter((filter) => filter.hashId);
  const decoded = tsg.identifier("decoded");
  const binaryExpressions = filters
    .map((filter) => {
      const expected = filter.hashId
        ? decoded.property(filter.argument)
        : tsg.identifier("variables").property(filter.argument);
      const matches = tsg.binary(
        tsg.identifier("result").property(filter.field),
        "===",
        expected,
      );
      // An invalid hash decodes to undefined; it must not match a missing field.
      return filter.hashId
        ? tsg.binary(
            tsg.binary(expected, "!==", tsg.identifier("undefined")),
            "&&",
            matches,
          )
        : matches;
    })
    .reduce((previousValue, currentValue) =>
      tsg.binary(previousValue, "&&", currentValue),
    );

  return tsg
    .identifier("withFilter")
    .importFrom("graphql-subscriptions")
    .call(
      makeAsyncIteratorCall(event),
      tsg
        .arrowFunc(
          [
            tsg.parameter("payload", KeywordTypeNode.any),
            tsg.parameter("variables", KeywordTypeNode.any),
          ],
          tsg.typeRef("Promise", [KeywordTypeNode.boolean]),
          tsg.block(
            ...(hashedFilters.length === 0
              ? []
              : [
                  tsg.variable(
                    "const",
                    decoded,
                    tsg.object(
                      ...hashedFilters.map((filter) =>
                        tsg.propertyAssign(
                          filter.argument,
                          tsg
                            .identifier(filter.hashId!.encoder)
                            .importFrom(
                              Directory.resolve(
                                "GENERATED",
                                "BASE",
                                tsFileNames.encoder,
                              ),
                            )
                            .property("decode")
                            .call(
                              tsg
                                .identifier("variables")
                                .property(filter.argument),
                            ),
                        ),
                      ),
                    ),
                  ),
                ]),
            tsg.variable(
              "const",
              tsg.identifier("result"),
              tsg.await(tsg.identifier(`payload.${event}`)),
            ),
            tsg.return(binaryExpressions),
          ),
        )
        .toAsync(),
    );
};
