'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('./db');
const { ApiError, assert } = require('./errors');

const TRAVEL_ID_RE = /^[A-Za-z0-9]{1,20}$/;
const BCRYPT_COST = Number(process.env.BCRYPT_COST || 12);

function jwtSecret() {
  const value = process.env.APP_JWT_SECRET;
  assert(value && value.length >= 32, 500, 'SERVER_CONFIG_ERROR', '服务端登录密钥未正确配置');
  return value;
}

function normalizeTravelId(value) {
  const travelId = String(value || '').trim();
  assert(TRAVEL_ID_RE.test(travelId), 400, 'INVALID_TRAVEL_ID', '旅页 ID 只能包含 1–20 位数字或字母');
  return travelId;
}

function validatePassword(value) {
  const password = String(value || '');
  assert(password.length >= 6 && password.length <= 72, 400, 'INVALID_PASSWORD', '密码长度需为 6–72 位');
  return password;
}

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_COST);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function issueToken(user) {
  return jwt.sign(
    { sub: user.id, tid: user.travel_id, ver: user.token_version, typ: 'access' },
    jwtSecret(),
    { algorithm: 'HS256', expiresIn: process.env.APP_JWT_TTL || '7d', issuer: 'lvyue-api', audience: 'lvyue-web' }
  );
}

function tokenFromEvent(event) {
  const headers = event.headers || {};
  const authorization = headers.authorization || headers.Authorization || '';
  if (/^Bearer\s+/i.test(authorization)) return authorization.replace(/^Bearer\s+/i, '').trim();
  return String(event.token || (event.data && event.data.token) || '');
}

async function authenticate(event) {
  const token = tokenFromEvent(event);
  assert(token, 401, 'AUTH_REQUIRED', '请先登录');
  let claims;
  try {
    claims = jwt.verify(token, jwtSecret(), {
      algorithms: ['HS256'], issuer: 'lvyue-api', audience: 'lvyue-web'
    });
  } catch (error) {
    throw new ApiError(401, 'INVALID_TOKEN', '登录状态已失效，请重新登录');
  }
  const result = await query(
    `select id, travel_id, nickname, avatar_path, token_version, created_at
       from app_users where id=$1 and disabled_at is null`, [claims.sub]
  );
  const user = result.rows[0];
  assert(user && Number(user.token_version) === Number(claims.ver), 401, 'INVALID_TOKEN', '登录状态已失效，请重新登录');
  return user;
}

function clientIp(event) {
  const headers = event.headers || {};
  return String(headers['x-forwarded-for'] || headers['X-Forwarded-For'] || event.clientIP || 'unknown')
    .split(',')[0].trim().slice(0, 64);
}

async function checkLoginRateLimit(event, travelId) {
  const key = crypto.createHash('sha256').update(`${clientIp(event)}:${String(travelId).toLowerCase()}`).digest('hex');
  const result = await query(
    `select count(*)::int as attempts from auth_login_attempts
      where attempt_key=$1 and succeeded=false and created_at > now() - interval '15 minutes'`, [key]
  );
  assert(result.rows[0].attempts < 10, 429, 'TOO_MANY_ATTEMPTS', '尝试次数过多，请 15 分钟后再试');
  return key;
}

async function recordLoginAttempt(attemptKey, succeeded) {
  await query('insert into auth_login_attempts(attempt_key,succeeded) values($1,$2)', [attemptKey, succeeded]);
}

module.exports = {
  normalizeTravelId, validatePassword, hashPassword, verifyPassword,
  issueToken, authenticate, checkLoginRateLimit, recordLoginAttempt
};
