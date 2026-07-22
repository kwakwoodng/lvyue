'use strict';

const crypto = require('crypto');
const CloudBaseModule = require('@cloudbase/manager-node');
const { assert } = require('./errors');

const CloudBase = CloudBaseModule.default || CloudBaseModule;
let manager;

function storageConfig() {
  const config = {
    bucketId: process.env.TCB_STORAGE_BUCKET || 'lvyue-media',
    envId: process.env.TCB_ENV_ID || process.env.TCB_ENV,
    apiKey: process.env.TCB_API_KEY,
    secretId: process.env.TENCENTCLOUD_SECRETID || process.env.TENCENT_SECRET_ID,
    secretKey: process.env.TENCENTCLOUD_SECRETKEY || process.env.TENCENT_SECRET_KEY,
    token: process.env.TENCENTCLOUD_SESSIONTOKEN || process.env.TENCENT_SESSION_TOKEN
  };
  assert(config.bucketId && config.envId && config.apiKey, 500, 'STORAGE_CONFIG_ERROR', '云存储环境变量未正确配置');
  return config;
}

function storageManager(config) {
  if (!manager) {
    const options = { envId: config.envId };
    if (config.secretId) options.secretId = config.secretId;
    if (config.secretKey) options.secretKey = config.secretKey;
    if (config.token) options.token = config.token;
    manager = new CloudBase(options);
  }
  return manager.storage;
}

function safeExtension(name, mimeType) {
  const allowed = {
    'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif',
    'video/mp4': '.mp4', 'video/quicktime': '.mov', 'video/webm': '.webm'
  };
  const ext = allowed[mimeType];
  assert(ext, 400, 'UNSUPPORTED_MEDIA_TYPE', '不支持该文件格式');
  return ext;
}

function mediaKind(mimeType) {
  return String(mimeType).startsWith('video/') ? 'video' : 'image';
}

function assertFileSize(mimeType, size, purpose) {
  const bytes = Number(size || 0);
  const max = purpose === 'avatar'
    ? 5 * 1024 * 1024
    : mediaKind(mimeType) === 'video'
      ? 500 * 1024 * 1024
      : 50 * 1024 * 1024;
  assert(Number.isSafeInteger(bytes) && bytes > 0 && bytes <= max, 400, 'INVALID_FILE_SIZE', `文件大小必须在 1 字节到 ${Math.round(max / 1024 / 1024)}MB 之间`);
}

function createObjectKey({ purpose, userId, albumId, originalName, mimeType }) {
  const ext = safeExtension(originalName, mimeType);
  const objectId = crypto.randomUUID();
  if (purpose === 'avatar') return `avatars/${userId}/${objectId}${ext}`;
  if (purpose === 'cover') return `albums/${albumId}/covers/${objectId}${ext}`;
  return `albums/${albumId}/media/${userId}/${objectId}${ext}`;
}

async function createSignedUpload(objectName) {
  const config = storageConfig();
  const result = await storageManager(config).signUploadObject({
    bucketId: config.bucketId,
    objectName,
    upsert: false,
    accessToken: config.apiKey,
    envId: config.envId
  });
  return { bucketId: config.bucketId, url: result.url, token: result.token };
}

async function signedUrl(method, objectName, expiresSeconds) {
  assert(String(method || 'GET').toUpperCase() === 'GET', 500, 'STORAGE_METHOD_ERROR', '仅支持生成下载链接');
  const config = storageConfig();
  const result = await storageManager(config).signObject({
    bucketId: config.bucketId,
    objectName,
    expiresIn: Number(expiresSeconds || 600),
    accessToken: config.apiKey,
    envId: config.envId
  });
  return result.signedURL;
}

async function objectExists(objectName) {
  const config = storageConfig();
  const result = await storageManager(config).listObjects({
    bucketId: config.bucketId,
    prefix: objectName,
    limit: 10,
    accessToken: config.apiKey,
    envId: config.envId
  });
  return Array.isArray(result.objects) && result.objects.some(item => item.name === objectName);
}

async function deleteObject(objectName) {
  const config = storageConfig();
  return storageManager(config).deleteObject({
    bucketId: config.bucketId,
    objectName,
    accessToken: config.apiKey,
    envId: config.envId
  });
}

module.exports = {
  mediaKind,
  assertFileSize,
  createObjectKey,
  createSignedUpload,
  signedUrl,
  objectExists,
  deleteObject
};
