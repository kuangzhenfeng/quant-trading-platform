import axios from 'axios';

const API_BASE = 'http://localhost:8000';
const TOKEN_KEY = 'auth_token';

/** 登录请求 */
export interface LoginRequest {
  username: string;
  password: string;
}

/** Token 响应 */
export interface TokenResponse {
  access_token: string;
  token_type: string;
}

/** 用户信息 */
export interface UserInfo {
  username: string;
  created_at: string;
}

/** 认证服务 */
export const authService = {
  /** 用户登录 */
  async login(username: string, password: string): Promise<string> {
    const response = await axios.post<TokenResponse>(`${API_BASE}/api/auth/login`, {
      username,
      password,
    });
    const token = response.data.access_token;
    localStorage.setItem(TOKEN_KEY, token);
    return token;
  },

  /** 用户登出 */
  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
  },

  /** 获取 token */
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  /** 获取当前用户信息 */
  async getCurrentUser(): Promise<UserInfo> {
    const token = this.getToken();
    const response = await axios.get<UserInfo>(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  /** 用户注册 */
  async register(username: string, password: string): Promise<UserInfo> {
    const response = await axios.post<UserInfo>(`${API_BASE}/api/auth/register`, {
      username,
      password,
    });
    return response.data;
  },
};
