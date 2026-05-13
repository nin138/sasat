import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli/index.ts', "src/testing/index.ts", "src/migration/index.ts"],
  format: ['esm', 'cjs'],
  outDir: 'dist',
  dts: true,
});
