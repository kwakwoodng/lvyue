-- 建议每天由腾讯云定时触发器或运维任务执行。
delete from auth_login_attempts where created_at < now() - interval '7 days';
delete from upload_intents where completed_at is null and expires_at < now() - interval '1 day';
delete from upload_intents where completed_at is not null and completed_at < now() - interval '30 days';
