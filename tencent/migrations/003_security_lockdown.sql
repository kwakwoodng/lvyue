-- CloudBase PostgREST lockdown for the existing lvyue tables.
-- Safe to run repeatedly. This intentionally does not modify extension
-- functions or system-managed schemas, which the CloudBase editor may not own.

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
  -- PostgreSQL's PUBLIC pseudo-role always exists.
  execute 'revoke all privileges on table ' || table_list || ' from public';

  -- CloudBase/Supabase-compatible Data API roles are installation-dependent.
  -- Only touch a role when it exists in this environment.
  foreach exposed_role in array array['anon','authenticated','web_anon'] loop
    if exists(select 1 from pg_roles where rolname=exposed_role) then
      execute format(
        'revoke all privileges on table %s from %I',
        table_list,
        exposed_role
      );
    end if;
  end loop;
end
$security$;

-- Prevent ordinary future tables created by this SQL role from inheriting
-- PostgreSQL PUBLIC access. Re-run this lockdown after adding new app tables
-- because CloudBase may separately auto-expose them to Data API roles.
alter default privileges in schema public revoke all privileges on tables from public;

select 'lvyue PostgREST table access locked down' as result;
