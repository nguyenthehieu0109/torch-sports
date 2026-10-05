"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { authApi, ApiError } from '@/lib/api';
import {
  compactErrors,
  validateConfirmPassword,
  validateEmail,
  validateOtp,
  validatePassword,
} from '@/lib/validators';
import { AuthInput } from './AuthInput';
import { PasswordChecklist } from './PasswordChecklist';
import { AlertIcon, KeyIcon, MailIcon, SpinnerIcon } from './icons';

type Step = 'email' | 'code' | 'reset' | 'done';

interface Props {
  open: boolean;
  initialEmail?: string;
  onClose: () => void;
  /** Gọi khi đổi mật khẩu thành công — trả về email để điền sẵn vào form đăng nhập */
  onSuccess: (email: string) => void;
}

const STEP_TITLES: Record<Step, { title: string; desc: string }> = {
  email: { title: 'Quên mật khẩu', desc: 'Nhập email đã đăng ký, chúng tôi sẽ gửi mã xác nhận 6 chữ số về hộp thư của bạn.' },
  code: { title: 'Nhập mã xác nhận', desc: '' },
  reset: { title: 'Đặt mật khẩu mới', desc: 'Tạo mật khẩu mới đủ mạnh cho tài khoản của bạn.' },
  done: { title: 'Thành công!', desc: 'Mật khẩu của bạn đã được đặt lại. Hãy đăng nhập bằng mật khẩu mới.' },
};

