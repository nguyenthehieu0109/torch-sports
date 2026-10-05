"use client";

import React, { useCallback, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { authApi, authStorage, ApiError } from '@/lib/api';
import {
  compactErrors,
  validateConfirmPassword,
  validateEmail,
  validateLoginPassword,
  validateName,
  validatePassword,
  validatePhone,
} from '@/lib/validators';
import { AuthInput } from './_components/AuthInput';
import { PasswordChecklist } from './_components/PasswordChecklist';
import { ForgotPasswordModal } from './_components/ForgotPasswordModal';
import { RegisterOtpModal } from './_components/RegisterOtpModal';
import { TwoFactorModal } from './_components/TwoFactorModal';
import { Toast, type ToastState } from './_components/Toast';
import {
  AlertIcon,
  FacebookIcon,
  GithubIcon,
  GoogleIcon,
  LinkedinIcon,
  MailIcon,
  PhoneIcon,
  SpinnerIcon,
  UserIcon,
  ZaloIcon,
} from './_components/icons';

// ─── Types & initial state ─────────────────────────
type LoginForm = { email: string; password: string };
type RegisterForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};
type Touched<T> = Partial<Record<keyof T, boolean>>;

const EMPTY_LOGIN: LoginForm = { email: '', password: '' };
const EMPTY_REGISTER: RegisterForm = { firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' };

/** Nếu người dùng chỉ gõ phần tên (chưa có @) thì tự thêm @gmail.com khi rời ô email. */
const withDefaultDomain = (value: string) => {
  const v = value.trim();
  return v && !v.includes('@') ? `${v}@gmail.com` : value;
};

const validateLoginForm = (f: LoginForm) =>
  compactErrors({ email: validateEmail(f.email), password: validateLoginPassword(f.password) });

const validateRegisterForm = (f: RegisterForm) =>
  compactErrors({
    firstName: validateName(f.firstName, 'Họ'),
    lastName: validateName(f.lastName, 'Tên'),
    email: validateEmail(f.email),
    phone: validatePhone(f.phone),
    password: validatePassword(f.password),
    confirmPassword: validateConfirmPassword(f.password, f.confirmPassword),
  });

// ─── Small UI pieces ───────────────────────────────
const SocialBtn = ({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className="flex items-center justify-center w-11 h-11 rounded-lg transition-all hover:scale-105 shadow-sm bg-white border border-[#e5e7eb] hover:border-[#00c6ff]"
  >
    {icon}
  </button>
);

const FormAlert = ({ message }: { message: string }) => (
  <div role="alert" className="w-full flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 text-left">
    <AlertIcon className="w-4 h-4 shrink-0 mt-px" />
    <span>{message}</span>
  </div>
);

const SubmitButton = ({ loading, children, loadingText }: { loading: boolean; children: React.ReactNode; loadingText: string }) => (
  <button
    type="submit"
    disabled={loading}
    className="w-full py-3 rounded-full text-white font-semibold text-sm shadow-md transition-all hover:-translate-y-[1px] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
    style={{ background: 'linear-gradient(to right, #003366, #00c6ff)' }}
  >
    {loading && <SpinnerIcon />}
    {loading ? loadingText : children}
  </button>
);

// ─── Page ──────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [regOtpOpen, setRegOtpOpen] = useState(false);
  const [twoFaOpen, setTwoFaOpen] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [regPayloadCache, setRegPayloadCache] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    password: string;
  } | null>(null);

  const closeToast = useCallback(() => setToast(null), []);
  const comingSoon = () => setToast({ type: 'info', message: 'Đăng nhập bằng mạng xã hội sẽ sớm được hỗ trợ.' });

  // ── Login state
  const [loginForm, setLoginForm] = useState<LoginForm>(EMPTY_LOGIN);
  const [loginTouched, setLoginTouched] = useState<Touched<LoginForm>>({});
  const [rememberMe, setRememberMe] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginServerError, setLoginServerError] = useState('');
  const loginErrors = useMemo(() => validateLoginForm(loginForm), [loginForm]);

  // ── Register state
  const [regForm, setRegForm] = useState<RegisterForm>(EMPTY_REGISTER);
  const [regTouched, setRegTouched] = useState<Touched<RegisterForm>>({});
  const [regLoading, setRegLoading] = useState(false);
  const [regServerError, setRegServerError] = useState('');
  const [regServerFieldErrors, setRegServerFieldErrors] = useState<Partial<Record<keyof RegisterForm, string>>>({});
  const regErrors = useMemo(
    () => ({ ...validateRegisterForm(regForm), ...regServerFieldErrors }),
    [regForm, regServerFieldErrors],
  );

  // ── Helpers
  const loginField = (field: keyof LoginForm) => ({
    value: loginForm[field],
    onValueChange: (v: string) => {
      setLoginForm((f) => ({ ...f, [field]: v }));
      setLoginServerError('');
    },
    onBlur: () => {
      if (field === 'email') {
        setLoginForm((f) => ({ ...f, email: withDefaultDomain(f.email) }));
      }
      setLoginTouched((t) => ({ ...t, [field]: true }));
    },
    error: loginTouched[field] ? loginErrors[field] : undefined,
    disabled: loginLoading,
  });

  const regField = (field: keyof RegisterForm) => ({
    value: regForm[field],
    onValueChange: (v: string) => {
      setRegForm((f) => ({ ...f, [field]: v }));
      setRegServerError('');
      if (regServerFieldErrors[field]) setRegServerFieldErrors((e) => ({ ...e, [field]: undefined }));
    },
    onBlur: () => {
      if (field === 'email') {
        setRegForm((f) => ({ ...f, email: withDefaultDomain(f.email) }));
      }
      setRegTouched((t) => ({ ...t, [field]: true }));
    },
    error: regTouched[field] ? regErrors[field] : undefined,
    disabled: regLoading,
  });

  const switchMode = (toLogin: boolean) => {
    setIsLogin(toLogin);
    setLoginServerError('');
    setRegServerError('');
  };

  // ── Submit: Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginLoading) return;
    setLoginTouched({ email: true, password: true });
    if (Object.keys(loginErrors).length) return;

    setLoginLoading(true);
    setLoginServerError('');
    try {
      const res = await authApi.login(loginForm.email.trim(), loginForm.password);
      if (res.data) {
        if ('requires2FA' in res.data) {
          setTempToken(res.data.tempToken);
          setTwoFaOpen(true);
        } else {
          const { user, accessToken, refreshToken } = res.data;
          authStorage.save(user, { accessToken, refreshToken }, rememberMe);
          setToast({ type: 'success', message: `Chào mừng ${user.lastName} quay trở lại! 🔥` });
          setTimeout(() => router.push('/'), 800);
        }
      }
    } catch (err) {
      setLoginServerError(err instanceof ApiError ? err.message : 'Đăng nhập thất bại. Vui lòng thử lại.');
      setLoginForm((f) => ({ ...f, password: '' }));
      setLoginTouched((t) => ({ ...t, password: false }));
    } finally {
      setLoginLoading(false);
    }
  };

  // ── Submit: Social Login
  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'github' | 'linkedin' | 'zalo') => {
    try {
      // Trong thực tế, bạn sẽ gọi SDK của Zalo/Google/Facebook tại đây để lấy Access Token / Code
      // Sau đó gửi Code/Token lên Backend. Ở đây tạm thời giả lập payload gửi lên Backend:
      const mockPayload = {
        provider,
        providerId: `${provider}_mock_id_12345`,
        email: `mock_${provider}@gmail.com`,
        firstName: provider.charAt(0).toUpperCase() + provider.slice(1),
        lastName: 'User',
      };
      
      const res = await authApi.socialLogin(mockPayload);
      if (res.data) {
        if ('requires2FA' in res.data) {
          setTempToken(res.data.tempToken);
          setTwoFaOpen(true);
        } else {
          const { user, accessToken, refreshToken } = res.data;
          authStorage.save(user, { accessToken, refreshToken }, rememberMe);
          setToast({ type: 'success', message: `Đăng nhập bằng ${provider} thành công! 🔥` });
          setTimeout(() => router.push('/'), 800);
        }
      }
    } catch (err) {
      setToast({ type: 'error', message: err instanceof ApiError ? err.message : `Đăng nhập ${provider} thất bại.` });
    }
  };

  // ── Submit: Register (B1: gửi OTP xác thực email)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regLoading) return;
    setRegTouched({ firstName: true, lastName: true, email: true, phone: true, password: true, confirmPassword: true });
    if (Object.keys(regErrors).length) return;

    setRegLoading(true);
    setRegServerError('');
    try {
      const phone = regForm.phone.replace(/\s+/g, '');
      const payload = {
        firstName: regForm.firstName.trim(),
        lastName: regForm.lastName.trim(),
        email: regForm.email.trim(),
        password: regForm.password,
        ...(phone ? { phone } : {}),
      };

      await authApi.register(payload);
      setRegPayloadCache(payload);
      setRegOtpOpen(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const field: keyof RegisterForm = err.message.includes('điện thoại') ? 'phone' : 'email';
        setRegServerFieldErrors({ [field]: err.message });
        setRegTouched((t) => ({ ...t, [field]: true }));
      } else {
        setRegServerError(err instanceof ApiError ? err.message : 'Gửi mã xác thực thất bại. Vui lòng thử lại.');
      }
    } finally {
      setRegLoading(false);
    }
  };

  const confirmOk = regForm.confirmPassword && !regErrors.confirmPassword ? 'Mật khẩu khớp' : undefined;

  return (
    <div className="flex flex-col justify-center items-center min-h-screen w-full overflow-hidden font-sans bg-white p-4" style={{ backgroundColor: '#ffffff' }}>
      <Toast toast={toast} onClose={closeToast} />
      <ForgotPasswordModal
        open={forgotOpen}
        initialEmail={loginForm.email.trim()}
        onClose={() => setForgotOpen(false)}
        onSuccess={(email) => {
          setForgotOpen(false);
          setLoginForm({ email, password: '' });
          setLoginTouched({});
          setLoginServerError('');
          setToast({ type: 'success', message: 'Đổi mật khẩu thành công! Hãy đăng nhập bằng mật khẩu mới.' });
        }}
      />
      <RegisterOtpModal
        open={regOtpOpen}
        registerData={regPayloadCache}
        onClose={() => setRegOtpOpen(false)}
        onResend={async () => {
          if (regPayloadCache) {
            await authApi.register(regPayloadCache);
          }
        }}
        onSuccess={(user, tokens) => {
          setRegOtpOpen(false);
          authStorage.save(user, tokens, true);
          setToast({ type: 'success', message: `🎉 Đăng ký thành công! Chào mừng ${user.lastName} đến với TORCH SPORTS.` });
          setRegForm(EMPTY_REGISTER);
          setRegTouched({});
          setRegPayloadCache(null);
          setTimeout(() => router.push('/'), 800);
        }}
      />
      <TwoFactorModal
        open={twoFaOpen}
        tempToken={tempToken}
        onClose={() => setTwoFaOpen(false)}
        onSuccess={(user, tokens) => {
          setTwoFaOpen(false);
          authStorage.save(user, tokens, rememberMe);
          setToast({ type: 'success', message: `Chào mừng ${user.lastName} quay trở lại! 🔥` });
          setTimeout(() => router.push('/'), 800);
        }}
      />

      {/* Main Card */}
      <main className="relative w-full max-w-[850px] h-[660px] overflow-hidden rounded-3xl shadow-2xl" style={{ backgroundColor: '#ffffff' }}>
        <h1 className="sr-only">TORCH SPORTS — Đăng nhập / Đăng ký</h1>

        {/* Sign Up Form (Left) */}
        <section
          aria-label="Đăng ký"
          inert={isLogin}
          className={`absolute top-0 left-0 h-full w-1/2 transition-all duration-700 ease-in-out flex items-center justify-center
            ${!isLogin ? 'opacity-100 z-20 translate-x-0' : 'opacity-0 z-10 -translate-x-[20%]'}`}
          style={{ backgroundColor: '#ffffff', color: '#1f2937' }}
        >
          <form onSubmit={handleRegister} noValidate className="w-full max-w-[340px] mx-auto flex flex-col items-center px-2">
            <h2 className="text-3xl font-bold mb-5" style={{ color: '#1f2937' }}>Registration</h2>

            <div className="w-full flex flex-col gap-2.5 mb-4">
              {regServerError && <FormAlert message={regServerError} />}
              <div className="grid grid-cols-2 gap-2.5">
                <AuthInput id="reg-first-name" placeholder="Họ" autoComplete="family-name" maxLength={50} {...regField('firstName')} />
                <AuthInput id="reg-last-name" placeholder="Tên" autoComplete="given-name" maxLength={50} {...regField('lastName')} icon={<UserIcon />} />
              </div>
              <AuthInput id="reg-email" type="email" placeholder="Email" autoComplete="email" maxLength={254} {...regField('email')} icon={<MailIcon />} />
              <AuthInput id="reg-phone" type="tel" inputMode="tel" placeholder="Số điện thoại (không bắt buộc)" autoComplete="tel" maxLength={13} {...regField('phone')} icon={<PhoneIcon />} />
              <AuthInput id="reg-password" isPassword placeholder="Mật khẩu" autoComplete="new-password" maxLength={64} {...regField('password')} />
              {regForm.password && <PasswordChecklist password={regForm.password} />}
              <AuthInput id="reg-confirm-password" isPassword placeholder="Nhập lại mật khẩu" autoComplete="new-password" maxLength={64} {...regField('confirmPassword')} success={confirmOk} />
            </div>

            <SubmitButton loading={regLoading} loadingText="Đang tạo tài khoản...">Register</SubmitButton>

            <div className="mt-5 text-center w-full">
              <p className="text-xs mb-3" style={{ color: '#6b7280' }}>or register with social platforms</p>
              <div className="flex justify-center gap-3">
                <SocialBtn icon={<GoogleIcon />} label="Đăng ký bằng Google" onClick={() => handleSocialLogin('google')} />
                <SocialBtn icon={<FacebookIcon />} label="Đăng ký bằng Facebook" onClick={() => handleSocialLogin('facebook')} />
                <SocialBtn icon={<ZaloIcon />} label="Đăng ký bằng Zalo" onClick={() => handleSocialLogin('zalo')} />
                <SocialBtn icon={<GithubIcon />} label="Đăng ký bằng GitHub" onClick={() => handleSocialLogin('github')} />
              </div>
            </div>
          </form>
        </section>

        {/* Sign In Form (Right) */}
        <section
          aria-label="Đăng nhập"
          inert={!isLogin}
          className={`absolute top-0 left-1/2 h-full w-1/2 transition-all duration-700 ease-in-out flex items-center justify-center
            ${isLogin ? 'opacity-100 z-20 translate-x-0' : 'opacity-0 z-10 translate-x-[20%]'}`}
          style={{ backgroundColor: '#ffffff', color: '#1f2937' }}
        >
          <form onSubmit={handleLogin} noValidate className="w-full max-w-[320px] mx-auto flex flex-col items-center">
            <h2 className="text-3xl font-bold mb-8" style={{ color: '#1f2937' }}>Login</h2>

            <div className="w-full flex flex-col gap-3 mb-3">
              {loginServerError && <FormAlert message={loginServerError} />}
              <AuthInput id="login-email" type="email" placeholder="Email" autoComplete="email" maxLength={254} {...loginField('email')} icon={<MailIcon />} />
              <AuthInput id="login-password" isPassword placeholder="Mật khẩu" autoComplete="current-password" maxLength={64} {...loginField('password')} />
            </div>

            <div className="w-full flex items-center justify-between mb-6">
              <label className="flex items-center gap-1.5 text-xs text-[#4b5563] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#00a3d9] cursor-pointer"
                />
                Ghi nhớ đăng nhập
              </label>
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="text-xs font-medium transition-colors hover:opacity-80 hover:underline"
                style={{ color: '#00a3d9' }}
              >
                Forgot Password?
              </button>
            </div>

            <SubmitButton loading={loginLoading} loadingText="Đang đăng nhập...">Login</SubmitButton>

            <div className="mt-8 text-center w-full">
              <p className="text-xs mb-4" style={{ color: '#6b7280' }}>or login with social platforms</p>
              <div className="flex justify-center gap-3">
                <SocialBtn icon={<GoogleIcon />} label="Đăng nhập bằng Google" onClick={() => handleSocialLogin('google')} />
                <SocialBtn icon={<FacebookIcon />} label="Đăng nhập bằng Facebook" onClick={() => handleSocialLogin('facebook')} />
                <SocialBtn icon={<ZaloIcon />} label="Đăng nhập bằng Zalo" onClick={() => handleSocialLogin('zalo')} />
                <SocialBtn icon={<GithubIcon />} label="Đăng nhập bằng GitHub" onClick={() => handleSocialLogin('github')} />
              </div>
            </div>
          </form>
        </section>

        {/* Overlay Container with dynamic curved corners */}
        <div
          className={`absolute top-0 left-0 w-1/2 h-full overflow-hidden transition-all duration-700 ease-in-out z-[100]
            ${!isLogin ? 'translate-x-full rounded-l-[130px] rounded-r-none' : 'translate-x-0 rounded-r-[130px] rounded-l-none'}`}
        >
          {/* Inner overlay wrapper moving opposite to container to create smooth slide */}
          <div
            className={`relative h-full w-[200%] transform transition-transform duration-700 ease-in-out text-white
              ${!isLogin ? '-translate-x-1/2' : 'translate-x-0'}`}
          >
            {/* Left Panel (Dark Blue) - Visible when Overlay is on the Left */}
            <div
              className={`absolute top-0 left-0 flex flex-col items-center justify-center w-1/2 h-full px-12 text-center transition-transform duration-700 ease-in-out
                ${!isLogin ? '-translate-x-[20%]' : 'translate-x-0'}`}
              style={{ background: 'linear-gradient(to bottom right, #003366, #001f3f)' }}
            >
              <div className="w-48 h-48 relative mb-4 drop-shadow-2xl">
                <Image src="/logodu-clean.png" alt="TORCH SPORTS" fill sizes="192px" className="object-contain" priority />
              </div>
              <h2 className="text-4xl font-bold mb-2 tracking-wide text-white">Hello, Welcome</h2>
              <p className="text-sm font-light mb-6 text-white opacity-90">Don&apos;t have an Account</p>
              <button
                type="button"
                onClick={() => switchMode(false)}
                className="px-12 py-2.5 rounded-full border border-white text-white font-semibold transition-all hover:scale-105 hover:bg-white hover:text-[#003366]"
              >
                Register
              </button>
            </div>

            {/* Right Panel (Dark Blue) - Visible when Overlay is on the Right */}
            <div
              className={`absolute top-0 right-0 flex flex-col items-center justify-center w-1/2 h-full px-12 text-center transition-transform duration-700 ease-in-out
                ${!isLogin ? 'translate-x-0' : 'translate-x-[20%]'}`}
              style={{ background: 'linear-gradient(to bottom right, #003366, #001f3f)' }}
            >
              <div className="w-48 h-48 relative mb-4 drop-shadow-2xl">
                <Image src="/logodu-clean.png" alt="TORCH SPORTS" fill sizes="192px" className="object-contain" />
              </div>
              <h2 className="text-4xl font-bold mb-2 tracking-wide text-white">Welcome Back!</h2>
              <p className="text-sm font-light mb-6 text-white opacity-90">Already have an Account</p>
              <button
                type="button"
                onClick={() => switchMode(true)}
                className="px-12 py-2.5 rounded-full border border-white text-white font-semibold transition-all hover:scale-105 hover:bg-white hover:text-[#003366]"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
