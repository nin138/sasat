import { assignDeep, createTypeDef, makeResolver } from "../src/index.js";
import { resolvers } from "./out/__generated__/resolver.js";
import { inputs, typeDefs } from "./out/__generated__/typeDefs.js";
import { UserDBDataSource } from "./out/dataSources/db/User.js";

export const serverSchema = {
  typeDefs: createTypeDef(
    assignDeep(typeDefs, {
      User: {
        a: { return: "String" },
        b: { return: "[User!]!" },
      },
      Mutation: {
        upsertUser: {
          args: [
            { name: "id", type: "Int!" },
            { name: "name", type: "String!" },
            { name: "NNN", type: "String!" },
          ],
          return: "Boolean!",
        },
      },
    }),
    inputs,
  ),
  resolvers: assignDeep(resolvers, {
    User: {
      a: () => {
        return "test";
      },
      b: () => {
        return [];
      },
    },
    Mutation: {
      upsertUser: makeResolver<
        unknown,
        { id: number; name: string; NNN: string }
      >(async (_, params, _2) => {
        try {
          await new UserDBDataSource().upsert(
            {
              userId: params.id,
              NNN: params.NNN,
              nick: params.name,
            },
            ["NNN"],
          );
        } catch (e) {
          console.error(e);
          throw e;
        }
        return true;
      }),
    },
  }),
};
