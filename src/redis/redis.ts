import { RedisClient as C, Multi as M } from "./redisClient";

export namespace Redis {
  export const Client = C;
  export const Multi = M;
  export enum Type {
    String = "string",
    Set = "set",
    Zset = "zset",
    List = "list",
    Hash = "hash",
  }

  export enum Aggregate {
    SUM = "SUM",
    MIN = "MIN",
    MAX = "MAX,",
  }

  export enum MINMAX {
    MIN = "-inf",
    MAX = "+inf ",
  }

  export enum HSETReply {
    Updated = 0,
    NewFieldCreated = 1,
  }

  export enum NXReply {
    AlreadyExist = 0,
    Success = 1,
  }

  export enum SADDReply {
    AlreadyExist = 0,
    NewElementIsAdded = 1,
  }

  export enum REMReply {
    MemberIsNotExist = 0,
    Removed = 1,
  }

  export enum ZADDReply {
    ScoreIsUpdated = 0,
    NewElementIsAdded = 1,
  }

  export type OK = "OK";
}
