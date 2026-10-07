import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli/index.ts', "src/testing/index.ts", "src/migration/index.ts"],
  format: ['esm', 'cjs'],
  outDir: 'dist',
  dts: { resolver: "tsc" },
  // Notices for third-party declarations included in the published types.
  copy: [
    { from: "node_modules/mysql2/License", to: "dist/licenses", rename: "mysql2.txt" },
    { from: "node_modules/sql-escaper/LICENSE", to: "dist/licenses", rename: "sql-escaper.txt" },
    { from: "node_modules/@types/pg/LICENSE", to: "dist/licenses", rename: "types-pg.txt" },
    { from: "node_modules/pg-protocol/LICENSE", to: "dist/licenses", rename: "pg-protocol.txt" },
    { from: "node_modules/pg-types/README.md", to: "dist/licenses", rename: "pg-types.md" },
  ],
  // Keep public driver option types usable without installing both drivers.
  deps: { dts: { alwaysBundle: [/^mysql2(?:\/|$)/, /^pg(?:-|\/|$)/, /^@types\/pg(?:-|\/|$)/] } },
});
