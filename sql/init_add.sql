
use hokuriku;

select * from banner_position order by id;

insert into banner_position (name, max_displayable_number) values ('TOP画面上端', 1);

create table app_users (
  contract_no varchar(24) not null primary key unique
);

create table top_banners (
  id int not null primary key auto_increment,
  banner_id int not null,
  is_default int default 0 not null,
  top_banner_attribute_id int default 0 not null,
  connected_csv varchar(1024) not null,
  foreign key (banner_id) references banners (id),
  process_start_datetime varchar(30) default '' not null
);

create table top_banner_display_inventory (
  id int not null primary key auto_increment,
  contract_no varchar(24) not null,
  top_banner_id int not null,
  last_showed_date varchar(30) default '' not null ,
  constraint display_recode unique (contract_no, top_banner_id)
);

create table top_banner_attributes (
  id int not null primary key auto_increment,
  name varchar(255) not null unique
);
insert into top_banner_attributes (name)
  values
  ('ローン'),
  ('預金'),
  ('預かり資産'),
  ('キャンペーン'),
  ('手続き'),
  ('その他');

select * from top_banner_attributes order by id;

select * from banner_position order by id;

show tables;



