import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { buildSync } from "esbuild";
import ts from "typescript";
import { config, setConfig } from "../../src/config/config.js";
import { CodeGen_v2 } from "../../src/generatorv2/codegen_v2.js";
import { DataStoreHandler } from "../../src/migration/dataStore.js";
import { StoreMigrator } from "../../src/migration/front/storeMigrator.js";
import { Queries } from "../../src/migration/makeQuery.js";
import { bundleCompatibility } from "./bundle-options.js";

const root = process.cwd();
const manifest = JSON.parse(
  readFileSync(path.join(root, "package.json"), "utf8"),
);

for (const dialect of ["mysql", "postgres"] as const) {
  test(`generated ${dialect} schemas own a lazy pool in isolated ESM, CJS and ESM-to-CJS bundles`, async () => {
    const scratch = mkdtempSync(path.join(tmpdir(), "sasat-generated-client-"));
    const deployment = mkdtempSync(
      path.join(tmpdir(), "sasat-generated deploy #%-"),
    );
    const original = structuredClone(config());
    const driver = dialect === "mysql" ? "mysql2" : "pg";
    try {
      const modules = path.join(scratch, "node_modules");
      const sasat = path.join(modules, "sasat");
      mkdirSync(sasat, { recursive: true });
      cpSync(path.join(root, "dist"), path.join(sasat, "dist"), {
        recursive: true,
      });
      writeFileSync(path.join(sasat, "package.json"), JSON.stringify(manifest));
      for (const dependency of [
        ...Object.keys(manifest.dependencies),
        driver,
        "@types/node",
      ]) {
        const target = path.join(modules, dependency);
        mkdirSync(path.dirname(target), { recursive: true });
        symlinkSync(path.join(root, "node_modules", dependency), target);
      }
      const out = path.join(scratch, "out");
      setConfig({
        db: { dialect },
        migration: { out },
        generator: {
          addJsExtToImportStatement: true,
          gql: { subscription: false },
        },
      });
      const store = StoreMigrator.deserialize({ tables: [] });
      store.createTable("probe", (table) => {
        table.column("id").int().primary();
        table.column("label").varchar(40);
        table.enableGQL();
        table.addGQLQuery(Queries.listAll("probes"));
      });
      await new CodeGen_v2(new DataStoreHandler(store.serialize())).generate();
      writeFileSync(
        path.join(scratch, "tsconfig.json"),
        JSON.stringify({
          compilerOptions: {
            target: "ES2022",
            module: "NodeNext",
            moduleResolution: "NodeNext",
            strict: true,
            skipLibCheck: true,
            noEmit: true,
          },
          include: ["out/**/*.ts"],
        }),
      );
      writeFileSync(path.join(scratch, "package.json"), '{"type":"module"}');
      execFileSync(
        process.execPath,
        [
          path.join(root, "node_modules/typescript/bin/tsc"),
          "-p",
          path.join(scratch, "tsconfig.json"),
        ],
        { stdio: "pipe", timeout: 60000 },
      );
      for (const mode of ["esm", "esm-to-cjs", "cjs"] as const) {
        const esmInput = mode !== "cjs";
        const format = mode === "esm" ? "esm" : "cjs";
        if (!esmInput) {
          // Consume the CJS package export instead of converting its ESM shim.
          for (const file of readdirSync(out, { recursive: true })
            .map(String)
            .filter((file) => file.endsWith(".ts"))) {
            const full = path.join(out, file);
            writeFileSync(
              full.replace(/\.ts$/, ".js"),
              ts.transpileModule(readFileSync(full, "utf8"), {
                compilerOptions: {
                  target: ts.ScriptTarget.ES2022,
                  module: ts.ModuleKind.CommonJS,
                },
              }).outputText,
            );
          }
          writeFileSync(path.join(out, "package.json"), '{"type":"commonjs"}');
        }
        const ext = esmInput ? "mjs" : "cjs";
        const source = path.join(scratch, `consumer.${ext}`);
        const imports = esmInput
          ? `import {schema} from './out/schema.ts';
             import {ProbeDBDataSource} from './out/dataSources/db/Probe.ts';
             import {getDbClient, releaseDbClient} from './out/dbClient.ts';
             import {setConfig} from 'sasat'; import assert from 'node:assert/strict';`
          : `const {schema} = require('./out/schema.js');
             const {ProbeDBDataSource} = require('./out/dataSources/db/Probe.js');
             const {getDbClient, releaseDbClient} = require('./out/dbClient.js');
             const {setConfig} = require('sasat'); const assert = require('node:assert/strict');`;
        writeFileSync(
          source,
          `${imports}
          class Probe extends ProbeDBDataSource { get executor() { return this.client; } }
          const dataSource = new Probe();
          (async () => {
            assert.ok(schema.resolvers);
            await releaseDbClient(); // must not create a client before configuration
            const live = process.env.SASAT_BUNDLE_LIVE === '1';
            setConfig({db:{dialect:'${dialect}', ...(live ? {
              host:process.env.${dialect === "mysql" ? "TEST_DB_HOST" : "TEST_PG_HOST"},
              port:Number(process.env.${dialect === "mysql" ? "TEST_DB_PORT" : "TEST_PG_PORT"}),
              user:process.env.${dialect === "mysql" ? "TEST_DB_USER" : "TEST_PG_USER"} || '${dialect === "mysql" ? "root" : "postgres"}',
              password:process.env.${dialect === "mysql" ? "TEST_DB_PASSWORD" : "TEST_PG_PASSWORD"} || '',
              database:'${dialect === "mysql" ? "mysql" : "postgres"}'
            } : {host:'127.0.0.1',port:1,user:'unused',password:'',database:'unused'})}});
            const db = dataSource.executor; // initializes through the generated provider
            assert.equal(db, getDbClient());
            assert.equal(db.dialect, '${dialect}');
            try {
              if (live) {
                const rows = await db.executeQuery({text:'SELECT ${dialect === "mysql" ? "?" : "$1::int"} AS value',values:[42]});
                assert.equal(rows[0].value, 42);
                await db.withTransaction(async tx => {
                  await tx.rawCommand('CREATE TEMPORARY TABLE probe (id INTEGER PRIMARY KEY, label VARCHAR(40))');
                  const scoped = new Probe(tx);
                  assert.equal(scoped.executor, tx);
                  await scoped.create({id:1,label:'generated'});
                  assert.deepEqual(await scoped.find(), [{id:1,label:'generated'}]);
                }, {connection:'discard'});
              } else await assert.rejects(db.rawQuery('SELECT 1'), {code:'ECONNREFUSED'});
            } finally { await releaseDbClient(); }
            assert.equal(db.isReleased(), true);
            assert.equal(dataSource.executor, db);
            const next = new Probe().executor;
            assert.notEqual(next, db);
            await releaseDbClient();
            setConfig({db:{dialect:'${dialect === "mysql" ? "postgres" : "mysql"}'}});
            assert.throws(() => new Probe().executor, /Regenerate code/);
          })().catch(error => { console.error(error); process.exitCode = 1; });`,
        );
        const outfile = path.join(
          deployment,
          mode,
          format === "esm" ? "bundle.mjs" : "bundle.cjs",
        );
        const result = buildSync({
          absWorkingDir: scratch,
          entryPoints: [source],
          outfile,
          bundle: true,
          platform: "node",
          format,
          minify: true,
          ...bundleCompatibility(mode),
          metafile: true,
          logLevel: "silent",
        });
        assert.equal(result.warnings.length, 0);
        const inputs = Object.keys(result.metafile!.inputs).map((name) =>
          name.replaceAll("\\", "/"),
        );
        assert.ok(
          inputs.some((name) =>
            name.endsWith(`sasat/dist/index.${esmInput ? "mjs" : "cjs"}`),
          ),
          `wrong Sasat export selected for ${mode}`,
        );
        assert.ok(
          inputs.some((name) => name.includes(`/node_modules/${driver}/`)),
        );
        assert.ok(
          !inputs.some((name) =>
            name.includes(
              `/node_modules/${dialect === "mysql" ? "pg" : "mysql2"}/`,
            ),
          ),
        );
        execFileSync(process.execPath, [outfile], {
          cwd: deployment,
          env: { ...process.env, NODE_PATH: "", NODE_OPTIONS: "" },
          stdio: "pipe",
          timeout: 20000,
        });
      }
    } catch (error) {
      if (error && typeof error === "object" && "stdout" in error)
        console.error(String(error.stdout));
      if (error && typeof error === "object" && "stderr" in error)
        console.error(String(error.stderr));
      throw error;
    } finally {
      Object.assign(config(), original);
      rmSync(scratch, { recursive: true, force: true });
      rmSync(deployment, { recursive: true, force: true });
    }
  });
}
