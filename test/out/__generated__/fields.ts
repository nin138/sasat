/* eslint-disable */
import { User } from "./entities/User.js";
import { Fields } from "sasat";
import { Post } from "./entities/Post.js";
import { Stock } from "./entities/Stock.js";
export type UserFields = Fields<
  User,
  { uPost?: PostFields; stock_userStock?: StockFields }
>;
export type PostFields = Fields<
  Post,
  { pUser?: UserFields; vC?: UserFields; Stock?: StockFields }
>;
export type StockFields = Fields<
  Stock,
  { stock_user?: UserFields; postPost?: PostFields }
>;
