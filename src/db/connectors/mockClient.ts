import { DBClient, SQLTransaction } from './dbClient.js';

class MockDBTransaction extends SQLTransaction {
  commit(): Promise<void> {
    return Promise.resolve();
  }

  protected execSql() {
    return Promise.resolve([]);
  }

  rollback(): Promise<void> {
    return Promise.resolve();
  }
}

export class MockDBClient extends DBClient {
  constructor() {
    super();
  }
  protected execSql() {
    return Promise.resolve([]);
  }

  release(): Promise<void> {
    return Promise.resolve(undefined);
  }

  transaction() {
    return Promise.resolve(new MockDBTransaction());
  }
}
