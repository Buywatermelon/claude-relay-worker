/**
 * Claude Token 管理器的 API 代理处理
 */

import { API_CONFIG, ERROR_CODES } from './config.js';
import { createErrorResponse, isTokenExpired } from './utils.js';

/**
 * 处理 Claude API 代理请求 - 简化版测试
 * @param {Request} request - HTTP 请求
 * @param {Object} env - 环境变量
 * @returns {Promise<Response>} 来自 Claude API 的代理响应
 */
export async function handleMessages(request, env) {
  const url = new URL(request.url);

  // 验证请求方法和路径
  if (request.method !== 'POST' || url.pathname !== '/v1/messages') {
    return createErrorResponse(ERROR_CODES.API_ONLY_POST_MESSAGES, null, 404, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
  }

  try {
    // 从 KV 获取存储的令牌
    const tokenData = await env.CLAUDE_KV.get('claude_token');
    if (!tokenData) {
      return createErrorResponse(ERROR_CODES.AUTH_NO_TOKEN_CONFIGURED, '请访问 /get-token 设置身份验证', 401, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });
    }

    const token = JSON.parse(tokenData);

    // 检查令牌是否过期
    if (isTokenExpired(token)) {
      return createErrorResponse(ERROR_CODES.AUTH_TOKEN_EXPIRED, '请访问 /get-token 刷新您的令牌', 401, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });
    }

    // 获取请求体并转发到 Claude API
    const requestBody = await request.json();
    const isStream = requestBody.stream === true;
    
    console.log(`🚀 Claude API: ${isStream ? '🌊' : '📄'}, ${JSON.stringify(requestBody).length}B`);

    const claudeResponse = await fetch(API_CONFIG.CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
        'anthropic-version': API_CONFIG.ANTHROPIC_VERSION,
        'anthropic-beta': API_CONFIG.ANTHROPIC_BETA
      },
      body: JSON.stringify(requestBody)
    });

    const responseContentType = claudeResponse.headers.get('Content-Type');
    const isStreamResponse = responseContentType?.includes('text/event-stream');
    
    console.log(`📡 响应: ${claudeResponse.status}, ${isStreamResponse ? '🌊' : '📄'}`);

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error(`❌ 请求失败: ${claudeResponse.status}`);
      return new Response(errorText, {
        status: claudeResponse.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }

    // 直接转发响应体（支持流式和非流式）
    return new Response(claudeResponse.body, {
      status: claudeResponse.status,
      headers: {
        'Content-Type': responseContentType || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        ...(isStreamResponse && {
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no'
        })
      }
    });

  } catch (error) {
    console.error('❌ API 代理错误:', error.message, '| URL:', request.url);
    return createErrorResponse(ERROR_CODES.API_PROXY_ERROR, `API代理请求失败: ${error.message}`, 502, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
  }
}