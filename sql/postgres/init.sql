
create table users (
  id SERIAL primary key,
  name varchar(255) not null unique,
  password varchar(255) not null,
  last_password_updated_date varchar(30) not null
);

create table app_users (
  contract_no varchar(24) not null primary key unique
);

insert into users (name, password, last_password_updated_date)
  values
  ('hokurikuit01', 'CDWq/YOPsCK17XbHVm3jryGstJgArCaKAsQOGdil700=', '1970/01/01'),
  ('hokurikuit02', 'MJajhNi/XpbEnej3dHULIPDfMHe6fxYYfzbfWUG+neE=', '1970/01/01'),
  ('hokurikuit03', 'B7WU1ILfYXiEhxSqoNibX8kx9DO90xNLOD9tNS1s/Is=', '1970/01/01'),
  ('hokurikuit04', '80xN/2mtEWbVxl1OcO+W0YFVyeCrioPszMRMw+vSN/E=', '1970/01/01'),
  ('hokurikuit05', 'wIk7NMlVP9OtXbOcL3RUsjaYx6NSmzAVDwa9sC5ZWoQ=', '1970/01/01');

create table banner_position (
  id SERIAL primary key,
  name varchar(255) not null unique,
  max_displayable_number int
);

insert into banner_position (name, max_displayable_number)
  values
  ('しらべる-フルサイズ', 10),
  ('しらべる-ハーフサイズ', 10),
  ('ためる・ふやす-フルサイズ', 10),
  ('ためる・ふやす-ハーフサイズ', 10),
  ('かりる-フルサイズ', 10),
  ('かりる-ハーフサイズ', 10);

insert into banner_position (name, max_displayable_number) values ('TOP画面上端', 1);

create table banners (
  id SERIAL primary key,
  title varchar(255) not null,
  banner_position_id int not null,
  position_name varchar,
  image_path varchar(512) not null,
  link varchar(1024),
  publish_datetime_start varchar(30),
  publish_datetime_end varchar(30),
  priority int,
  comment text,
  last_updated_user_id int not null,
  user_name varchar,
  last_updated_date varchar(30) not null
);

create table top_banners (
  id SERIAL primary key,
  banner_id int not null,
  title varchar(255) not null,
  position_name varchar,
  image_path varchar(512) not null,
  link varchar(1024),
  publish_datetime_start varchar(30),
  publish_datetime_end varchar(30),
  priority int,
  comment text,
  user_name varchar,
  last_updated_date varchar(30) not null,
  is_default int,
  top_banner_attribute_id int,
  connected_csv varchar,
  process_start_datetime  varchar(30) not null
);
 

create table top_banner_display_inventory (
  id SERIAL primary key ,
  contract_no varchar(24) not null,
  top_banner_id int not null,
  last_showed_date varchar(30) default '' not null ,
  constraint display_recode unique (contract_no, top_banner_id)
);

create table top_banner_attributes (
  id SERIAL primary key,
  name varchar(255) not null unique
);



insert into top_banner_attributes (id,name)
  values
    (1,'ピックアップ'),
  (2,'おすすめコンテンツ');

  

create table images (
  id SERIAL primary key ,
  image_path varchar(255) not null unique,
  image_binary text not null
);

create table session_info (
  id varchar primary key,
  user_id int ,
  user_name varchar(255),
  error_msg varchar,
  contracter_no varchar,
  user_last_password_updated_date varchar(30),
  date varchar(30)
);

create rule r_app_users as on
insert
	to app_users
where
	exists (
	select
		1
	from
		app_users
	where
		contract_no = new.contract_no) do instead nothing;


create table extend_info (
  id SERIAL primary key,
  title varchar,
  "smalTitle" varchar,
  image_path varchar(512) ,
  image_path1 varchar(512) ,
  catalog jsonb,
  publish_datetime_start varchar(30),
  publish_datetime_end varchar(30),
  process_start_datetime varchar(30),
  priority int,
  comment text,
  last_updated_user_id int not null,
  user_name varchar,
  last_updated_date varchar(30) not null

);


create table user_account_show_hide (
  contract_number varchar primary key,
  flag varchar(255)
);

create table comment_info(
  id SERIAL primary key,
  comment varchar(255) not null,
  kyara_id int not null,
  link varchar(255),
  publish_datetime_start varchar(30),
  publish_datetime_end varchar(30),
  last_updated_user_id int not null,
  user_name varchar,
  last_updated_date varchar(30) not null
);

create table kyara_attr(
  id SERIAL primary key,
  kyara_name varchar(255) not null,
  image_path varchar(512),
  last_updated_user_id int not null,
  user_name varchar,
  last_updated_date varchar(30) not null
);


create table tairu_info (
  id SERIAL primary key,
  title varchar,
  sub_title varchar,
  image_path varchar(512) ,
  link varchar(255),
  coordinate int not null,
  priority int not null,
  last_updated_user_id int not null,
  user_name varchar,
  last_updated_date varchar(30) not null
);

create table extend_detail (
  id SERIAL primary key,
  extend_id int not null,
  sub_title varchar,
  content text ,
  priority int not null,
  last_updated_user_id int not null,
  user_name varchar,
  last_updated_date varchar(30) not null
);
