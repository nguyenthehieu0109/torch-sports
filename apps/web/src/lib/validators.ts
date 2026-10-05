// Quy tắc kiểm tra dữ liệu form đăng nhập / đăng ký.
// Giữ đồng bộ với services/api/src/modules/auth/dto/auth.dto.ts

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)\d{8}$/;
export const NAME_REGEX = /^[\p{L}\s'.-]+$/u;

export interface PasswordRule {
  id: string;
  label: string;
  test: (value: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: '8-64 ký tự', test: (v) => v.length >= 8 && v.length <= 64 },
  { id: 'upper', label: 'Chữ in hoa (A-Z)', test: (v) => /[A-Z]/.test(v) },
  { id: 'lower', label: 'Chữ thường (a-z)', test: (v) => /[a-z]/.test(v) },
  { id: 'number', label: 'Chữ số (0-9)', test: (v) => /\d/.test(v) },
  { id: 'special', label: 'Ký tự đặc biệt (!@#...)', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export function validateEmail(value: string): string | undefined {
  const v = value.trim();
  if (!v) return 'Vui lòng nhập email';
  if (v.length > 254 || !EMAIL_REGEX.test(v)) return 'Email không đúng định dạng';
  return undefined;
}

export function validateLoginPassword(value: string): string | undefined {
  if (!value) return 'Vui lòng nhập mật khẩu';
  return undefined;
}

export function validatePassword(value: string): string | undefined {
  if (!value) return 'Vui lòng nhập mật khẩu';
  if (!PASSWORD_RULES.every((rule) => rule.test(value))) return 'Mật khẩu chưa đủ mạnh';
  return undefined;
}

export function validateConfirmPassword(password: string, confirm: string): string | undefined {
  if (!confirm) return 'Vui lòng nhập lại mật khẩu';
  if (password !== confirm) return 'Mật khẩu nhập lại không khớp';
  return undefined;
}

export function validateName(value: string, label: string): string | undefined {
  const v = value.trim();
  if (!v) return `Vui lòng nhập ${label.toLowerCase()}`;
  if (v.length > 50) return `${label} tối đa 50 ký tự`;
  if (!NAME_REGEX.test(v)) return `${label} chỉ được chứa chữ cái`;
  return undefined;
}

/** Số điện thoại không bắt buộc, nhưng nếu nhập thì phải đúng định dạng VN */
export function validatePhone(value: string): string | undefined {
  const v = value.replace(/\s+/g, '');
  if (!v) return undefined;
  if (!PHONE_REGEX.test(v)) return 'Số điện thoại không hợp lệ (VD: 0912345678)';
  return undefined;
}

export function validateOtp(value: string): string | undefined {
  if (!value) return 'Vui lòng nhập mã xác nhận';
  if (!/^\d{6}$/.test(value)) return 'Mã xác nhận gồm 6 chữ số';
  return undefined;
}

/** Bỏ các key không có lỗi */
export function compactErrors<T extends Record<string, string | undefined>>(errors: T) {
  return Object.fromEntries(Object.entries(errors).filter(([, v]) => !!v)) as Partial<Record<keyof T, string>>;
}
