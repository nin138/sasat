/* eslint-disable */
import { User } from "./entities/User.js";
import { Fields } from "sasat";
import { Post } from "./entities/Post.js";
import { Stock } from "./entities/Stock.js";
export type UserFields = Fields<User, { uPost?: PostFields; vP?: PostFields }>;
export type PostFields = Fields<Post, { pUser?: UserFields; vC?: UserFields }>;
export type StockFields = Fields<Stock, {}>;
