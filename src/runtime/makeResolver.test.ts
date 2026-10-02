import type { GraphQLResolveInfo } from "graphql";
import { makeResolver } from "./makeResolver.js";
import { makeParamsMiddleware } from "./resolverMiddleware.js";

const info = {} as GraphQLResolveInfo;

test("passes all resolver arguments through without middleware", () => {
  const resolver = jest.fn(() => "result");
  const args = [null, { id: 1 }, { user: "Ada" }, info] as const;
  expect(makeResolver(resolver)(...args)).toBe("result");
  expect(resolver).toHaveBeenCalledWith(...args);
});

test("applies parameter middleware in order", () => {
  const resolver = jest.fn(
    (_root: unknown, params: { value: number }) => params.value,
  );
  const wrapped = makeResolver(resolver, [
    makeParamsMiddleware((params: { value: number }) => ({
      value: params.value + 1,
    })),
    makeParamsMiddleware((params: { value: number }) => ({
      value: params.value * 2,
    })),
  ]);
  expect(wrapped(null, { value: 3 }, undefined as never, info)).toBe(8);
});

test("propagates middleware errors without calling the resolver", () => {
  const resolver = jest.fn();
  const wrapped = makeResolver(resolver, [
    () => {
      throw new Error("denied");
    },
  ]);
  expect(() => wrapped(null, {}, {}, info)).toThrow("denied");
  expect(resolver).not.toHaveBeenCalled();
});

test("preserves async resolver results and failures", async () => {
  await expect(makeResolver(async () => 42)(null, {}, {}, info)).resolves.toBe(
    42,
  );
  await expect(
    makeResolver(async () => {
      throw new Error("failed");
    })(null, {}, {}, info),
  ).rejects.toThrow("failed");
});
