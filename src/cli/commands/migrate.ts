import { MigrationController } from "../../migration/controller";
import { getDbClient } from "../../db/getDbClient";
import { Console } from "../console";

export const migrate = async () => {
  let current;
  try {
    const migration = new MigrationController();
    current = await migration.migrate();
  } catch (e) {
    Console.error(e.message);
    process.exit(1);
  } finally {
    await getDbClient().release();
  }
  Console.success(`current migration is ${current}`);
};
