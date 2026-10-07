import { columnTypeToTsType } from "../../../../migration/column/columnTypes.js";
import {
  KeywordTypeNode,
  type TsStatement,
  type TsType,
  tsg,
} from "../../../../tsg/index.js";
import { type Directories, Directory } from "../../../directory.js";
import type { EntityNode } from "../../../nodes/entityNode.js";
import type { FieldNode } from "../../../nodes/FieldNode.js";
import type { MutationNode } from "../../../nodes/mutationNode.js";
import {
  makeContextTypeRef,
  makeTypeRef,
} from "../scripts/getEntityTypeRefs.js";
import { tsFileNames } from "../tsFileNames.js";

const DIR: Directories = "GENERATED";

export const makeMutationMiddlewareAndTypes = (entity: EntityNode) => {
  return entity.mutations.map((node) =>
    makeMutationResolverMiddleware(entity, node),
  );
};

const makeParamType = (node: MutationNode): TsType => {
  if (node.mutationType === "create")
    return makeTypeRef(node.entityName, "creatable", "GENERATED");
  if (node.mutationType === "update")
    return tsg.intersectionType(
      makeTypeRef(node.entityName, "identifiable", "GENERATED"),
      makeTypeRef(node.entityName, "updatable", "GENERATED"),
    );
  return makeTypeRef(node.entityName, "identifiable", "GENERATED");
};

const makeEncoder = (name: string) =>
  tsg
    .identifier(name)
    .importFrom(Directory.resolve(DIR, "BASE", tsFileNames.encoder));

const makeIdDecodeMiddleware = (fields: FieldNode[], node: MutationNode) => {
  const params = tsg.identifier("args[1]");
  const entityName = node.entity.name.lowerCase();
  const decoded = fields
    .filter((it) => it.hashId && it.isGQLOpen)
    .map((it) => {
      const value = params.property(entityName).property(it.fieldName);
      return tsg.propertyAssign(
        it.fieldName,
        tsg.ternary(
          tsg.binary(
            tsg.binary(value, "===", tsg.identifier("null")),
            "||",
            tsg.binary(value, "===", tsg.identifier("undefined")),
          ),
          value,
          makeEncoder(it.hashId!.encoder)
            .property("decode")
            .call(value.as(tsg.typeRef("string"))),
        ),
      );
    });
  return tsg.arrowFunc(
    [tsg.parameter("args")],
    undefined,
    tsg.block(
      tsg
        .binary(
          params,
          "=",
          tsg.object(
            tsg.spreadAssign(params),
            tsg.propertyAssign(
              entityName,
              tsg.object(
                tsg.spreadAssign(params.property(entityName)),
                ...decoded,
              ),
            ),
          ),
        )
        .toStatement(),
      tsg.return(tsg.identifier("args")),
    ),
  );
};

const makeResolverMiddleware = (
  typeName: string,
  entity: EntityNode,
  fields: FieldNode[],
  node: MutationNode,
) => {
  const sig = fields
    .filter((it) => it.isGQLOpen)
    .map((it) => {
      const type = tsg.typeRef(
        it.hashId ? "string" : columnTypeToTsType(it.dbType),
      );
      return tsg.propertySignature(
        it.fieldName,
        it.isNullable ? tsg.unionType(type, KeywordTypeNode.null) : type,
        it.isNullable,
      );
    });
  const hidden = fields.filter((it) => !it.isGQLOpen);
  const paramType =
    hidden.length === 0
      ? makeParamType(node)
      : tsg.typeRef("Omit", [
          makeParamType(node),
          tsg.typeRef(
            hidden.map((it) => JSON.stringify(it.fieldName)).join(" | "),
          ),
        ]);
  const requiredType = tsg.typeAlias(
    typeName,
    tsg.typeLiteral([
      tsg.propertySignature(entity.name.lowerCase(), paramType),
    ]),
  );

  const middlewareName = node.mutationName + "Middleware";

  if (!node.requireIdDecodeMiddleware)
    return [
      requiredType,
      tsg.variable(
        "const",
        middlewareName,
        tsg.array(
          node.middlewares.map((it) =>
            tsg.identifier(it).importFrom("../" + tsFileNames.middleware),
          ),
        ),
        tsg.arrayType(
          tsg
            .typeRef("ResolverMiddleware", [
              makeContextTypeRef(DIR),
              tsg.identifier(typeName),
            ])
            .importFrom("sasat"),
        ),
      ),
    ];
  const incomingType = tsg.typeAlias(
    "GQL" + typeName,
    tsg.typeLiteral([
      tsg.propertySignature(entity.name.lowerCase(), tsg.typeLiteral(sig)),
    ]),
  );

  const middleware = tsg.variable(
    "const",
    node.mutationName + "Middleware",
    tsg.array([
      makeIdDecodeMiddleware(fields, node),
      ...node.middlewares.map((it) =>
        tsg.identifier(it).importFrom("../" + tsFileNames.middleware),
      ),
    ]),
    tsg.arrayType(
      tsg
        .typeRef("ResolverMiddleware", [
          makeContextTypeRef(DIR),
          tsg.identifier(typeName),
          tsg.identifier("GQL" + typeName),
        ])
        .importFrom("sasat"),
    ),
  );
  return [incomingType, requiredType, middleware];
};

export const makeMutationResolverMiddleware = (
  entity: EntityNode,
  node: MutationNode,
): TsStatement[] => {
  switch (node.mutationType) {
    case "create":
      return makeResolverMiddleware(
        entity.name.createInputName(),
        entity,
        entity.creatable.fields,
        node,
      );
    case "update":
      return makeResolverMiddleware(
        entity.name.updateInputName(),
        entity,
        entity.updateInput.fields,
        node,
      );
    case "delete":
      return makeResolverMiddleware(
        entity.name.identifyInputName(),
        entity,
        entity.identifyFields(),
        node,
      );
  }
};
