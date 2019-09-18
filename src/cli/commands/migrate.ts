import { MigrationController } from "../../migration/controller";
import { getDbClient } from "../../db/getDbClient";
import { Console } from "../console";

export const migrate = async () => {
  const migration = new MigrationController();
  const current = await migration.migrate();
  await getDbClient().release();
  Console.success(`current migration is ${current}`);
};
