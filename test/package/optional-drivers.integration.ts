import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

const root = process.cwd();
const manifest = JSON.parse(
  readFileSync(path.join(root, "package.json"), "utf8"),
);
const drivers = ["mysql2", "pg"] as const;

// Copy the distribution, rather than symlinking Sasat: Node must not find the
// repository's devDependencies while resolving optional drivers from the package.
function fixture(driver?: (typeof drivers)[number]) {
  const directory = mkdtempSync(path.join(tmpdir(), "sasat-optional-drivers-"));
  const modules = path.join(directory, "node_modules");
  const sasat = path.join(modules, "sasat");
  mkdirSync(sasat, { recursive: true });
  cpSync(path.join(root, "dist"), path.join(sasat, "dist"), {
    recursive: true,
  });
  writeFileSync(path.join(sasat, "package.json"), JSON.stringify(manifest));
  writeFileSync(
    path.join(directory, "package.json"),
    JSON.stringify({ type: "module" }),
  );
  for (const dependency of [
    ...Object.keys(manifest.dependencies),
    "@types/node",
    ...(driver ? [driver] : []),
  ]) {
    const target = path.join(modules, dependency);
    mkdirSync(path.dirname(target), { recursive: true });
    symlinkSync(path.join(root, "node_modules", dependency), target);
  }
  return directory;
}

function execute(directory: string, args: string[]) {
  return execFileSync(process.execPath, args, {
    cwd: directory,
    env: { ...process.env, NODE_PATH: "", NODE_OPTIONS: "" },
    encoding: "utf8",
    timeout: 20000,
    stdio: "pipe",
  });
}

test("drivers are optional peers and available only for repository development", () => {
  for (const driver of drivers) {
    assert.equal(manifest.dependencies[driver], undefined);
    assert.equal(manifest.optionalDependencies?.[driver], undefined);
    assert.ok(manifest.devDependencies[driver]);
    assert.ok(manifest.peerDependencies[driver]);
    assert.equal(manifest.peerDependenciesMeta[driver].optional, true);
  }
  assert.equal(manifest.dependencies["@types/pg"], undefined);
});