export function ForgotPasswordModal({ open, initialEmail = '', onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [info, setInfo] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Reset trạng thái mỗi khi mở modal
  useEffect(() => {
    if (!open) return;
    setStep('email');
    setEmail(initialEmail);
    setCode('');
    setPassword('');
    setConfirm('');
    setTouched({});
    setServerError('');
    setInfo('');
    setLoading(false);
  }, [open, initialEmail]);

  // Đếm ngược cho nút "Gửi lại mã"
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Đóng bằng phím Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !loading && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, loading, onClose]);

  const errors = compactErrors({
    email: validateEmail(email),
    code: validateOtp(code),
    password: validatePassword(password),
    confirm: validateConfirmPassword(password, confirm),
  });
  const show = (field: keyof typeof errors) => (touched[field] ? errors[field] : undefined);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setLoading(true);
    setServerError('');
    try {
      await fn();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  const sendCode = (isResend = false) =>
    run(async () => {
      const res = await authApi.forgotPassword(email.trim());
      setCooldown(res.data?.resendAfterSeconds ?? 60);
      setInfo(isResend ? 'Đã gửi lại mã mới. Vui lòng kiểm tra email.' : '');
      setCode('');
      setTouched({});
      setStep('code');
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (step === 'email') {
      setTouched({ email: true });
      if (errors.email) return;
      sendCode();
    } else if (step === 'code') {
      setTouched({ code: true });
      if (errors.code) return;
      run(async () => {
        await authApi.verifyResetCode(email.trim(), code);
        setInfo('');
        setStep('reset');
      });
    } else if (step === 'reset') {
      setTouched({ password: true, confirm: true });
      if (errors.password || errors.confirm) return;
      run(async () => {
        await authApi.resetPassword(email.trim(), code, password);
        setStep('done');
      });
    } else {
      onSuccess(email.trim());
    }
  };

  if (!open) return null;
  const { title, desc } = STEP_TITLES[step];
  const stepIndex = ['email', 'code', 'reset', 'done'].indexOf(step);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#001f3f]/50 backdrop-blur-sm animate-[fadeIn_.2s_ease-out]"
      onMouseDown={(e) => e.target === e.currentTarget && !loading && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="forgot-title"
        className="relative w-full max-w-[400px] rounded-2xl bg-white p-8 shadow-2xl animate-[modalIn_.25s_ease-out]"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 w-8 h-8 rounded-full text-[#6b7280] hover:bg-[#f3f4f6] transition-colors"
          aria-label="Đóng"
        >
          ✕
        </button>

        {/* Thanh tiến trình 3 bước */}
        <div className="flex gap-1.5 mb-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-colors duration-300"
              style={{ background: i <= stepIndex ? 'linear-gradient(to right, #003366, #00c6ff)' : '#e5e7eb' }}
            />
          ))}
        </div>

        <div className="flex flex-col items-center text-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
            style={{ background: step === 'done' ? '#dcfce7' : '#e0f7ff' }}
          >
            {step === 'done' ? (
              <span className="text-2xl">✅</span>
            ) : step === 'email' ? (
              <MailIcon className="w-6 h-6" color="#003366" />
            ) : (
              <KeyIcon className="w-6 h-6" color="#003366" />
            )}
          </div>

          <h2 id="forgot-title" className="text-2xl font-bold text-[#1f2937] mb-2">{title}</h2>
          <p className="text-sm text-[#6b7280] mb-6 leading-relaxed">
            {step === 'code' ? (
              <>Mã xác nhận đã được gửi tới <strong className="text-[#1f2937]">{email.trim()}</strong>. Mã có hiệu lực trong 10 phút.</>
            ) : (
              desc
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
          {serverError && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 text-left">
              <AlertIcon className="w-4 h-4 shrink-0 mt-px" />
              <span>{serverError}</span>
            </div>
          )}
          {info && !serverError && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700 text-left">{info}</div>
          )}

          {step === 'email' && (
            <AuthInput
              id="forgot-email"
              type="email"
              placeholder="Email"
              autoComplete="email"
              autoFocus
              value={email}
              onValueChange={setEmail}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              error={show('email')}
              icon={<MailIcon />}
              disabled={loading}
            />
          )}

          {step === 'code' && (
            <>
              <input
                id="forgot-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                placeholder="••••••"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onBlur={() => setTouched((t) => ({ ...t, code: true }))}
                disabled={loading}
                aria-label="Mã xác nhận 6 chữ số"
                aria-invalid={!!show('code')}
                className={`w-full text-center text-3xl font-bold tracking-[0.6em] pl-[0.6em] py-3 rounded-xl border-2 outline-none transition-all text-[#003366] bg-[#f9fafb]
                  ${show('code') ? 'border-red-400' : 'border-[#e5e7eb] focus:border-[#00c6ff]'}`}
              />
              {show('code') && <p className="text-[11px] text-red-500 -mt-1">{show('code')}</p>}
              <div className="text-xs text-center text-[#6b7280]">
                Không nhận được mã?{' '}
                {cooldown > 0 ? (
                  <span>Gửi lại sau <strong>{cooldown}s</strong></span>
                ) : (
                  <button type="button" onClick={() => sendCode(true)} disabled={loading} className="font-semibold text-[#00a3d9] hover:underline">
                    Gửi lại mã
                  </button>
                )}
                <span className="mx-1.5">·</span>
                <button type="button" onClick={() => { setStep('email'); setServerError(''); setInfo(''); }} disabled={loading} className="font-semibold text-[#00a3d9] hover:underline">
                  Đổi email
                </button>
              </div>
            </>
          )}

          {step === 'reset' && (
            <>
              <AuthInput
                id="forgot-new-password"
                isPassword
                placeholder="Mật khẩu mới"
                autoComplete="new-password"
                autoFocus
                maxLength={64}
                value={password}
                onValueChange={setPassword}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                error={show('password')}
                disabled={loading}
              />
              {password && <PasswordChecklist password={password} />}
              <AuthInput
                id="forgot-confirm-password"
                isPassword
                placeholder="Nhập lại mật khẩu mới"
                autoComplete="new-password"
                maxLength={64}
                value={confirm}
                onValueChange={setConfirm}
                onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
                error={show('confirm')}
                success={confirm && !errors.confirm ? 'Mật khẩu khớp' : undefined}
                disabled={loading}
              />
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full py-3 rounded-full text-white font-semibold text-sm shadow-md transition-all hover:-translate-y-[1px] disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(to right, #003366, #00c6ff)' }}
          >
            {loading && <SpinnerIcon />}
            {step === 'email' && (loading ? 'Đang gửi mã...' : 'Gửi mã xác nhận')}
            {step === 'code' && (loading ? 'Đang kiểm tra...' : 'Xác nhận mã')}
            {step === 'reset' && (loading ? 'Đang cập nhật...' : 'Đặt lại mật khẩu')}
            {step === 'done' && 'Quay lại đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
}
