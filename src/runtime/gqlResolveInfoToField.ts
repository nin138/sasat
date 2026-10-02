import {
  GraphQLIncludeDirective,
  type GraphQLNamedType,
  type GraphQLObjectType,
  type GraphQLResolveInfo,
  GraphQLSkipDirective,
  getDirectiveValues,
  getNamedType,
  isAbstractType,
  isObjectType,
  type NamedTypeNode,
  type SelectionNode,
} from "graphql";
import type { Fields } from "./field.js";

type FieldTree = {
  fields: Set<string>;
  relations: Map<string, FieldTree>;
  visitedFragments: Set<string>;
};

const makeTree = (): FieldTree => ({
  fields: new Set(),
  relations: new Map(),
  visitedFragments: new Set(),
});

const collectSelections = (
  selections: readonly SelectionNode[],
  info?: GraphQLResolveInfo,
): FieldTree => {
  const root = makeTree();
  const possibleTypes = (
    type: GraphQLNamedType,
  ): readonly GraphQLObjectType[] =>
    isObjectType(type)
      ? [type]
      : isAbstractType(type) && info
        ? info.schema.getPossibleTypes(type)
        : [];
  const narrowTypes = (
    condition: NamedTypeNode | undefined,
    types: readonly GraphQLObjectType[] | undefined,
  ) => {
    if (!condition || !types || !info) return types;
    const expected = info.schema.getType(condition.name.value);
    return types.filter(
      (type) =>
        expected === type ||
        (isAbstractType(expected) && info.schema.isSubType(expected, type)),
    );
  };
  const visit = (
    nodes: readonly SelectionNode[],
    tree: FieldTree,
    types: readonly GraphQLObjectType[] | undefined,
    activeFragments: ReadonlySet<string>,
  ) => {
    if (types?.length === 0) return;
    for (const node of nodes) {
      if (
        info &&
        (getDirectiveValues(GraphQLSkipDirective, node, info.variableValues)
          ?.if === true ||
          getDirectiveValues(GraphQLIncludeDirective, node, info.variableValues)
            ?.if === false)
      )
        continue;
      if (node.kind === "Field") {
        const name = node.name.value;
        if (name === "__typename") continue;
        if (!node.selectionSet) {
          tree.fields.add(name);
          continue;
        }
        let child = tree.relations.get(name);
        if (!child) {
          child = makeTree();
          tree.relations.set(name, child);
        }
        const childTypes =
          types === undefined
            ? undefined
            : [
                ...new Set(
                  types.flatMap((type) => {
                    const field = type.getFields()[name];
                    return field ? possibleTypes(getNamedType(field.type)) : [];
                  }),
                ),
              ];
        visit(node.selectionSet.selections, child, childTypes, activeFragments);
      } else if (node.kind === "InlineFragment") {
        visit(
          node.selectionSet.selections,
          tree,
          narrowTypes(node.typeCondition, types),
          activeFragments,
        );
      } else {
        const name = node.name.value;
        const fragment = info?.fragments[name];
        if (!fragment || activeFragments.has(name)) continue;
        const fragmentTypes = narrowTypes(fragment.typeCondition, types);
        // The same fragment may apply under different type conditions in this tree.
        const key = `${name}:${
          fragmentTypes
            ?.map((type) => type.name)
            .sort()
            .join(",") ?? "*"
        }`;
        if (tree.visitedFragments.has(key)) continue;
        tree.visitedFragments.add(key);
        visit(
          fragment.selectionSet.selections,
          tree,
          fragmentTypes,
          new Set([...activeFragments, name]),
        );
      }
    }
  };
  visit(
    selections,
    root,
    info ? possibleTypes(getNamedType(info.returnType)) : undefined,
    new Set(),
  );
  return root;
};

const toFields = <T extends Fields<unknown>>(
  tree: FieldTree,
  number: number,
): [T, number] => {
  let next = number;
  const convert = (node: FieldTree): Fields<Record<string, unknown>> => {
    const tableAlias = "t" + next++;
    return {
      fields: [...node.fields],
      relations: Object.fromEntries(
        [...node.relations].map(([name, child]) => [name, convert(child)]),
      ),
      tableAlias,
    };
  };
  // Allocate aliases only after merging; each relation gets one unique alias.
  return [convert(tree) as T, next - 1];
};

export const selectionSetToField = <T extends Fields<unknown>>(
  selections: readonly SelectionNode[],
  number: number,
): [T, number] => toFields<T>(collectSelections(selections), number);

export const gqlResolveInfoToField = <
  // biome-ignore lint/suspicious/noExplicitAny: <>
  T extends Fields<any> = Fields<unknown>,
>(
  info: GraphQLResolveInfo,
): T => {
  const selections = info.fieldNodes.flatMap(
    (node) => node.selectionSet?.selections ?? [],
  );
  return toFields<T>(collectSelections(selections, info), 0)[0];
};
