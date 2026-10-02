import * as fs from "node:fs";
import { defaultConf } from "../../config/config.js";
import { writeYmlFile } from "../../util/fsUtil.js";
import { Console } from "../console.js";
import { init } from "./init.js";

jest.mock("node:fs", () => ({
  ...jest.requireActual("node:fs"),
  existsSync: jest.fn(),
}));
jest.mock("../../util/fsUtil.js", () => ({ writeYmlFile: jest.fn() }));

beforeEach(() => {
  jest.spyOn(Console, "error").mockImplementation(() => {});
  jest.spyOn(Console, "success").mockImplementation(() => {});
});

test("writes the default configuration for a new project", () => {
  jest.mocked(fs.existsSync).mockReturnValue(false);
  init();
  expect(writeYmlFile).toHaveBeenCalledWith("./", "sasat.yml", defaultConf);
});

test("preserves an existing configuration", () => {
  jest.mocked(fs.existsSync).mockReturnValue(true);
  init();
  expect(writeYmlFile).not.toHaveBeenCalled();
  expect(Console.error).toHaveBeenCalledWith("sasat.yml already exist");
});
