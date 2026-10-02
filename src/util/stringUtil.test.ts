import {
  camelize,
  capitalizeFirstLetter,
  lowercaseFirstLetter,
  plural,
} from "./stringUtil.js";

test.each([
  ["", "", ""],
  ["userName", "UserName", "userName"],
  ["USER", "USER", "uSER"],
])("changes only the first character of %s", (input, capital, lower) => {
  expect(capitalizeFirstLetter(input)).toBe(capital);
  expect(lowercaseFirstLetter(input)).toBe(lower);
});

test.each([
  ["user_name", "userName"],
  ["User Name", "userName"],
  ["user-name", "userName"],
  ["userName", "userName"],
  ["", ""],
])("camelizes %s", (input, expected) => {
  expect(camelize(input)).toBe(expected);
});

test.each([
  ["user", "users"],
  ["person", "people"],
  ["news", "newsList"],
])("creates a distinct plural name for %s", (input, expected) => {
  expect(plural(input)).toBe(expected);
});
