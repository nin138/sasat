import { nonNullable } from "../../../runtime/util.js";
import {
  type Block,
  type Identifier,
  KeywordTypeNode,
  NumericLiteral,
  type PropertyAssignment,
  TsFile,
  type TsStatement,
  tsg,
} from "../../../tsg/index.js";
import { Directory } from "../../directory.js";
import type { ContextField, MutationNode } from "../../nodes/mutationNode.js";
import type { RootNode } from "../../nodes/rootNode.js";
import { makeFindQueryName, publishFunctionName } from "../names.js";
import { makeMutationMiddlewareAndTypes } from "./mutation/makeMutationInputDecoder.js";
import { makeTypeRef } from "./scripts/getEntityTypeRefs.js";
import { makeDatasource } from "./scripts/makeDatasource.js";

export const generateMutationResolver = (root: RootNode) => {
  return new TsFile(
    ...root.entities.flatMap(makeMutationMiddlewareAndTypes).flat(),
    tsg
      .variable(
        "const",
        "mutation",
        tsg.object(
          ...root.entities.flatMap((it) => it.mutations).map(makeMutation),
        ),
      )
      .export(),
  ).disableEsLint();
};

const result = tsg.identifier("result");
const refetched = tsg.identifier("fetched");
const ds = tsg.identifier("ds");
const ident = tsg.identifier("identifiable");

const makeMutation = (node: MutationNode): PropertyAssignment => {
  return tsg.propertyAssign(
    node.mutationName,
    makeResolver
      .call(
        tsg
          .arrowFunc(makeResolverArgs(node), undefined, makeMutationBody(node))
          .toAsync(),
        tsg.identifier(node.mutationName + "Middleware"),
      )
      .typeArgs(
        ...[
          context,
          tsg.typeRef(node.inputName),
          node.requireIdDecodeMiddleware
            ? tsg.typeRef("GQL" + node.inputName)
            : null,
        ].filter(nonNullable),
      ),
  );
};

const makeMutationBody = (node: MutationNode) => {
  if (node.mutationType === "create") return makeCreateMutationBody(node);
  if (node.mutationType === "update") return makeUpdateMutationBody(node);
  return makeDeleteMutationBody(node);
};

const makeResolver = tsg.identifier("makeResolver").importFrom("sasat");
const context = tsg
  .typeRef("GQLContext")
  .importFrom(Directory.resolve("GENERATED", "BASE", "context"));
const makeResolverArgs = (node: MutationNode) =>
  [
    tsg.parameter("_"),
    tsg.parameter(`{${node.entityName.lowerCase()}}`),
    node.contextFields.length !== 0 ||
    node.refetch ||
    (node.mutationType === "update" && node.subscription)
      ? tsg.parameter("context")
      : null,
    node.refetch ? tsg.parameter("info") : null,
  ].filter(nonNullable);

const makeCreateMutationBody = (node: MutationNode) => {
  const entity = tsg.identifier(node.entityName.lowerCase());
  const dsVariable = tsg.variable(
    "const",
    ds,
    makeDatasource(node.entityName, "GENERATED"),
  );
  const createCall = ds
    .property("create")
    .call(makeDatasourceParam(entity, node.contextFields));
  if (!node.subscription && !node.refetch)
    return tsg.block(dsVariable, tsg.return(createCall));

  if (!node.refetch) {
    return tsg.block(
      dsVariable,
      tsg.variable("const", result, tsg.await(createCall)),
      node.subscription ? makePublishCall(node, result) : null,
      tsg.return(result),
    );
  }

  return tsg.block(
    dsVariable,
    tsg.variable("const", result, tsg.await(createCall)),
    ...makeRefetched(node),
    node.subscription ? makePublishCall(node, refetched) : null,
    tsg.return(refetched),
  );
};

