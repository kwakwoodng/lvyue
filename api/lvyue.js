'use strict';

const CLOUD_ENDPOINT =
  'https://lvyue-d6gyatb4a502c0235-1329666616.ap-shanghai.app.tcloudbase.com/lvyue-api';
const MAX_BODY_BYTES = 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 25000;

function sendJson(response, status, payload) {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.setHeader('cache-control', 'no-store');
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  if (request.body && typeof request.body === 'object') {
    return Promise.resolve(JSON.stringify(request.body));
  }
  if (typeof request.body === 'string') return Promise.resolve(request.body);

  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        const error = new Error('REQUEST_TOO_LARGE');
        error.code = 'REQUEST_TOO_LARGE';
        reject(error);
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

module.exports = async function handler(request, response) {
  if (request.method === 'GET') {
    return sendJson(response, 200, {
      ok: true,
      service: 'lvyue-web-proxy',
      version: '2026-07-23.1'
    });
  }

  if (request.method !== 'POST') {
    response.setHeader('allow', 'GET, POST');
    return sendJson(response, 405, {
      ok: false,
      error: { code: 'METHOD_NOT_ALLOWED', message: '仅支持 POST 请求' }
    });
  }

  try {
    const body = await readBody(request);
    JSON.parse(body || '{}');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    let upstream;
    try {
      upstream = await fetch(CLOUD_ENDPOINT, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'user-agent': 'lvyue-vercel-proxy/1.0'
        },
        body,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }

    const text = await upstream.text();
    response.statusCode = upstream.status;
    response.setHeader(
      'content-type',
      upstream.headers.get('content-type') || 'application/json; charset=utf-8'
    );
    response.setHeader('cache-control', 'no-store');
    response.end(text);
  } catch (error) {
    const tooLarge = error && error.code === 'REQUEST_TOO_LARGE';
    const invalidJson = error instanceof SyntaxError;
    const timeout = error && error.name === 'AbortError';
    return sendJson(response, tooLarge ? 413 : invalidJson ? 400 : timeout ? 504 : 502, {
      ok: false,
      error: {
        code: tooLarge
          ? 'REQUEST_TOO_LARGE'
          : invalidJson
            ? 'INVALID_JSON'
            : timeout
              ? 'UPSTREAM_TIMEOUT'
              : 'UPSTREAM_UNAVAILABLE',
        message: tooLarge
          ? '请求内容过大'
          : invalidJson
            ? '请求格式错误'
            : timeout
              ? '云端响应超时，请稍后重试'
              : '云端连接暂时不可用，请稍后重试'
      }
    });
  }
};
