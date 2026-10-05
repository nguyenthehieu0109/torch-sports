const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

async function request<T = unknown>(method: string, path: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  } catch {
    throw new ApiError('Không thể kết nối tới máy chủ. Vui lòng thử lại sau.', 0);
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 429) {
      throw new ApiError('Bạn thao tác quá nhanh. Vui lòng đợi 1 phút rồi thử lại.', 429);
    }
    // NestJS ValidationPipe trả message dạng mảng
    const message = Array.isArray(data?.message) ? data.message[0] : data?.message;
    throw new ApiError(message || 'Đã có lỗi xảy ra. Vui lòng thử lại.', res.status);
  }

  return data as ApiResponse<T>;
}

async function post<T = unknown>(path: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
  return request<T>('POST', path, body, options);
}

async function get<T = unknown>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  return request<T>('GET', path, undefined, options);
}

// ─── Types ─────────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
}

export interface SocialLoginPayload {
  provider: 'google' | 'facebook' | 'github' | 'linkedin' | 'zalo';
  providerId: string;
  email?: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

// ─── Auth API ──────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    post<({ user: AuthUser } & AuthTokens) | { requires2FA: true; tempToken: string }>('/auth/login', { email, password }),

  socialLogin: (payload: SocialLoginPayload) =>
    post<({ user: AuthUser } & AuthTokens) | { requires2FA: true; tempToken: string }>('/auth/social-login', payload),

  login2FA: (tempToken: string, code: string) =>
    post<{ user: AuthUser } & AuthTokens>('/auth/2fa/login', { tempToken, code }),

  get2FAStatus: (token: string) =>
    get<{ enabled: boolean }>('/auth/2fa/status', { headers: { Authorization: `Bearer ${token}` } }),

  setup2FA: (token: string) =>
    post<{ qrCode: string; secret: string; otpauthUrl: string }>('/auth/2fa/setup', undefined, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  enable2FA: (token: string, code: string) =>
    post('/auth/2fa/enable', { code }, { headers: { Authorization: `Bearer ${token}` } }),

  disable2FA: (token: string, password: string, code: string) =>
    post('/auth/2fa/disable', { password, code }, { headers: { Authorization: `Bearer ${token}` } }),

  register: (payload: RegisterPayload) =>
    post<{ expiresInMinutes: number; resendAfterSeconds: number }>('/auth/register', payload),

  verifyRegisterOtp: (email: string, code: string) =>
    post<{ user: AuthUser } & AuthTokens>('/auth/verify-register-otp', { email, code }),

  forgotPassword: (email: string) =>
    post<{ expiresInMinutes: number; resendAfterSeconds: number }>('/auth/forgot-password', { email }),

  verifyResetCode: (email: string, code: string) =>
    post('/auth/verify-reset-code', { email, code }),

  resetPassword: (email: string, code: string, newPassword: string) =>
    post('/auth/reset-password', { email, code, newPassword }),
};

// ─── Lưu phiên đăng nhập ───────────────────────────
const STORAGE_KEY = 'torch_auth';

export const authStorage = {
  save(user: AuthUser, tokens: AuthTokens, remember: boolean) {
    const value = JSON.stringify({ user, ...tokens });
    // "Ghi nhớ đăng nhập" → localStorage (giữ sau khi đóng trình duyệt), ngược lại → sessionStorage
    (remember ? localStorage : sessionStorage).setItem(STORAGE_KEY, value);
    (remember ? sessionStorage : localStorage).removeItem(STORAGE_KEY);
  },

  get(): ({ user: AuthUser } & AuthTokens) | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  clear() {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  },
};
