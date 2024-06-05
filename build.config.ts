import { defineBuildConfig } from 'unbuild';
export default defineBuildConfig({
  rollup: {
    inlineDependencies: true,
  },
  outDir: 'dist',
  // Generates .d.ts declaration file
  declaration: true,
});
