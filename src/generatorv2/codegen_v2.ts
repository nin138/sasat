import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import ts from "typescript";
import { config } from "../config/config.js";
import type { DataStoreHandler } from "../migration/dataStore.js";
import { tsFileNames } from "./codegen/ts/tsFileNames.js";
import { TsCodegen_v2 } from "./codegen/tscodegen_v2.js";
import { Directory } from "./directory.js";
import { type FileArtifact, publishArtifacts } from "./fs/publishArtifacts.js";
import type { RootNode } from "./nodes/rootNode.js";
import { parse } from "./parse.js";

export class CodeGen_v2 {
  private codeGen = new TsCodegen_v2();
  private outDir = config().migration.out;
  private readonly root: RootNode;
  constructor(store: DataStoreHandler) {
    this.root = parse(store);
  }

  async generate(additionalFiles: FileArtifact[] = []): Promise<void> {
    const generated: FileArtifact[] = [];
    const extensions: FileArtifact[] = [];
    const fileName = (name: string) => `${name}.${this.codeGen.fileExtension}`;
    const generatedFile = (name: string, content: string) => {
      generated.push({ path: fileName(name), content });
    };
    const once = async (
      name: string,
      render: () => string | Promise<string>,
    ) => {
      const target = path.join(this.outDir, fileName(name));
      if (!existsSync(target))
        extensions.push({ path: target, content: await render() });
    };
    // Render first. Sequential awaits ensure no writes or render tasks outlive a failure.
    for (const node of this.root.entities) {
      generatedFile(
        path.join("entities", node.name.name),
        await this.codeGen.generateEntity(node),
      );
      generatedFile(
        path.join("dataSources/db", node.name.name),
        await this.codeGen.generateGeneratedDatasource(node),
      );
      await once(path.join("dataSources/db", node.name.name), () =>
        this.codeGen.generateDatasource(node),
      );
    }
    generatedFile(
      "typeDefs",
      await this.codeGen.generateGqlTypeDefs(this.root),
    );
    generatedFile(
      "resolver",
      await this.codeGen.generateGqlResolver(this.root),
    );
    generatedFile("query", await this.codeGen.generateGqlQuery(this.root));
    generatedFile(
      "mutation",
      await this.codeGen.generateGqlMutation(this.root),
    );
    generatedFile(
      "subscription",
      await this.codeGen.generateGqlSubscription(this.root),
    );
    generatedFile("context", await this.codeGen.generateGQLContext(this.root));
    for (const file of await this.codeGen.generateFiles(this.root))
      generatedFile(file.name, file.body);
    for (const file of this.codeGen.generateOnceFiles())
      await once(file.name, () => file.body);
    for (const [name, render] of [
      [tsFileNames.conditions, this.codeGen.generateConditions],
      [tsFileNames.encoder, this.codeGen.generateIDEncoders],
      [tsFileNames.middleware, this.codeGen.generateMiddlewares],
    ] as const) {
      const target = path.join(this.outDir, fileName(name));
      const current = existsSync(target) ? readFileSync(target, "utf8") : "";
      const content = render(this.root, current);
      if (content && content !== current)
        extensions.push({ path: target, content });
    }
    for (const file of [...generated, ...extensions]) {
      const result = ts.transpileModule(file.content, {
        fileName: file.path,
        reportDiagnostics: true,
        compilerOptions: {
          target: ts.ScriptTarget.ESNext,
          module: ts.ModuleKind.ESNext,
        },
      });
      const error = result.diagnostics?.find(
        (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
      );
      if (error)
        throw new Error(
          `Invalid generated TypeScript: ${file.path} (TS${error.code})`,
        );
    }
    publishArtifacts([
      {
        path: path.join(this.outDir, Directory.paths.GENERATED),
        files: generated,
      },
      ...extensions,
      ...additionalFiles,
    ]);
  }
}
