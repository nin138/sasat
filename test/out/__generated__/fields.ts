/* eslint-disable */
import { User } from "./entities/User.js";
import { Fields } from "sasat";
import { Post } from "./entities/Post.js";
import { Stock } from "./entities/Stock.js";
export type UserFields = Fields<
  User,
  { hogePost?: UserFields; stock_userStock?: UserFields }
>;
export type PostFields = Fields<
  Post,
  { hoge?: PostFields; Stock?: PostFields }
>;
export type StockFields = Fields<
  Stock,
  { stock_user?: StockFields; postPost?: StockFields }
>;
