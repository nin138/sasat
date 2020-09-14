//
// // "CREATE TABLE `user` (
// //   `userId` int(10) unsigned NOT NULL AUTO_INCREMENT,
// //   `name` varchar(20) NOT NULL DEFAULT "no name",
// //   `nickName` varchar(20) DEFAULT NULL,
// //   `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
// //   `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
// //   PRIMARY KEY (`userId`),
// //   UNIQUE KEY `nickName` (`nickName`)
// // PRIMARY KEY (`postId`),
// //   KEY `ref_post_userId__user_userId` (`userId`),
// //   KEY `index_name` (`title`,`postId`),
// //   CONSTRAINT `ref_post_userId__user_userId` FOREIGN KEY (`userId`) REFERENCES `user` (`userId`)
// // ) ENGINE=InnoDB"
//
//
// const getInnerStr = (str: string, start: string, end: string, fromIndex = 0) => {
//   const startIndex = str.indexOf(start, fromIndex) + 1;
//   const endIndex = start.indexOf(end, startIndex);
//   return str.slice(startIndex, endIndex);
// };
//
//
//
// const getColumns = (str: string) => getInnerStr(str, '(', ')').split(',').map(it => it.replace('`', ''));
// const startStrMap = [
//   {word: 'PRIMARY KEY', fn: (str: string) => ({primaryKey:  getColumns(str)})},
//   {word: 'UNIQUE KEY', fn: (str: string) => ({uniqueKeys: [getColumns(str)]})},
//   {word: 'KEY', fn: (str: string): Pick<SerializedTable, 'indexes'> => ({indexes: [{
//         constraintName: getInnerStr(str, '`', '`'),
//         columns: getColumns(str),
//       }]}) },
//   {word: 'CONSTRAINT' },
//   {word: '`' },
//   {word: ')'}
// ]
//
//
//
//
// import {SerializedColumn, SerializedStore, SerializedTable} from "../../../entity/serializedStore";
// import {Index} from "../../../entity";
// import {GqlOption} from "../../../migration/gqlOption";
//
// const a: SerializedStore;
//
// const indexOfEndOfFind = (str: string, currentIndex: number, find: string) => {
//   const i = str.slice(currentIndex).indexOf(find);
//   if(i === -1) throw new Error('keyword: ' + find + ' not found');
//   return currentIndex + i + find.length;
// };
//
// const table = (str: string): SerializedTable => {
//   const lines = str.split('\n').map(it => it.trim());
//   const getTableName = (line: string) => {
//     const start = line.indexOf('`') + 1;
//     const end = line.lastIndexOf('`');
//     return str.slice(start, end);
//   };
//   return {
//     tableName: getInnerStr(lines[0], '`', '`'),
//     columns: SerializedColumn[];
//     primaryKey: string[];
//     uniqueKeys: string[][];
//     indexes: Index[];
//     gqlOption: GqlOption;
//   };
// }
// const sql = '';
//
//
// const str = '';
//
//
// const getId = (str: string, i: number): [string, number] => {
//   const target = str.slice(i);
//
// };
//
// const first = (str: string) => {
//   let i = 0;
//   i = indexOfEndOfFind(str, i ,'CREATE TABLE');
// }
//
