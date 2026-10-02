import { StoreMigrator } from "../../src/migration/front/storeMigrator.js";
import CreateUser from "../migrations/20190916_161015user.js";
import CreatePost from "../migrations/20190921_172155post.js";
import CreateStock from "../migrations/20190921_172201stock.js";
import SeedData from "../migrations/20221124_004308test_data.js";
import AddColumn from "../migrations/20230614_223758add_column.js";

export function migrationStore() {
  const store = StoreMigrator.deserialize({ tables: [] });
  for (const Migration of [
    CreateUser,
    CreatePost,
    CreateStock,
    SeedData,
    AddColumn,
  ]) {
    new Migration().up(store);
  }
  return store;
}
