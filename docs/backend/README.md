# 旅页 Web 后端（CloudBase + Tencent PostgreSQL）

此目录描述正式上线架构。现有网页预览不会被替换；正式版将通过 CloudBase HTTP 访问服务调用统一云函数 `lvyue-api`。

## 架构

- GitHub：`https://github.com/kwakwoodng/lvyue.git`
- Vercel：部署静态网页并绑定现有域名
- CloudBase：环境 `lvyue-d6gyatb4a502c0235`，上海 `ap-shanghai`
- `lvyue-api`：唯一业务入口，校验登录令牌和每次资源权限
- Tencent PostgreSQL：唯一正式结构化数据源
- CloudBase 云存储：头像、封面、原图和视频；数据库仅保存对象 key

浏览器绝不能持有 PostgreSQL 密码、腾讯 SecretId/SecretKey 或 `APP_JWT_SECRET`。CloudBase 的 Web publishable key 只能用于识别前端项目，不等同于数据库或云存储管理密钥。

## 首次部署

1. 在 Tencent PostgreSQL 的 SQL 控制台按顺序执行：

   - [`001_initial.sql`](../../tencent/migrations/001_initial.sql)
   - 日常清理任务使用 [`002_maintenance.sql`](../../tencent/migrations/002_maintenance.sql)

2. 为云函数创建专用数据库账号 `lvyue_api`，只授予本项目 schema 的增删改查与 sequence 权限。不要让前端直接连接数据库。

3. 在 CloudBase 环境中创建云存储，记录实际 COS Bucket 名。存储保持私有读；下载由云函数生成一小时有效的签名 URL。

4. 在 CloudBase 控制台创建 Node.js 18 或更高版本云函数 `lvyue-api`，上传 [`cloudfunctions/lvyue-api`](../../cloudfunctions/lvyue-api) 目录并安装依赖。

5. 将 [`.env.example`](../../cloudfunctions/lvyue-api/.env.example) 中的变量逐一填入云函数“环境变量”。真实值只填控制台，不写入 GitHub。

6. PostgreSQL 若使用私网地址，让 CloudBase 云函数与数据库连接同一个 VPC/子网；这是推荐方案。若临时使用公网地址，必须启用 TLS、限制安全组来源并尽快切回私网。

7. 为 `lvyue-api` 开通 HTTP 访问服务，仅允许 `POST` 与 `OPTIONS`。登录接口虽然公开可调用，但有数据库级 15 分钟失败次数限制；其余 action 必须携带应用 JWT。

8. `CORS_ORIGINS` 同时加入 Vercel 正式域名、预览域名以及自有域名，使用完整 Origin，逗号分隔，不要填写 `*`。

9. 先用本文的 smoke test 验证注册、错误密码、创建相簿和上传链路，再把网页数据层从 Supabase 适配为统一 action API。

## 环境变量安全

必须配置：`PGHOST`、`PGPORT`、`PGDATABASE`、`PGUSER`、`PGPASSWORD`、`APP_JWT_SECRET`、`TCB_ENV_ID`、`TCB_STORAGE_BUCKET`、`TCB_API_KEY`、`CORS_ORIGINS`。

`APP_JWT_SECRET` 至少 32 个随机字节。变更它会使所有用户重新登录。用户主动“退出所有设备”会增加 `token_version`，立即让该用户旧令牌失效。

密码使用 bcrypt cost 12 加盐哈希，数据库不保存明文密码。旅页 ID 使用 PostgreSQL `citext` 唯一索引，所以大小写不同也不能注册成两个账号。

## 上传流程

大文件不经过云函数正文，避免云函数请求大小与执行时间限制：

1. 调 `storage.prepareUpload`，服务器验证相簿成员身份、MIME 与文件大小，并创建 15 分钟 upload intent。
2. 浏览器使用返回的一次性上传令牌直传 CloudBase 私有存储桶。
3. 调 `storage.completeUpload`。服务器验证 intent、对象存在性和分类归属，再写 PostgreSQL。
4. 查看/下载时调 `media.url` 获取短期签名 URL。

限制：头像 5MB；照片 50MB；视频 500MB。默认允许 JPEG、PNG、WebP、GIF、MP4、MOV 和 WebM。生产前还可在 COS 开启内容审核、生命周期和防盗链。

## 权限规则摘要

- 用户只能修改自己的昵称和头像，旅页 ID 不可修改。
- 好友资料卡的备注与描述仅本人可见；只有已接受好友可被邀请。
- 创建者邀请：对方同意后直接加入。普通成员邀请：对方同意后还需创建者审核。
- 相簿有效成员可修改名称、描述、封面和人物分类，也可上传、查看、下载、点赞及评论。
- 仅上传者或相簿创建者可删除媒体；仅评论者或相簿创建者可删除评论；仅创建者可删除相簿和审核成员。
- 相簿文件夹是用户私有整理，不对其他成员展示。
- 评论 `parent_id` 可指向任意层级评论，因此支持递归回复。
- 通知返回时实时关联 `app_users.avatar_path`，用户换头像后好友卡片、成员列表、评论和消息中心都会同步展示最新头像。

## 运维

- 将 `002_maintenance.sql` 配为每日任务，清理登录尝试与过期上传凭证。
- CloudBase 日志中不要输出密码、JWT、PG 密码和带签名的 COS URL。
- 开启 PostgreSQL 自动备份与 PITR（如当前套餐支持），云存储开启版本控制/生命周期策略。
- 监控云函数 5xx、数据库连接耗尽、登录 429、COS 上传失败和存储用量。
- `PGPOOL_MAX` 默认 5，避免无服务器实例扩容时压垮数据库；按数据库连接上限调整。

## Smoke test

将 `API_URL` 替换成 CloudBase HTTP 访问地址：

```bash
curl -sS "$API_URL" -H "content-type: application/json" \
  -d '{"action":"auth.register","data":{"travel_id":"demo001","password":"travel123"}}'

curl -sS "$API_URL" -H "content-type: application/json" \
  -d '{"action":"auth.login","data":{"travel_id":"demo001","password":"wrong123"}}'

curl -sS "$API_URL" -H "content-type: application/json" -H "authorization: Bearer YOUR_TOKEN" \
  -d '{"action":"albums.create","data":{"title":"上海周末","description":"一起走过的街道"}}'
```

第二条必须返回 HTTP 401 和 `INVALID_CREDENTIALS`，不能登录成功。
