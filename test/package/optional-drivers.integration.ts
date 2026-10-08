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
import { buildSync } from "esbuild";

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
        import {getDbClient, PostgresClient, MysqlClient, MysqlPoolClient, createSqlGenerator, queryToSql, qe, TransactionCommitError} from "sasat";
        import type {MysqlDriver, PostgresDriver, DatabaseDriver} from "sasat";
        import type {SqlStatement, SqlParameter, ParameterizedSQLExecutor, QueryResponse, CommandResponse, TransactionExecutor, TransactionOptions} from "sasat";
        import {makeTestDB} from "sasat/testing";
        import type {SasatMigration} from "sasat/migration";
        const pg = new PostgresClient({max:4,host:"localhost"});
        const mysql = new MysqlClient({multipleStatements:true});
        const shared = getDbClient({connectionLimit:4});
        declare const mysqlDriver: MysqlDriver;
        declare const pgDriver: PostgresDriver;
        const injectedMysql = new MysqlPoolClient({}, undefined, mysqlDriver);
        const injectedConnection = new MysqlClient({}, undefined, mysqlDriver);
        const injectedPg = new PostgresClient({}, undefined, pgDriver);
        const selection: DatabaseDriver = {dialect:"mysql",driver:mysqlDriver};
        getDbClient(undefined, undefined, selection);
        getDbClient(undefined, undefined, {dialect:"postgres",driver:pgDriver});
        // @ts-expect-error A PostgreSQL driver cannot be injected as a MySQL driver.
        getDbClient(undefined, undefined, {dialect:"mysql",driver:pgDriver});
        void [injectedMysql, injectedConnection, injectedPg];
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
        const options: TransactionOptions = {connection:"discard"};
        const managed: Promise<number> = pg.withTransaction(async (tx: TransactionExecutor) => {
          const command: CommandResponse = await tx.executeCommand(created);
          // @ts-expect-error Completion is owned by withTransaction.
          tx.commit;
          // @ts-expect-error The callback cannot acquire a nested transaction.
          tx.transaction;
          return command.affectedRows;
        }, options);
        const same: Promise<string> = mysql.withTransaction(async tx => { await tx.query\`SELECT 1\`; return "ok"; });
        const manual = shared.transaction({connection:"discard"});
        void [managed, same, manual, TransactionCommitError];
        const executor: ParameterizedSQLExecutor = pg;
        const boundRows: Promise<QueryResponse> = executor.executeQuery(statement);
        const boundCommand: Promise<CommandResponse> = mysql.executeCommand({text:"SELECT ?", values:[1]});
        void [boundRows, boundCommand];
        void [pg,mysql,shared,makeTestDB,sql,quoted];
        const migration: SasatMigration = {up() {},down() {}};
        void migration;
      `;
      const dedicatedSource = driver
        ? `
        import {getDbClient as selectedClient, ${driver === "mysql2" ? "MysqlPoolClient" : "PostgresClient"} as SelectedPool} from "sasat/${driver === "mysql2" ? "mysql" : "postgres"}";
        const selected = selectedClient({${driver === "mysql2" ? "connectionLimit" : "max"}:2});
        const independent = new SelectedPool({});
        void [selected, independent];
      `
        : "";
      writeFileSync(
        path.join(directory, "consumer.mts"),
        source + dedicatedSource,
      );
      writeFileSync(
        path.join(directory, "consumer.cts"),
        source + dedicatedSource,
      );
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

for (const driver of [undefined, ...drivers]) {
  test(`Node bundles work with ${driver ?? "no drivers"} installed`, () => {
    const directory = fixture(driver);
    try {
      const body = `
        (async () => {
          for (const [driver, dialect] of [["mysql2", "mysql"], ["pg", "postgres"]]) {
            setConfig({db:{dialect,host:"127.0.0.1",port:1,user:"unused",database:"unused",password:""}});
            const client = getDbClient({connectTimeout:1000,connectionTimeoutMillis:1000});
            try {
              await assert.rejects(client.rawQuery("SELECT 1"), error => driver === ${JSON.stringify(driver ?? null)}
                ? error.code === "ECONNREFUSED" : error.message.includes("yarn add " + driver));
            } finally { await client.release(); }
          }
        })().catch(error => { console.error(error); process.exitCode = 1; });
      `;
      for (const format of ["esm", "cjs"] as const) {
        const source = path.join(
          directory,
          format === "esm" ? "consumer.mjs" : "consumer.cjs",
        );
        const imports =
          format === "esm"
            ? 'import {getDbClient, setConfig} from "sasat"; import assert from "node:assert/strict";'
            : 'const {getDbClient, setConfig} = require("sasat"); const assert = require("node:assert/strict");';
        writeFileSync(source, imports + body);
        const outfile = path.join(
          directory,
          format === "esm" ? "bundle.mjs" : "bundle.cjs",
        );
        const result = buildSync({
          absWorkingDir: directory,
          entryPoints: [source],
          outfile,
          bundle: true,
          platform: "node",
          format,
          minify: true,
          // Bundle Sasat itself. Only installed dependencies are external;
          // missing optional drivers must not need an external override.
          external: [
            ...Object.keys(manifest.dependencies),
            ...(driver ? [driver] : []),
          ],
          metafile: true,
          logLevel: "silent",
        });
        assert.ok(
          Object.keys(result.metafile!.inputs).some((name) =>
            name.includes("sasat/dist/"),
          ),
        );
        execute(directory, [outfile]);
      }
    } catch (error) {
      if (error && typeof error === "object" && "stderr" in error)
        console.error(String(error.stderr));
      throw error;
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}

for (const driver of drivers) {
  for (const api of ["entry", "injection"] as const) {
    test(`${driver} ${api} bundles the driver and runs without node_modules`, () => {
      const directory = fixture(driver);
      const deployment = mkdtempSync(
        path.join(tmpdir(), "sasat-bundle-deployment-"),
      );
      try {
        const dialect = driver === "mysql2" ? "mysql" : "postgres";
        const className =
          driver === "mysql2" ? "MysqlPoolClient" : "PostgresClient";
        const specifier = driver === "mysql2" ? "mysql2/promise" : "pg";
        for (const format of ["esm", "cjs"] as const) {
          const extension = format === "esm" ? "mjs" : "cjs";
          const source = path.join(directory, `embed.${extension}`);
          const imports =
            format === "esm"
              ? `import {setConfig, getDbClient as shared, ${className} as BaseClient} from 'sasat';
               import assert from 'node:assert/strict'; import {createRequire} from 'node:module';
               ${api === "entry" ? `import {getDbClient, ${className} as Client} from 'sasat/${dialect}';` : `import driver from '${specifier}';`}
               const resolve = createRequire(import.meta.url).resolve;`
              : `const {setConfig, getDbClient: shared, ${className}: BaseClient} = require('sasat');
               const assert = require('node:assert/strict'); const {createRequire} = require('node:module');
               ${api === "entry" ? `const {getDbClient, ${className}: Client} = require('sasat/${dialect}');` : `const driver = require('${specifier}');`}
               const resolve = createRequire(__filename).resolve;`;
          writeFileSync(
            source,
            imports +
              `
            (async () => {
              assert.throws(() => resolve('${driver}'), {code:'MODULE_NOT_FOUND'});
              const live = process.env.SASAT_BUNDLE_LIVE === '1';
              const options = live ? {
                host: process.env.${driver === "mysql2" ? "TEST_DB_HOST" : "TEST_PG_HOST"},
                port: Number(process.env.${driver === "mysql2" ? "TEST_DB_PORT" : "TEST_PG_PORT"}),
                user: process.env.${driver === "mysql2" ? "TEST_DB_USER" : "TEST_PG_USER"} || '${driver === "mysql2" ? "root" : "postgres"}',
                password: process.env.${driver === "mysql2" ? "TEST_DB_PASSWORD" : "TEST_PG_PASSWORD"} || '',
                database: '${driver === "mysql2" ? "mysql" : "postgres"}'
              } : {host:'127.0.0.1',port:1,user:'unused',database:'unused',password:''};
              setConfig({db:{dialect:'${dialect}', ...options}});
              const tuning = ${driver === "mysql2" ? "{connectTimeout:1000}" : "{connectionTimeoutMillis:1000}"};
              const client = ${api === "entry" ? "getDbClient(tuning)" : `shared(tuning, undefined, {dialect:'${dialect}',driver})`};
              assert.equal(shared(), client);
              const independent = ${api === "entry" ? "new Client({...options, ...tuning})" : "new BaseClient({...options, ...tuning}, undefined, driver)"};
              for (const db of [client, independent]) {
                try {
                  if (live) {
                    const rows = await db.executeQuery({text:'SELECT ${driver === "mysql2" ? "?" : "$1::int"} AS value',values:[42]});
                    assert.equal(rows[0].value,42);
                    await db.withTransaction(async tx => {
                      const result = await tx.rawQuery('SELECT 7 AS value');
                      assert.equal(result[0].value,${driver === "mysql2" ? "7n" : "7"});
                    });
                  } else await assert.rejects(db.rawQuery('SELECT 1'), {code:'ECONNREFUSED'});
                } finally { await db.release(); }
              }
            })().catch(error => { console.error(error); process.exitCode = 1; });
          `,
          );
          const outfile = path.join(deployment, `bundle.${extension}`);
          const result = buildSync({
            absWorkingDir: directory,
            entryPoints: [source],
            outfile,
            bundle: true,
            platform: "node",
            format,
            minify: true,
            // CommonJS driver dependencies still require Node built-ins in ESM output.
            banner:
              format === "esm"
                ? {
                    js: "import {createRequire as bundleCreateRequire} from 'node:module'; const require = bundleCreateRequire(import.meta.url);",
                  }
                : undefined,
            metafile: true,
            logLevel: "silent",
          });
          const inputs = Object.keys(result.metafile!.inputs).map((name) =>
            name.replaceAll("\\", "/"),
          );
          assert.ok(
            inputs.some((name) => name.includes(`/node_modules/${driver}/`)),
          );
          assert.ok(
            !inputs.some((name) =>
              name.includes(
                `/node_modules/${driver === "mysql2" ? "pg" : "mysql2"}/`,
              ),
            ),
          );
          execute(deployment, [outfile]);
        }
      } catch (error) {
        if (error && typeof error === "object" && "stderr" in error)
          console.error(String(error.stderr));
        throw error;
      } finally {
        rmSync(directory, { recursive: true, force: true });
        rmSync(deployment, { recursive: true, force: true });
      }
    });
  }
}
