# 旅页上线清单（GitHub + Vercel + 腾讯云 CloudBase）

正式架构：Vercel 发布手机网页；CloudBase 上海环境运行 `lvyue-api` 云函数；腾讯 PostgreSQL 保存业务数据；私有云存储保存头像、封面、照片和视频。

## 1. 腾讯云已完成项

- 环境：`lvyue-d6gyatb4a502c0235`，地域 `ap-shanghai`
- PostgreSQL 实例：`postgres-pea9ibc0`
- 私网地址：`172.17.0.15:5432`
- 数据库账号：`lvyue_api`
- 数据表：已执行 `001_initial.sql`
- 权限：已执行 `004_grant_api_role.sql`
- 私有存储桶：控制台显示名 `lvyue-media`

上线前还要确认 `003_security_lockdown.sql` 已成功执行。它用于撤销公开角色对数据库对象的访问；若之前出现 transaction aborted，请先执行 `rollback;`，再重新完整执行该文件。

## 2. 找到完整 COS Bucket 名

云函数使用 COS 签名 URL，环境变量 `COS_BUCKET` 不能只填 `lvyue-media`，必须填写带数字 APPID 后缀的完整名称，例如：

```text
lvyue-media-1234567890
```

在 CloudBase **云存储 → 存储管理** 中点击 `lvyue-media` 进入详情，复制完整 Bucket 名。不要把 SecretId、SecretKey 或数据库密码发到聊天、GitHub 或前端环境变量。

## 3. 部署 `lvyue-api` 云函数

在 **CloudBase → 云函数/托管** 新建 Node.js 18 或更高版本函数，名称必须为 `lvyue-api`，代码目录使用 `cloudfunctions/lvyue-api`。函数应连接与 PostgreSQL 相同的 VPC/子网。

在函数环境变量中填写：

```text
PGHOST=172.17.0.15
PGPORT=5432
PGDATABASE=postgres
PGUSER=lvyue_api
PGPASSWORD=你创建数据库账号时设置的密码
PGSSL=false
PGPOOL_MAX=5
APP_JWT_SECRET=至少32字节的随机字符串
APP_JWT_TTL=7d
BCRYPT_COST=12
TCB_ENV_ID=lvyue-d6gyatb4a502c0235
TCB_STORAGE_BUCKET=lvyue-media
TCB_API_KEY=在 CloudBase API Key 页面创建的服务端密钥
CORS_ORIGINS=https://你的项目.vercel.app,https://你的自定义域名
```

`TCB_API_KEY` 只放在云函数环境变量中，不要提交到 GitHub，也不要放进 Vercel 前端变量。

## 4. 存储桶跨域

浏览器通过短期上传令牌直传原图/视频，因此 Bucket 的 CORS 需要允许 Vercel 正式域名和自定义域名：

- Allowed Origin：正式 `https://*.vercel.app` 域名的精确值及自定义域名
- Allowed Methods：`GET`、`HEAD`、`PUT`、`POST`
- Allowed Headers：`content-type`、`authorization`、`x-cos-*`
- Expose Headers：`ETag`

正式环境尽量使用精确域名，不使用 `*`。

## 5. Vercel

从 GitHub 导入 `kwakwoodng/lvyue`：

- Framework Preset：`Other`
- Build Command：`npm run build`
- Output Directory：`dist`
- 环境变量：`VITE_CLOUDBASE_ENV_ID`、`VITE_CLOUDBASE_REGION`、`VITE_CLOUDBASE_ACCESS_KEY`

`VITE_CLOUDBASE_ACCESS_KEY` 是 CloudBase Publishable Key，可进入网页构建；数据库密码、JWT 密钥和腾讯云永久密钥绝不能放入 Vercel 前端变量。

部署成功后，在 CloudBase Web 安全域名中加入固定的 Vercel Production 域名和自定义域名。

## 6. 上线验收

依次测试两个新账号：注册 → 错误密码提示 → 添加好友 → 同意好友 → 创建相簿 → 邀请成员 → 上传头像/照片/视频 → 刷新后仍存在 → 点赞/评论/回复 → 消息中心收到记录 → 下载原图。
