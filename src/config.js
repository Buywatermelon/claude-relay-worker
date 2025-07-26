/**
 * Claude Token 管理器配置常量
 */

// OAuth 配置
export const OAUTH_CONFIG = {
  AUTHORIZE_URL: 'https://claude.ai/oauth/authorize',
  TOKEN_URL: 'https://console.anthropic.com/v1/oauth/token',
  CLIENT_ID: '9d1c250a-e61b-44d9-88ed-5944d1962f5e',
  REDIRECT_URI: 'https://console.anthropic.com/oauth/code/callback', // 必须使用官方URI
  SCOPES: 'org:create_api_key user:profile user:inference'
};

// API 配置
export const API_CONFIG = {
  CLAUDE_API_URL: 'https://api.anthropic.com/v1/messages',
  ANTHROPIC_VERSION: '2023-06-01',
  ANTHROPIC_BETA: 'claude-code-20250219,oauth-2025-04-20,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14'
};

// CORS 配置
export const CORS_CONFIG = {
  ALLOW_ORIGIN: '*',
  ALLOW_METHODS: 'GET, POST, OPTIONS',
  ALLOW_HEADERS: 'Content-Type, Authorization'
};

// 错误码和错误消息
export const ERROR_CODES = {
  // 认证相关错误 (1xxx)
  AUTH_MISSING_PARAMS: 1001,
  AUTH_TOKEN_EXCHANGE_FAILED: 1002,
  AUTH_NO_TOKEN_FOUND: 1003,
  AUTH_TOKEN_EXPIRED: 1004,
  AUTH_GENERATE_URL_FAILED: 1005,
  AUTH_CHECK_STATUS_FAILED: 1006,
  AUTH_NO_TOKEN_CONFIGURED: 1007,
  AUTH_REFRESH_TOKEN_FAILED: 1008,
  
  // API代理相关错误 (2xxx)
  API_PROXY_ERROR: 2001,
  API_ONLY_POST_MESSAGES: 2002,
  
  // 系统相关错误 (9xxx)
  SYSTEM_INTERNAL_ERROR: 9001,
  SYSTEM_NOT_FOUND: 9404
};

export const ERROR_MESSAGES = {
  // 认证相关错误消息
  [ERROR_CODES.AUTH_MISSING_PARAMS]: '缺少授权码或PKCE参数',
  [ERROR_CODES.AUTH_TOKEN_EXCHANGE_FAILED]: '令牌交换失败',
  [ERROR_CODES.AUTH_NO_TOKEN_FOUND]: '未找到有效令牌',
  [ERROR_CODES.AUTH_TOKEN_EXPIRED]: '令牌已过期',
  [ERROR_CODES.AUTH_GENERATE_URL_FAILED]: '生成授权链接失败',
  [ERROR_CODES.AUTH_CHECK_STATUS_FAILED]: '检查令牌状态失败',
  [ERROR_CODES.AUTH_NO_TOKEN_CONFIGURED]: '未配置令牌',
  [ERROR_CODES.AUTH_REFRESH_TOKEN_FAILED]: '刷新令牌失败',
  
  // API代理相关错误消息
  [ERROR_CODES.API_PROXY_ERROR]: 'API代理请求失败',
  [ERROR_CODES.API_ONLY_POST_MESSAGES]: '仅支持POST /v1/messages请求',
  
  // 系统相关错误消息
  [ERROR_CODES.SYSTEM_INTERNAL_ERROR]: '服务器内部错误',
  [ERROR_CODES.SYSTEM_NOT_FOUND]: '请求的资源不存在'
};

// 成功码和成功消息
export const SUCCESS_CODES = {
  AUTH_TOKEN_OBTAINED: 0,
  AUTH_URL_GENERATED: 0,
  TOKEN_STATUS_CHECKED: 0,
  AUTH_TOKEN_REFRESHED: 0
};

export const SUCCESS_MESSAGES = {
  AUTH_TOKEN_OBTAINED: '令牌获取成功',
  AUTH_URL_GENERATED: '授权链接生成成功',
  TOKEN_STATUS_CHECKED: '令牌状态检查完成',
  AUTH_TOKEN_REFRESHED: '令牌刷新成功'
};

// UI 文本常量
export const UI_TEXT = {
  PAGE_TITLE: 'Claude Token 管理',
  GET_NEW_TOKEN: '获取新的 Claude Token',
  TOKEN_STATUS: 'Token 状态',
  API_USAGE: 'API 使用说明',
  GENERATE_AUTH_LINK: '生成授权链接',
  SUBMIT_AUTH_CODE: '提交授权码',
  CHECK_STATUS: '检查当前状态',
  AUTH_CODE_PLACEHOLDER: '从地址栏复制的完整 code 参数值（可包含 # 符号）',
  AUTH_CODE_HINT: '💡 提示：可以粘贴完整的 URL 片段，系统会自动提取授权码'
};