const makeRefetched = (node: MutationNode) => {
  const fields = tsg.identifier("fields");
  return [
    ...(node.refetch
      ? [
          tsg.variable(
            "const",
            fields,
            tsg.ternary(
              tsg.identifier("info"),
              tsg
                .identifier("gqlResolveInfoToField")
                .importFrom("sasat")
                .call(tsg.identifier("info"))
                .as(makeTypeRef(node.entityName, "fields", "GENERATED")),
              tsg.identifier("undefined"),
            ),
          ),
          ...(node.subscription
            ? [
                tsg.if(
                  fields,
                  tsg.block(
                    tsg
                      .binary(
                        fields.property("fields"),
                        "=",
                        tsg.array(
                          node.entity.fields.map((field) =>
                            tsg.string(field.fieldName),
                          ),
                        ),
                      )
                      .toStatement(),
                  ),
                ),
              ]
            : []),
        ]
      : []),
    tsg.variable(
      "const",
      ident,
      tsg
        .identifier("pick")
        .importFrom("sasat")
        .call(
          node.mutationType === "create"
            ? result
            : tsg.identifier(node.entityName.lowerCase()),
          tsg.array(node.identifyFields.map(tsg.string)),
        )
        .as(tsg.typeRef("unknown"))
        .as(makeTypeRef(node.entityName, "identifiable", "GENERATED")),
    ),
    tsg.variable(
      "const",
      refetched,
      tsg.await(
        ds
          .property(makeFindQueryName(node.identifyFields))
          .call(
            ...node.identifyFields.map((it) => ident.property(it)),
            node.refetch ? fields : tsg.identifier("undefined"),
            tsg.identifier("undefined"),
            tsg.identifier("context"),
          ),
      ),
    ),
  ];
};

const makePublishCall = (node: MutationNode, identifier: Identifier) => {
  const publish = publishFunctionName(node.entityName, node.mutationType);
  return tsg
    .await(
      tsg
        .identifier("publishAfterWrite")
        .importFrom("sasat")
        .call(
          tsg.string(publish),
          tsg.arrowFunc(
            [],
            undefined,
            tsg
              .identifier(publish)
              .importFrom("./subscription")
              .call(
                tsg
                  .parenthesis(
                    identifier === refetched
                      ? tsg.ternary(
                          identifier,
                          tsg
                            .identifier("pick")
                            .importFrom("sasat")
                            .call(
                              identifier,
                              tsg.array(
                                node.entity.fields.map((field) =>
                                  tsg.string(field.fieldName),
                                ),
                              ),
                            ),
                          identifier,
                        )
                      : identifier,
                  )
                  .as(KeywordTypeNode.unknown)
                  .as(makeTypeRef(node.entityName, "entity", "GENERATED")),
              ),
          ),
        ),
    )
    .toStatement();
};

const makeDatasourceParam = (
  entity: Identifier,
  contextParams: ContextField[],
) => {
  if (contextParams.length === 0) return entity;
  return tsg.object(
    tsg.spreadAssign(entity),
    ...contextParams.map((it) =>
      tsg.propertyAssign(
        it.fieldName,
        tsg.identifier(`context.${it.contextName}`),
      ),
    ),
  );
};

const makeUpdateMutationBody = (node: MutationNode): Block => {
  const entity = tsg.identifier(node.entityName.lowerCase());
  const dsV = tsg.variable(
    "const",
    ds,
    makeDatasource(node.entityName, "GENERATED"),
  );
  const resultV = tsg.variable(
    "const",
    result,
    tsg.await(
      ds
        .property("update")
        .call(makeDatasourceParam(entity, node.contextFields))
        .property("then")
        .call(
          tsg.arrowFunc(
            [
              tsg.parameter(
                "it",
                tsg.typeRef("CommandResponse").importFrom("sasat"),
              ),
            ],
            KeywordTypeNode.boolean,
            tsg.binary(tsg.identifier("it.changedRows"), "===", tsg.number(1)),
          ),
        ),
    ),
  );
  const statements: TsStatement[] = [
    dsV,
    node.refetch
      ? tsg
          .await(
            ds
              .property("update")
              .call(makeDatasourceParam(entity, node.contextFields)),
          )
          .toStatement()
      : resultV,
  ];
  if (!node.refetch && !node.subscription) {
    return tsg.block(...statements, tsg.return(result));
  }
  return tsg.block(
    ...statements,
    ...makeRefetched(node),
    node.subscription ? makePublishCall(node, refetched) : null,
    tsg.return(node.refetch ? refetched : result),
  );
};

const makeDeleteMutationBody = (node: MutationNode): Block => {
  const entity = tsg.identifier(node.entityName.lowerCase());
  const dsV = tsg.variable(
    "const",
    ds,
    makeDatasource(node.entityName, "GENERATED"),
  );
  const deleteCall = ds
    .property("delete")
    .call(entity)
    .property("then")
    .call(
      tsg.arrowFunc(
        [
          tsg.parameter(
            "it",
            tsg.typeRef("CommandResponse").importFrom("sasat"),
          ),
        ],
        KeywordTypeNode.boolean,
        tsg.binary(
          tsg.identifier("it.affectedRows"),
          "===",
          new NumericLiteral(1),
        ),
      ),
    );
  return tsg.block(
    dsV,
    tsg.variable("const", result, tsg.await(deleteCall)),
    node.subscription
      ? tsg.if(result, tsg.block(makePublishCall(node, entity)))
      : null,
    tsg.return(result),
  );
};
