CREATE TABLE NOTICE_INFO (
    id serial4 primary key,
    notice_title varchar(255) not null,
    link varchar(1024) not null,
    publish_datetime_start varchar(30) not null,
    publish_datetime_end varchar(30) not null,
    last_updated_user_id int4 not null,
    last_updated_date varchar(30) not null
);