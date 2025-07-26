/**
 * Claude Token 管理器的 API 代理处理
 */

import { API_CONFIG, ERROR_CODES } from './config.js';
import { createErrorResponse, isTokenExpired } from './utils.js';

/**
 * 处理 Claude API 代理请求
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

    // 获取请求体
    const requestBody = await request.json();

    // 检查是否为流式请求
    const isStream = requestBody.stream === true;

    // 记录关键请求信息
    console.log(`Claude API 请求: ${isStream ? '流式' : '非流式'}, 大小: ${JSON.stringify(requestBody).length}B`);

    if (isStream) {
      // 处理流式响应
      return handleStreamingResponse(requestBody, token, env);
    } else {
      // 处理非流式响应（保持原有逻辑）
      return handleNonStreamingResponse(requestBody, token, env);
    }

  } catch (error) {
    console.error('API 代理错误:', error.message, '| URL:', request.url);
    return createErrorResponse(ERROR_CODES.API_PROXY_ERROR, `API代理请求失败: ${error.message}`, 502, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
  }
}

/**
 * 处理流式响应
 * @param {Object} requestBody - 请求体
 * @param {Object} token - 访问令牌
 * @param {Object} env - 环境变量
 * @returns {Promise<Response>} 流式响应
 */
async function handleStreamingResponse(requestBody, token, env) {
  try {
    // 发送流式请求到 Claude API
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

    // 检查响应状态
    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error(`Claude API 流式请求失败: ${claudeResponse.status} ${claudeResponse.statusText}`);
      
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

    // 创建可读流来处理 SSE 数据
    const readable = new ReadableStream({
      async start(controller) {
        const reader = claudeResponse.body.getReader();
        const decoder = new TextDecoder();
        
        console.log('开始处理流式响应');
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              console.log('流式响应完成');
              controller.close();
              break;
            }
            
            // 解码数据块并转发
            const chunk = decoder.decode(value, { stream: true });
            controller.enqueue(new TextEncoder().encode(chunk));
          }
        } catch (error) {
          console.error('流式处理错误:', error);
          controller.error(error);
        }
      }
    });

    // 返回流式响应
    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'X-Accel-Buffering': 'no'
      }
    });

  } catch (error) {
    console.error('流式响应处理错误:', error);
    throw error;
  }
}

/**
 * 处理非流式响应
 * @param {Object} requestBody - 请求体
 * @param {Object} token - 访问令牌
 * @param {Object} env - 环境变量
 * @returns {Promise<Response>} 非流式响应
 */
async function handleNonStreamingResponse(requestBody, token, env) {
  // 转发请求到 Claude API
  const startTime = Date.now();
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
  const endTime = Date.now();

  const responseText = await claudeResponse.text();

  // 记录关键响应信息
  console.log(`Claude API 响应: ${claudeResponse.status}, 耗时: ${endTime - startTime}ms, 大小: ${responseText.length}B`);

  return new Response(responseText, {
    status: claudeResponse.status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
