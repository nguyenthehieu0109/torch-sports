"use client";

import React, { useId, useState } from 'react';
import { LockIcon, UnlockIcon } from './icons';

interface AuthInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
  /** Icon bên phải (bỏ qua nếu isPassword) */
  icon?: React.ReactNode;
  /** Ô mật khẩu: icon ổ khóa bấm được để hiện / ẩn mật khẩu */
  isPassword?: boolean;
  /** Dòng gợi ý màu xanh khi hợp lệ (vd: "Mật khẩu khớp") */
  success?: string;
}

export function AuthInput({
  value,
  onValueChange,
  error,
  icon,
  isPassword,
  success,
  id,
  type = 'text',
  className,
  ...rest
}: AuthInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [visible, setVisible] = useState(false);

  const borderClass = error
    ? 'border-red-400 bg-red-50/40'
    : success
      ? 'border-green-400'
      : 'border-[#e5e7eb] focus-within:border-[#00c6ff] focus-within:shadow-[0_0_0_3px_rgba(0,198,255,0.15)]';

  return (
    <div className={`w-full text-left ${className ?? ''}`}>
      <div className={`flex items-center rounded-lg px-4 py-2.5 border bg-[#f9fafb] transition-all ${borderClass}`}>
        <input
          id={inputId}
          type={isPassword ? (visible ? 'text' : 'password') : type}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className="bg-transparent border-none outline-none flex-1 min-w-0 text-sm text-[#111827] placeholder:text-[#9ca3af]"
          {...rest}
        />

        {isPassword ? (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="ml-2 p-0.5 rounded transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00c6ff]"
            aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            title={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            tabIndex={-1}
          >
            {visible ? <UnlockIcon /> : <LockIcon />}
          </button>
        ) : (
          icon && <span className="ml-2 shrink-0">{icon}</span>
        )}
      </div>

      {error ? (
        <p id={`${inputId}-error`} role="alert" className="mt-1 text-[11px] leading-tight text-red-500">
          {error}
        </p>
      ) : success ? (
        <p className="mt-1 text-[11px] leading-tight text-green-600">✓ {success}</p>
      ) : null}
    </div>
  );
}
