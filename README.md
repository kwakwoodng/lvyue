# 旅页

旅页是一款面向朋友、恋人和家人的旅行共享相簿手机网页。正式方案为 GitHub + Vercel 前端、腾讯云 CloudBase 上海后端、Tencent PostgreSQL 数据库和私有云存储。

## 本地预览

不要双击 `index.html`，请启动本地服务器：

```bash
npm run dev
```

然后打开 `http://127.0.0.1:4173/`。

## 生产构建

在项目根目录创建未提交的 `.env.local`：

```text
VITE_CLOUDBASE_ENV_ID=lvyue-d6gyatb4a502c0235
VITE_CLOUDBASE_REGION=ap-shanghai
VITE_CLOUDBASE_ACCESS_KEY=CloudBase Publishable Key
```

执行：

```bash
npm run build
```

构建结果位于 `dist/`。构建脚本不依赖第三方前端包；Vercel 使用 `vercel.json` 自动执行同一命令。

## 部署

完整步骤见 [docs/DEPLOY.md](docs/DEPLOY.md)。核心顺序：

1. 部署 `cloudfunctions/lvyue-api` 并填写数据库、JWT、COS 环境变量。
2. 确认云函数与数据库处于同一 VPC/子网，私有 Bucket 已配置上传 CORS。
3. 推送到 GitHub 仓库 `kwakwoodng/lvyue`。
4. Vercel 导入仓库，Build Command 使用 `npm run build`，Output Directory 使用 `dist`。
5. 在 Vercel 配置三个 `VITE_CLOUDBASE_*` 环境变量。
6. 部署后将 Vercel Production 域名和自定义域名加入 CloudBase Web 安全域名。

## 安全要求

- `.env.local`、数据库密码、`APP_JWT_SECRET`、腾讯云永久 SecretId/SecretKey 不得提交 GitHub。
- `VITE_CLOUDBASE_ACCESS_KEY` 必须是 CloudBase Publishable Key，不是永久管理密钥。
- 云存储保持私有；网页只使用后端生成的短期签名 URL。
- `COS_BUCKET` 必须填写带 APPID 后缀的完整 Bucket 名。

## 上线验收

- 相同旅页 ID 只能对应一个账号和密码；错误密码显示 toast。
- 头像更新后在好友卡片、成员、评论和消息中心同步。
- 好友申请、相簿邀请、创建者审核、点赞、评论及回复均写入云端通知。
- 上传照片或视频后刷新仍存在，可以查看、滑动和下载原图。
- 相簿分类与相簿内分类可改名、删除、移动和长按排序。

