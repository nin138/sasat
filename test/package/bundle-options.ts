import type { BuildOptions } from "esbuild";

export type BundleMode = "esm" | "cjs" | "esm-to-cjs";

/** Keep these recipes in sync with docs/bundling.md. */
export function bundleCompatibility(
  mode: BundleMode,
): Pick<BuildOptions, "banner" | "define"> {
  if (mode === "esm")
    return {
      banner: {
        js: "import {createRequire as bundleCreateRequire} from 'node:module'; const require = bundleCreateRequire(import.meta.url);",
      },
    };
  if (mode === "esm-to-cjs")
    return {
      define: { "import.meta.url": "__sasatBundleImportMetaUrl" },
      banner: {
        js: "const __sasatBundleImportMetaUrl = require('node:url').pathToFileURL(__filename).href;",
      },
    };
  return {};
}
