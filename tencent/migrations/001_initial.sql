-- 旅页 / Tencent Cloud PostgreSQL initial migration
-- 正式数据源：腾讯云 PostgreSQL；身份与权限由 lvyue-api 云函数统一处理。
-- 本脚本不依赖 Supabase auth.uid()、RLS 或 storage schema。

begin;

create extension if not exists pgcrypto;
create extension if not exists citext;

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  travel_id citext not null unique check (travel_id::text ~ '^[A-Za-z0-9]{1,20}$'),
  nickname varchar(20) not null check (char_length(nickname) between 1 and 20),
  password_hash text not null check (password_hash like '$2%'),
  avatar_path text,
  token_version integer not null default 1 check (token_version > 0),
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists auth_login_attempts (
  id bigint generated always as identity primary key,
  attempt_key char(64) not null,
  succeeded boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists auth_login_attempts_recent_idx on auth_login_attempts(attempt_key,created_at desc);

create table if not exists friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references app_users(id) on delete cascade,
  addressee_id uuid not null references app_users(id) on delete cascade,
  status varchar(16) not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);
create unique index if not exists friendships_pair_unique
  on friendships(least(requester_id,addressee_id),greatest(requester_id,addressee_id));
create index if not exists friendships_requester_idx on friendships(requester_id,status);
create index if not exists friendships_addressee_idx on friendships(addressee_id,status);

create table if not exists friend_details (
  owner_id uuid not null references app_users(id) on delete cascade,
  friend_id uuid not null references app_users(id) on delete cascade,
  remark varchar(30),
  description varchar(80),
  updated_at timestamptz not null default now(),
  primary key(owner_id,friend_id),
  check(owner_id<>friend_id)
);

create table if not exists albums (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references app_users(id),
  title varchar(60) not null check(char_length(title) between 1 and 60),
  description varchar(300) not null default '',
  cover_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists album_members (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references albums(id) on delete cascade,
  user_id uuid not null references app_users(id) on delete cascade,
  role varchar(12) not null default 'member' check(role in ('owner','member')),
  status varchar(16) not null default 'invited' check(status in ('invited','owner_review','active','rejected')),
  invited_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(album_id,user_id)
);
create index if not exists album_members_user_idx on album_members(user_id,status);
create index if not exists album_members_album_idx on album_members(album_id,status);

create table if not exists album_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  name varchar(30) not null check(char_length(name) between 1 and 30),
  position integer not null default 0 check(position>=0),
  created_at timestamptz not null default now(),
  unique(user_id,name)
);
create index if not exists album_folders_order_idx on album_folders(user_id,position);

create table if not exists album_folder_items (
  user_id uuid not null references app_users(id) on delete cascade,
  album_id uuid not null references albums(id) on delete cascade,
  folder_id uuid references album_folders(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key(user_id,album_id)
);

create table if not exists album_categories (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references albums(id) on delete cascade,
  name varchar(30) not null check(char_length(name) between 1 and 30),
  position integer not null default 0 check(position>=0),
  created_by uuid not null references app_users(id),
  created_at timestamptz not null default now(),
  unique(album_id,name)
);
create index if not exists album_categories_order_idx on album_categories(album_id,position);

create table if not exists media (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references albums(id) on delete cascade,
  uploader_id uuid not null references app_users(id),
  storage_path text not null unique,
  media_type varchar(8) not null check(media_type in ('image','video')),
  original_name varchar(255) not null,
  mime_type varchar(100) not null,
  byte_size bigint not null check(byte_size>0),
  captured_at date,
  created_at timestamptz not null default now()
);
create index if not exists media_album_created_idx on media(album_id,created_at desc);

create table if not exists media_categories (
  media_id uuid not null references media(id) on delete cascade,
  category_id uuid not null references album_categories(id) on delete cascade,
  primary key(media_id,category_id)
);

create table if not exists media_likes (
  media_id uuid not null references media(id) on delete cascade,
  user_id uuid not null references app_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(media_id,user_id)
);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references media(id) on delete cascade,
  user_id uuid not null references app_users(id) on delete cascade,
  parent_id uuid references comments(id) on delete cascade,
  body varchar(500) not null check(char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists comments_media_created_idx on comments(media_id,created_at);
create index if not exists comments_parent_idx on comments(parent_id) where parent_id is not null;

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references app_users(id) on delete cascade,
  actor_id uuid references app_users(id) on delete set null,
  type varchar(32) not null check(type in (
    'friend_request','friend_accepted','album_invite','album_joined','album_review',
    'album_rejected','album_activity','like','comment','reply'
  )),
  message varchar(300) not null,
  entity_type varchar(32),
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_recipient_idx on notifications(recipient_id,created_at desc);
create index if not exists notifications_unread_idx on notifications(recipient_id,created_at desc) where read_at is null;

create table if not exists upload_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  album_id uuid references albums(id) on delete cascade,
  purpose varchar(12) not null check(purpose in ('avatar','cover','media')),
  object_key text not null unique,
  mime_type varchar(100) not null,
  byte_size bigint not null check(byte_size>0),
  original_name varchar(255) not null,
  expires_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check((purpose='avatar' and album_id is null) or (purpose<>'avatar' and album_id is not null))
);
create index if not exists upload_intents_pending_idx on upload_intents(user_id,expires_at) where completed_at is null;

drop trigger if exists app_users_updated_at on app_users;
create trigger app_users_updated_at before update on app_users for each row execute function set_updated_at();
drop trigger if exists friendships_updated_at on friendships;
create trigger friendships_updated_at before update on friendships for each row execute function set_updated_at();
drop trigger if exists albums_updated_at on albums;
create trigger albums_updated_at before update on albums for each row execute function set_updated_at();
drop trigger if exists album_members_updated_at on album_members;
create trigger album_members_updated_at before update on album_members for each row execute function set_updated_at();

-- CloudBase may automatically expose new public tables to PostgREST roles.
-- This project only permits data access through the lvyue-api cloud function,
-- so remove direct browser/Data API privileges. The dedicated API database
-- account receives its grants separately after it is created in the console.
do $security$
declare
  exposed_role text;
  table_list constant text :=
    'public.app_users, public.auth_login_attempts, public.friendships, '
    'public.friend_details, public.albums, public.album_members, '
    'public.album_folders, public.album_folder_items, public.album_categories, '
    'public.media, public.media_categories, public.media_likes, public.comments, '
    'public.notifications, public.upload_intents';
begin
  execute 'revoke all privileges on table ' || table_list || ' from public';
  foreach exposed_role in array array['anon','authenticated','web_anon'] loop
    if exists(select 1 from pg_roles where rolname=exposed_role) then
      execute format('revoke all privileges on table %s from %I', table_list, exposed_role);
    end if;
  end loop;
end
$security$;

alter default privileges in schema public revoke all privileges on tables from public;

-- 数据库不直接暴露给浏览器；请让云函数使用一个专用、最小权限角色连接。
-- 下面的角色名 lvyue_api 可按腾讯云控制台实际账号调整：
-- grant usage on schema public to lvyue_api;
-- grant select,insert,update,delete on all tables in schema public to lvyue_api;
-- grant usage,select on all sequences in schema public to lvyue_api;
-- alter default privileges in schema public grant select,insert,update,delete on tables to lvyue_api;
-- alter default privileges in schema public grant usage,select on sequences to lvyue_api;

commit;
