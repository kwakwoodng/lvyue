'use strict';

const { dispatch } = require('./lib/service');
const { ApiError } = require('./lib/errors');

const allowedOrigins = new Set(
  String(process.env.CORS_ORIGINS || 'https://lvyue.898812.xyz,https://lvyue.vercel.app')
    .split(',').map(value => value.trim()).filter(Boolean)
);

function requestMethod(event) {
  return String(
    event && (
      event.httpMethod ||
      event.requestContext && event.requestContext.http && event.requestContext.http.method
    ) || ''
  ).toUpperCase();
}

function normalizeEvent(event) {
  if (!event || !event.isBase64Encoded || typeof event.body !== 'string') return event || {};
  return { ...event, body: Buffer.from(event.body, 'base64').toString('utf8'), isBase64Encoded: false };
}

function corsHeaders(event) {
  const requestOrigin = String(event && event.headers && (event.headers.origin || event.headers.Origin) || '');
  const responseOrigin = allowedOrigins.has(requestOrigin) ? requestOrigin : 'https://lvyue.898812.xyz';
  return {
    'content-type': 'application/json; charset=utf-8',
    // This function is called by the browser through the CloudBase HTTP
    // gateway. Keep the production origin explicit so an empty/missing Origin
    // value in the gateway event can never produce an invalid CORS response.
    'access-control-allow-origin': responseOrigin,
    'access-control-allow-methods': 'POST,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization',
    'access-control-max-age': '86400',
    vary: 'Origin'
  };
}

exports.main = async event => {
  const normalized = normalizeEvent(event);
  const isHttp = Boolean(normalized && (requestMethod(normalized) || normalized.headers));
  const headers = corsHeaders(normalized);
  if (requestMethod(normalized) === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  try {
    const data = await dispatch(normalized);
    const payload = { ok: true, data };
    return isHttp ? { statusCode: 200, headers, body: JSON.stringify(payload) } : payload;
  } catch (error) {
    const expected = error instanceof ApiError;
    if (!expected) console.error(error);
    const payload = {
      ok: false,
      error: {
        code: expected ? error.code : 'INTERNAL_ERROR',
        message: expected ? error.message : '服务暂时不可用，请稍后重试',
        ...(expected && error.details ? { details: error.details } : {})
      }
    };
    return isHttp
      ? { statusCode: expected ? error.status : 500, headers, body: JSON.stringify(payload) }
      : payload;
  }
};
