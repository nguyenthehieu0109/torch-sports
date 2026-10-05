"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { authApi, authStorage, ApiError, type RegisterPayload, type AuthUser, type AuthTokens } from '@/lib/api';
import { compactErrors, validateOtp } from '@/lib/validators';
import { AlertIcon, MailIcon, SpinnerIcon } from './icons';

interface Props {
  open: boolean;
  registerData: RegisterPayload | null;
  onClose: () => void;
  onSuccess: (user: AuthUser, tokens: AuthTokens) => void;
  onResend: () => Promise<void>;
}

export function RegisterOtpModal({ open, registerData, onClose, onSuccess, onResend }: Props) {
  const [code, setCode] = useState('');
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [info, setInfo] = useState('');
  const [cooldown, setCooldown] = useState(60);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Reset modal state
  useEffect(() => {
    if (!open) return;
    setCode('');
    setTouched(false);
    setServerError('');
    setInfo('');
    setLoading(false);
    setCooldown(60);
  }, [open]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const otpError = touched ? validateOtp(code) : undefined;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const err = validateOtp(code);
    if (err || !registerData || loading) return;

    setLoading(true);
    setServerError('');
    try {
      const res = await authApi.verifyRegisterOtp(registerData.email.trim(), code);
      if (res.data) {
        onSuccess(res.data.user, { accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
      }
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Xác thực không thành công. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (cooldown > 0 || loading) return;
    setLoading(true);
    setServerError('');
    try {
      await onResend();
      setCooldown(60);
      setCode('');
      setTouched(false);
      setInfo('Đã gửi lại mã xác nhận mới tới email của bạn.');
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Gửi lại mã thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (!open || !registerData) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#001f3f]/50 backdrop-blur-sm animate-[fadeIn_.2s_ease-out]"
      onMouseDown={(e) => e.target === e.currentTarget && !loading && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reg-otp-title"
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

        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 bg-[#e0f7ff]">
            <MailIcon className="w-6 h-6" color="#003366" />
          </div>

          <h2 id="reg-otp-title" className="text-2xl font-bold text-[#1f2937] mb-2">Xác thực Email</h2>
          <p className="text-sm text-[#6b7280] mb-6 leading-relaxed">
            Mã OTP xác thực 6 chữ số đã được gửi tới email <strong className="text-[#1f2937]">{registerData.email}</strong>. Vui lòng nhập mã để hoàn tất đăng ký tài khoản.
          </p>
        </div>

        <form onSubmit={handleVerify} noValidate className="flex flex-col gap-3">
          {serverError && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 text-left">
              <AlertIcon className="w-4 h-4 shrink-0 mt-px" />
              <span>{serverError}</span>
            </div>
          )}
          {info && !serverError && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700 text-left">{info}</div>
          )}

          <input
            id="reg-otp-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            placeholder="••••••"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onBlur={() => setTouched(true)}
            disabled={loading}
            aria-label="Mã OTP 6 chữ số"
            aria-invalid={!!otpError}
            className={`w-full text-center text-3xl font-bold tracking-[0.6em] pl-[0.6em] py-3 rounded-xl border-2 outline-none transition-all text-[#003366] bg-[#f9fafb]
              ${otpError ? 'border-red-400' : 'border-[#e5e7eb] focus:border-[#00c6ff]'}`}
          />
          {otpError && <p className="text-[11px] text-red-500 -mt-1 text-center">{otpError}</p>}

          <div className="text-xs text-center text-[#6b7280] my-1">
            Chưa nhận được mã?{' '}
            {cooldown > 0 ? (
              <span>Gửi lại sau <strong>{cooldown}s</strong></span>
            ) : (
              <button type="button" onClick={handleResendCode} disabled={loading} className="font-semibold text-[#00a3d9] hover:underline">
                Gửi lại mã OTP
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full text-white font-semibold text-sm shadow-md transition-all hover:-translate-y-[1px] disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(to right, #003366, #00c6ff)' }}
          >
            {loading && <SpinnerIcon />}
            {loading ? 'Đang xác thực...' : 'Kích hoạt tài khoản'}
          </button>
        </form>
      </div>
    </div>
  );
}
