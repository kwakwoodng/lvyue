'use strict';

const COS = require('cos-nodejs-sdk-v5');
const crypto = require('crypto');
const path = require('path');
const { assert } = require('./errors');

function storageConfig() {
  const config = {
    Bucket: process.env.COS_BUCKET || process.env.TCB_STORAGE_BUCKET,
    Region: process.env.TCB_STORAGE_REGION || 'ap-shanghai',
    SecretId: process.env.TENCENTCLOUD_SECRETID || process.env.TENCENT_SECRET_ID,
    SecretKey: process.env.TENCENTCLOUD_SECRETKEY || process.env.TENCENT_SECRET_KEY,
    SecurityToken: process.env.TENCENTCLOUD_SESSIONTOKEN || process.env.TENCENT_SESSION_TOKEN
  };
  assert(config.Bucket && config.SecretId && config.SecretKey, 500, 'STORAGE_CONFIG_ERROR', '云存储环境变量未正确配置');
  assert(
    /^[a-z0-9][a-z0-9-]*-\d{5,}$/.test(config.Bucket),
    500,
    'STORAGE_BUCKET_INVALID',
    'COS_BUCKET 必须填写带 APPID 后缀的完整存储桶名称，例如 lvyue-media-1234567890'
  );
  return config;
}

function cosClient(config) {
  return new COS({ SecretId: config.SecretId, SecretKey: config.SecretKey, SecurityToken: config.SecurityToken });
}

function safeExtension(name, mimeType) {
  const allowed = {
    'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif',
    'video/mp4': '.mp4', 'video/quicktime': '.mov', 'video/webm': '.webm'
  };
  const ext = allowed[mimeType];
  assert(ext, 400, 'UNSUPPORTED_MEDIA_TYPE', '不支持该文件格式');
  const supplied = path.extname(String(name || '')).toLowerCase();
  return supplied && supplied.length <= 6 ? ext : ext;
}

function mediaKind(mimeType) {
  return String(mimeType).startsWith('video/') ? 'video' : 'image';
}

function assertFileSize(mimeType, size, purpose) {
  const bytes = Number(size || 0);
  const max = purpose === 'avatar' ? 5 * 1024 * 1024 : mediaKind(mimeType) === 'video' ? 500 * 1024 * 1024 : 50 * 1024 * 1024;
  assert(Number.isSafeInteger(bytes) && bytes > 0 && bytes <= max, 400, 'INVALID_FILE_SIZE', `文件大小必须在 1 字节到 ${Math.round(max/1024/1024)}MB 之间`);
}

function createObjectKey({ purpose, userId, albumId, originalName, mimeType }) {
  const ext = safeExtension(originalName, mimeType);
  const id = crypto.randomUUID();
  if (purpose === 'avatar') return `avatars/${userId}/${id}${ext}`;
  if (purpose === 'cover') return `albums/${albumId}/covers/${id}${ext}`;
  return `albums/${albumId}/media/${userId}/${id}${ext}`;
}

function signedUrl(method, key, expiresSeconds, headers) {
  const config = storageConfig();
  const cos = cosClient(config);
  return new Promise((resolve, reject) => {
    cos.getObjectUrl({
      Bucket: config.Bucket,
      Region: config.Region,
      Key: key,
      Method: method,
      Expires: Number(expiresSeconds || 600),
      Headers: headers || {},
      Sign: true
    }, (error, data) => error ? reject(error) : resolve(data.Url));
  });
}

async function objectExists(key) {
  const config = storageConfig();
  const cos = cosClient(config);
  return new Promise((resolve, reject) => {
    cos.headObject({ Bucket: config.Bucket, Region: config.Region, Key: key }, (error, data) => {
      if (error && (error.statusCode === 404 || error.code === 'NoSuchKey')) return resolve(false);
      if (error) return reject(error);
      resolve(Boolean(data));
    });
  });
}

async function deleteObject(key) {
  const config = storageConfig();
  const cos = cosClient(config);
  return new Promise((resolve, reject) => {
    cos.deleteObject({ Bucket: config.Bucket, Region: config.Region, Key: key }, (error, data) => error ? reject(error) : resolve(data));
  });
}

module.exports = { mediaKind, assertFileSize, createObjectKey, signedUrl, objectExists, deleteObject };
