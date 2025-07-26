/**
 * Claude Token 管理器的 OAuth 身份验证处理
 */

import { OAUTH_CONFIG, ERROR_CODES, SUCCESS_MESSAGES } from './config.js';
import { createErrorResponse, createSuccessResponse, cleanAuthCode, createTokenInfo } from './utils.js';

/**
 * 为 OAuth 流程生成 PKCE 参数
 * @returns {Promise<Object>} PKCE 参数对象
 */
export async function generatePKCE() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const codeVerifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const state = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return { codeVerifier, codeChallenge, state };
}

/**
 * 生成 OAuth 授权 URL
 * @param {Object} env - 环境变量
 * @returns {Promise<Response>} 包含授权 URL 的响应
 */
export async function handleGenerateAuthUrl(env) {
  try {
    const pkce = await generatePKCE();
    
    // 生成授权 URL
    const params = new URLSearchParams({
      code: 'true',
      client_id: OAUTH_CONFIG.CLIENT_ID,
      response_type: 'code',
      redirect_uri: OAUTH_CONFIG.REDIRECT_URI,
      scope: OAUTH_CONFIG.SCOPES,
      code_challenge: pkce.codeChallenge,
      code_challenge_method: 'S256',
      state: pkce.state
    });

    const authURL = `${OAUTH_CONFIG.AUTHORIZE_URL}?${params.toString()}`;
    
    return createSuccessResponse({
      authUrl: authURL,
      pkce: pkce,
      instructions: '请在新窗口中完成授权，然后从地址栏复制 code 参数的值'
    }, SUCCESS_MESSAGES.AUTH_URL_GENERATED);
  } catch (error) {
    console.error('生成授权URL错误:', error);
    return createErrorResponse(ERROR_CODES.AUTH_GENERATE_URL_FAILED, `生成授权URL失败: ${error.message}`, 500);
  }
}

/**
 * 交换授权码为访问令牌
 * @param {Request} request - HTTP 请求
 * @param {Object} env - 环境变量
 * @returns {Promise<Response>} 包含令牌交换结果的响应
 */
export async function handleExchangeToken(request, env) {
  try {
    let { code, pkce } = await request.json();
    
    if (!code || !pkce) {
      return createErrorResponse(ERROR_CODES.AUTH_MISSING_PARAMS, null, 400);
    }
    
    // 清理授权码
    code = cleanAuthCode(code);
    
    // 与 OAuth 提供商交换令牌
    const tokenResponse = await fetch(OAUTH_CONFIG.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Claude-CF-Worker/1.0)',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: OAUTH_CONFIG.CLIENT_ID,
        code: code,
        redirect_uri: OAUTH_CONFIG.REDIRECT_URI,
        code_verifier: pkce.codeVerifier,
        state: pkce.state
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`令牌交换失败: ${tokenResponse.status} ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    
    // 创建令牌信息并保存到 KV
    const tokenInfo = createTokenInfo(tokenData);
    await env.CLAUDE_KV.put('claude_token', JSON.stringify(tokenInfo));
    
    return createSuccessResponse({
      expiresAt: tokenInfo.expires_at
    }, SUCCESS_MESSAGES.AUTH_TOKEN_OBTAINED);
    
  } catch (error) {
    console.error('交换令牌错误:', error);
    return createErrorResponse(ERROR_CODES.AUTH_TOKEN_EXCHANGE_FAILED, `交换令牌失败: ${error.message}`, 500);
  }
}

/**
 * 检查当前令牌状态
 * @param {Object} env - 环境变量
 * @returns {Promise<Response>} 包含令牌状态的响应
 */
export async function handleTokenStatus(env) {
  try {
    const tokenData = await env.CLAUDE_KV.get('claude_token');

    if (!tokenData) {
      return createSuccessResponse({
        hasToken: false
      }, '未找到有效令牌');
    }

    const token = JSON.parse(tokenData);
    const isExpired = Date.now() > token.expires_at;

    return createSuccessResponse({
      hasToken: true,
      isExpired: isExpired,
      expiresAt: token.expires_at,
      obtainedAt: token.obtained_at,
      scope: token.scope
    }, SUCCESS_MESSAGES.TOKEN_STATUS_CHECKED);
  } catch (error) {
    console.error('检查令牌状态错误:', error);
    return createErrorResponse(ERROR_CODES.AUTH_CHECK_STATUS_FAILED, `检查令牌状态失败: ${error.message}`, 500);
  }
}

/**
 * 使用 refresh token 刷新访问令牌
 * @param {Object} env - 环境变量
 * @returns {Promise<Object>} 刷新结果
 */
export async function refreshAccessToken(env) {
  try {
    // 从 KV 获取当前存储的令牌信息
    const tokenData = await env.CLAUDE_KV.get('claude_token');
    if (!tokenData) {
      throw new Error('未找到存储的令牌信息');
    }

    const currentToken = JSON.parse(tokenData);
    if (!currentToken.refresh_token) {
      throw new Error('未找到 refresh_token');
    }

    console.log('开始刷新令牌');

    // 调用 refresh token 接口
    const refreshResponse = await fetch(OAUTH_CONFIG.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'claude-cli/1.0.56 (external, cli)',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://claude.ai/',
        'Origin': 'https://claude.ai'
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: currentToken.refresh_token,
        client_id: OAUTH_CONFIG.CLIENT_ID
      })
    });

    if (!refreshResponse.ok) {
      const errorText = await refreshResponse.text();
      throw new Error(`刷新令牌失败: ${refreshResponse.status} ${errorText}`);
    }

    const newTokenData = await refreshResponse.json();
    console.log('令牌刷新成功');

    // 创建新的令牌信息并保存到 KV
    const newTokenInfo = createTokenInfo(newTokenData);
    await env.CLAUDE_KV.put('claude_token', JSON.stringify(newTokenInfo));

    return {
      success: true,
      message: SUCCESS_MESSAGES.AUTH_TOKEN_REFRESHED,
      expiresAt: newTokenInfo.expires_at
    };

  } catch (error) {
    console.error('刷新令牌错误:', error);
    return {
      success: false,
      error: error.message
    };
  }
}