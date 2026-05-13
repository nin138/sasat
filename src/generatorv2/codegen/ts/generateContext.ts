import { columnTypeToTsType } from "../../../migration/column/columnTypes.js";
import { TsFile, tsg } from "../../../tsg/index.js";
import type { RootNode } from "../../nodes/rootNode.js";

export const generateContext = (root: RootNode) => {
  return new TsFile(
    tsg
      .interface("BaseGQLContext")
      .addProperties(
        root.contexts.map((it) =>
          tsg.propertySignature(
            it.name,
            tsg.typeRef(columnTypeToTsType(it.dbtype)),
          ),
        ),
      )
      .export(),
  ).disableEsLint();
};
