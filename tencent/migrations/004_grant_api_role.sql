-- Grant the CloudBase function's dedicated database account only the
-- privileges required by the lvyue application. Run after creating the
-- ordinary PostgreSQL account named lvyue_api in the CloudBase console.

begin;

grant usage on schema public to lvyue_api;

grant select, insert, update, delete on table
  public.app_users,
  public.auth_login_attempts,
  public.friendships,
  public.friend_details,
  public.albums,
  public.album_members,
  public.album_folders,
  public.album_folder_items,
  public.album_categories,
  public.media,
  public.media_categories,
  public.media_likes,
  public.comments,
  public.notifications,
  public.upload_intents
to lvyue_api;

-- UUID primary keys do not currently use sequences, but this keeps future
-- migrations using identity columns compatible without granting ownership.
grant usage, select on all sequences in schema public to lvyue_api;

-- New application tables/sequences created later by the migration owner get
-- the same least-privilege access automatically.
alter default privileges in schema public
  grant select, insert, update, delete on tables to lvyue_api;
alter default privileges in schema public
  grant usage, select on sequences to lvyue_api;

commit;

select 'lvyue_api privileges granted' as result;
