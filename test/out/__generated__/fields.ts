/* eslint-disable */
import { User } from "./entities/User.js";
import { Fields } from "sasat";
import { Post } from "./entities/Post.js";
import { Stock } from "./entities/Stock.js";
export type UserFields = Fields<
  User,
  { hogePost?: PostFields; stock_userStock?: StockFields }
>;
export type PostFields = Fields<
  Post,
  { hoge?: UserFields; Stock?: StockFields }
>;
export type StockFields = Fields<
  Stock,
  { stock_user?: UserFields; postPost?: PostFields }
>;
