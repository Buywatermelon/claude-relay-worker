/**
 * Claude Token 管理器 - Cloudflare Worker
 * 使用 ES6 导入的模块化版本
 */

import { ERROR_CODES } from './config.js';
import { getTokenPageHTML } from './templates.js';
import {
  handleCorsOptions,
  createErrorResponse,
  createHtmlResponse
} from './utils.js';
import {
  handleGenerateAuthUrl,
  handleExchangeToken,
  handleTokenStatus,
  refreshAccessToken
} from './auth.js';
import { handleMessages } from './api.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 调试日志
    console.log(`请求: ${request.method} ${url.pathname}`);

    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return handleCorsOptions();
    }

    try {
      // 路由处理
      switch (url.pathname) {
        case '/':
        case '/get-token':
          return createHtmlResponse(getTokenPageHTML());

        case '/generate-auth-url':
          return handleGenerateAuthUrl(env);

        case '/exchange-token':
          return handleExchangeToken(request, env);

        case '/token-status':
          return handleTokenStatus(env);

        case '/v1/messages':
          return handleMessages(request, env);

        default:
          return createErrorResponse(ERROR_CODES.SYSTEM_NOT_FOUND, null, 404);
      }
    } catch (error) {
      console.error('Worker错误:', error);
      return createErrorResponse(ERROR_CODES.SYSTEM_INTERNAL_ERROR, `服务器内部错误: ${error.message}`, 500);
    }
  },

  async scheduled(controller, env, ctx) {
    console.log('定时任务开始: Token 自动刷新');
    
    try {
      const result = await refreshAccessToken(env);
      
      if (result.success) {
        console.log(`Token 刷新成功，过期时间: ${new Date(result.expiresAt).toISOString()}`);
      } else {
        console.error(`Token 刷新失败: ${result.error}`);
      }
    } catch (error) {
      console.error('定时任务执行错误:', error);
    }
    
    console.log('定时任务完成');
  }
};
