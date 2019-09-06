drop database if exists test;
create database test;
use test;

create table user(
    id int primary key auto_increment,
    name varchar(20)
);

insert into user(name) values('scac'),( 'sqwf'),( 'efwef'),('g6g');

create table test(
    id int primary key,
    c1 varchar(20),
    c2 varchar(22)
);

insert into test values (222, '2d ', 'fwq'),
                        (25255, 'few', 'wf'),
                        (987,'ca','sff');