for (const driver of [undefined, ...drivers]) {
  test(`distribution works with ${driver ?? "no drivers"} installed`, () => {
    const directory = fixture(driver);
    try {
      const installed = JSON.stringify(driver ?? null);
      for (const extension of ["mjs", "cjs"]) {
        const imports =
          extension === "mjs"
            ? 'const sasat = await import("sasat"); await import("sasat/migration"); await import("sasat/testing");'
            : 'const sasat = require("sasat"); require("sasat/migration"); require("sasat/testing");';
        const file = path.join(directory, `consumer.${extension}`);
        writeFileSync(
          file,
          `
          (async () => {
            const assert = (await import("node:assert/strict")).default;
            const {createRequire} = await import("node:module");
            const require = createRequire(${JSON.stringify(path.join(directory, "package.json"))});
            ${imports}
            const installed = ${installed};
            for (const dialect of ["mysql", "postgres"]) {
              const sql = sasat.createSqlGenerator(dialect);
              const quote = dialect === "postgres" ? '"' : String.fromCharCode(96);
              assert.equal(sql.escapeId("users"), quote + "users" + quote);
              assert.match(sql.createTable({tableName:"users",columns:[],primaryKey:[],uniqueKeys:[]}), /CREATE TABLE/);
            }
            for (const [driver, dialect] of [["mysql2","mysql"],["pg","postgres"]]) {
              if (driver !== installed) assert.throws(() => require.resolve(driver), {code:"MODULE_NOT_FOUND"});
              sasat.setConfig({db:{dialect,host:"127.0.0.1",port:1,user:"unused",database:"unused",password:""}});
              const client = sasat.getDbClient({connectTimeout:1000,connectionTimeoutMillis:1000});
              try {
                await assert.rejects(client.rawQuery("SELECT 1"), error => {
                  if (driver === installed) return error.code === "ECONNREFUSED";
                  return error.message.includes("yarn add " + driver);
                });
              } finally { await client.release(); }
            }
            // Releasing an unused client must not need either driver.
            await new sasat.PostgresClient({}).release();
            await new sasat.MysqlClient({}).release();
          })().catch(error => { console.error(error); process.exitCode = 1; });
        `,
        );
        execute(directory, [file]);
      }
      assert.match(
        execute(directory, [
          path.join(directory, "node_modules/sasat/dist/cli/index.mjs"),
          "--help",
        ]),
        /migrate/,
      );
      // Consumers should not need the unselected driver or @types/pg, even with
      // declaration checking enabled, for either the ESM or CommonJS entry point.
      const source = `
        import {getDbClient, PostgresClient, MysqlClient, createSqlGenerator, queryToSql, qe} from "sasat";
        import type {SqlStatement, SqlParameter, ParameterizedSQLExecutor, QueryResponse, CommandResponse} from "sasat";
        import {makeTestDB} from "sasat/testing";
        import type {SasatMigration} from "sasat/migration";
        const pg = new PostgresClient({max:4,host:"localhost"});
        const mysql = new MysqlClient({multipleStatements:true});
        const shared = getDbClient({connectionLimit:4});
        const generator = createSqlGenerator("postgres");
        const sql: string = queryToSql({select:[qe.field("users", "id")],from:qe.table("users", [], "users")}, generator);
        const quoted: string = shared.sql.escapeId("users");
        const parameters: readonly SqlParameter[] = [9007199254740993n, "1.25", null, new Date(), Buffer.from("value")];
        const statement: SqlStatement = {text:"SELECT $1", values:parameters};
        const compiled: SqlStatement = generator.compileQuery({select:[qe.fn("ABS", [qe.cast(qe.value("-1.25"), "DECIMAL(10,2)")])],from:qe.table("users", [], "users")});
        const boundQuery: Promise<QueryResponse> = shared.executeQuery(compiled);
        void boundQuery;
        const tables = {users:{identifiableKeys:["id"],identifiableFields:["id"],columnMap:{id:"id",name:"name"}}};
        const created: SqlStatement = generator.compileCreate({table:"users",fields:["name"],entities:[["O'Reilly"]],returning:"id"}, tables);
        const where = qe.eq(qe.field("users", "id"), qe.value(1));
        const updated: SqlStatement = generator.compileUpdate({table:"users",values:[{field:"name",value:null}],where}, tables);
        const deleted: SqlStatement = generator.compileDelete({table:"users",where});
        const write: Promise<CommandResponse> = shared.executeCommand(created);
        void [updated, deleted, write];
        const executor: ParameterizedSQLExecutor = pg;
        const boundRows: Promise<QueryResponse> = executor.executeQuery(statement);
        const boundCommand: Promise<CommandResponse> = mysql.executeCommand({text:"SELECT ?", values:[1]});
        void [boundRows, boundCommand];
        void [pg,mysql,shared,makeTestDB,sql,quoted];
        const migration: SasatMigration = {up() {},down() {}};
        void migration;
      `;
      writeFileSync(path.join(directory, "consumer.mts"), source);
      writeFileSync(path.join(directory, "consumer.cts"), source);
      writeFileSync(
        path.join(directory, "tsconfig.json"),
        JSON.stringify({
          compilerOptions: {
            target: "ES2022",
            module: "NodeNext",
            moduleResolution: "NodeNext",
            strict: true,
            skipLibCheck: false,
            noEmit: true,
            types: ["node"],
          },
          include: ["consumer.mts", "consumer.cts"],
        }),
      );
      execute(directory, [
        path.join(root, "node_modules/typescript/bin/tsc"),
        "--project",
        path.join(directory, "tsconfig.json"),
      ]);
    } catch (error) {
      if (error && typeof error === "object" && "stdout" in error)
        console.error(String(error.stdout));
      if (error && typeof error === "object" && "stderr" in error)
        console.error(String(error.stderr));
      throw error;
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
