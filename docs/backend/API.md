# `lvyue-api` action 清单

所有请求均为 `POST application/json`：

```json
{ "action": "albums.list", "data": {}, "token": "可选：建议改用 Authorization Bearer" }
```

成功返回 `{ "ok": true, "data": ... }`；失败返回 `{ "ok": false, "error": { "code", "message" } }`。除注册、登录外应发送 `Authorization: Bearer <token>`。

## 账号与资料

| Action | 主要 data |
|---|---|
| `auth.register` | `travel_id`, `password` |
| `auth.login` | `travel_id`, `password` |
| `auth.me` | — |
| `auth.logoutAll` | — |
| `profile.update` | `nickname` |
| `users.find` | `travel_id` |

头像更新走 `storage.prepareUpload`（`purpose=avatar`）与 `storage.completeUpload`。

## 好友

| Action | 主要 data |
|---|---|
| `friends.list` / `friends.requests` | — |
| `friends.request` | `travel_id` |
| `friends.respond` | `request_id`, `accept` |
| `friends.detail.update` | `friend_id`, `remark`, `description` |
| `friends.remove` | `friend_id` |

## 相簿、邀请和个人相簿分类

| Action | 主要 data |
|---|---|
| `albums.create` | `title`, `description` |
| `albums.list` | — |
| `albums.get` | `album_id` |
| `albums.update` | `album_id`, `title`, `description` |
| `albums.delete` | `album_id` |
| `albums.invite` | `album_id`, `user_id` |
| `albums.invites` | — |
| `albums.invite.respond` | `membership_id`, `accept` |
| `albums.reviews` | `album_id` |
| `albums.review.respond` | `membership_id`, `approve` |
| `folders.list` / `folders.create` | `name`（create） |
| `folders.update` / `folders.delete` | `folder_id`, `name`（update） |
| `folders.reorder` | `folder_ids`（完整顺序） |
| `folders.assignAlbum` | `album_id`, `folder_id`；空 `folder_id` 表示移出分类 |

## 相簿内人物分类

| Action | 主要 data |
|---|---|
| `categories.create` | `album_id`, `name` |
| `categories.update` | `category_id`, `name` |
| `categories.delete` | `category_id` |
| `categories.reorder` | `album_id`, `category_ids`（完整顺序） |

“全部”是前端虚拟 tab，不写数据库。媒体可同时关联多个 `category_id`。

## 文件、媒体、点赞和评论

| Action | 主要 data |
|---|---|
| `storage.prepareUpload` | `purpose`, `album_id?`, `original_name`, `mime_type`, `byte_size` |
| `storage.completeUpload` | `upload_intent_id`, `object_key`, `category_ids?`, `captured_at?` |
| `storage.assetUrl` | `kind` (`avatar`/`cover`), `user_id?`, `album_id?` |
| `media.list` | `album_id` |
| `media.url` | `media_id` |
| `media.delete` | `media_id` |
| `media.useAsCover` | `media_id`（仅图片） |
| `likes.toggle` | `media_id` |
| `comments.list` | `media_id` |
| `comments.create` | `media_id`, `body`, `parent_id?` |
| `comments.delete` | `comment_id` |

直接上传新封面使用 `purpose=cover`；从相簿已有照片选择封面使用 `media.useAsCover`。

## 消息中心

| Action | 主要 data |
|---|---|
| `notifications.list` | `limit?`, `before?` |
| `notifications.read` | `notification_id` |
| `notifications.readAll` | — |

消息涵盖好友申请/同意、相簿邀请/加入/审核、成员上传、点赞、评论和任意层级回复。消息列表实时 join 操作者资料，不复制旧头像。
