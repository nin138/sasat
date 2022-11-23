import { SasatMigration, MigrationStore } from "sasat";
import {PostCreatable} from "../out/__generated__/entities/Post.js";
import {StockCreatable} from "../out/__generated__/entities/Stock.js";
import {SqlString} from "../../src/runtime/sql/sqlString.js";

const toSQL = (table: string, obj: any) => {
  const entries = Object.entries(obj);
  return `INSERT INTO ${table}(${entries
    .map(([key]) => key)
    .join(", ")}) VALUES (${entries.map(([, value]) =>
    SqlString.escape(value)
  )})`;
};

const users = [
  { userId: 1, nickName: 'u1' },
  { userId: 2, nickName: 'u2' },
  { userId: 3, nickName: 'u3' },
];

const posts: PostCreatable[] = [
  { postId: 1, userId: 1, title: 't1' },
  { postId: 2, userId: 1, title: 't2' },
  { postId: 3, userId: 1, title: 't3' },
  { postId: 4, userId: 2, title: 't4' },
  { postId: 5, userId: 2, title: 't5' },
  { postId: 6, userId: 3, title: 't6' },
];

const stocks: StockCreatable[] = [
  { user: 1, post: 5, id: 1 },
  { user: 1, post: 2, id: 2 },
  { user: 1, post: 3, id: 3 },
  { user: 1, post: 4, id: 4 },
  { user: 2, post: 2, id: 5 },
  { user: 2, post: 1, id: 6 },
  { user: 2, post: 6, id: 7 },
  { user: 3, post: 4, id: 8 },
  { user: 3, post: 3, id: 9 },
];

export default class Test_data implements SasatMigration {

  up: (store: MigrationStore) => void = store => {
    users.map(it => toSQL('user', it)).map(it => store.sql(it));
    posts.map(it => toSQL('post', it)).map(it => store.sql(it));
    stocks.map(it => toSQL('stock', it)).map(it => store.sql(it));
  };

  down: (store: MigrationStore) => void = () => {
    throw new Error('Down is not implemented on test_data');
  };
}
