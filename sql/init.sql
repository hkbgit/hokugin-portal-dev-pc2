drop database hokuriku;

create database hokuriku;

use hokuriku;

create table users (
  id int not null primary key auto_increment,
  name varchar(255) not null unique,
  password varchar(255) not null,
  last_password_updated_date varchar(30) not null
);

insert into users (name, password, last_password_updated_date)
  values
  ('hokurikuit01', 'CDWq/YOPsCK17XbHVm3jryGstJgArCaKAsQOGdil700=', '1970/01/01'),
  ('hokurikuit02', 'MJajhNi/XpbEnej3dHULIPDfMHe6fxYYfzbfWUG+neE=', '1970/01/01'),
  ('hokurikuit03', 'B7WU1ILfYXiEhxSqoNibX8kx9DO90xNLOD9tNS1s/Is=', '1970/01/01'),
  ('hokurikuit04', '80xN/2mtEWbVxl1OcO+W0YFVyeCrioPszMRMw+vSN/E=', '1970/01/01'),
  ('hokurikuit05', 'wIk7NMlVP9OtXbOcL3RUsjaYx6NSmzAVDwa9sC5ZWoQ=', '1970/01/01');

create table banner_position (
  id int not null primary key auto_increment,
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

create table banners (
  id int not null primary key auto_increment,
  title varchar(255) not null,
  banner_position_id int not null,
  image_path varchar(512) not null,
  link varchar(1024),
  publish_datetime_start varchar(30),
  publish_datetime_end varchar(30),
  priority int,
  comment text,
  last_updated_user_id int not null,
  last_updated_date varchar(30) not null
);

alter table banners
  add foreign key (last_updated_user_id) references users (id);

alter table banners
  add foreign key (banner_position_id) references banner_position (id);

create table images (
  id int not null primary key auto_increment,
  image_path varchar(255) not null unique,
  image_binary mediumblob not null
);
