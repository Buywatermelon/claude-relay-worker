/**
 * Claude Token 管理器工具函数
 */

import { CORS_CONFIG, ERROR_CODES, ERROR_MESSAGES, SUCCESS_CODES, SUCCESS_MESSAGES } from './config.js';

/**
 * 创建标准化的 JSON 响应
 * @param {any} data - 响应数据
 * @param {number} status - HTTP 状态码
 * @param {boolean} success - 操作是否成功
 * @param {Object} additionalHeaders - 附加的响应头
 * @returns {Response} 格式化的响应
 */
export function createJsonResponse(data, status = 200, success = true, additionalHeaders = {}) {
  const responseData = {
    success,
    code: success ? SUCCESS_CODES.TOKEN_STATUS_CHECKED : (data.code || ERROR_CODES.SYSTEM_INTERNAL_ERROR),
    message: success ? (data.message || SUCCESS_MESSAGES[SUCCESS_CODES.TOKEN_STATUS_CHECKED]) : (data.message || ERROR_MESSAGES[data.code] || '未知错误'),
    data: success ? data : null,
    timestamp: new Date().toISOString()
  };

  const headers = {
    'Content-Type': 'application/json',
    ...additionalHeaders
  };

  return new Response(JSON.stringify(responseData), { status, headers });
}

/**
 * 创建错误响应
 * @param {number} errorCode - 错误码
 * @param {string} customMessage - 自定义错误消息
 * @param {number} status - HTTP 状态码
 * @param {Object} additionalHeaders - 附加的响应头
 * @returns {Response} 错误响应
 */
export function createErrorResponse(errorCode, customMessage = null, status = 400, additionalHeaders = {}) {
  const errorData = {
    code: errorCode,
    message: customMessage || ERROR_MESSAGES[errorCode] || '未知错误'
  };
  return createJsonResponse(errorData, status, false, additionalHeaders);
}

/**
 * 创建成功响应
 * @param {any} data - 响应数据
 * @param {string} customMessage - 自定义成功消息
 * @param {Object} additionalHeaders - 附加的响应头
 * @returns {Response} 成功响应
 */
export function createSuccessResponse(data = null, customMessage = null, additionalHeaders = {}) {
  const responseData = {
    ...data,
    message: customMessage || SUCCESS_MESSAGES[SUCCESS_CODES.TOKEN_STATUS_CHECKED]
  };
  return createJsonResponse(responseData, 200, true, additionalHeaders);
}

/**
 * 创建 HTML 响应
 * @param {string} html - HTML 内容
 * @param {number} status - HTTP 状态码
 * @returns {Response} HTML 响应
 */
export function createHtmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html' }
  });
}

/**
 * 处理 CORS 预检请求
 * @returns {Response} CORS 预检响应
 */
export function handleCorsOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': CORS_CONFIG.ALLOW_ORIGIN,
      'Access-Control-Allow-Methods': CORS_CONFIG.ALLOW_METHODS,
      'Access-Control-Allow-Headers': CORS_CONFIG.ALLOW_HEADERS
    }
  });
}

/**
 * 清理授权码，移除 URL 片段和参数
 * @param {string} code - 原始授权码
 * @returns {string} 清理后的授权码
 */
export function cleanAuthCode(code) {
  if (!code || typeof code !== 'string') {
    return '';
  }
  return code.split('#')[0].split('&')[0].split('?')[0].trim();
}

/**
 * 验证 token 是否过期
 * @param {Object} token - 包含 expires_at 属性的 token 对象
 * @returns {boolean} 如果 token 过期则返回 true
 */
export function isTokenExpired(token) {
  if (!token || !token.expires_at) {
    return true;
  }
  return Date.now() > token.expires_at;
}

/**
 * 创建用于存储的 token 信息对象
 * @param {Object} tokenData - 从 OAuth 响应中获取的原始 token 数据
 * @returns {Object} 格式化的 token 信息
 */
export function createTokenInfo(tokenData) {
  return {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_in: tokenData.expires_in,
    expires_at: Date.now() + (tokenData.expires_in * 1000),
    scope: tokenData.scope,
    token_type: tokenData.token_type || 'Bearer',
    obtained_at: Date.now(),
    source: 'cf-worker-oauth'
  };
}

