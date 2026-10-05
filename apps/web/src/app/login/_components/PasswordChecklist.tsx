import React from 'react';
import { PASSWORD_RULES } from '@/lib/validators';
import { CheckIcon, XIcon } from './icons';

/** Danh sách điều kiện mật khẩu, tick xanh theo thời gian thực khi người dùng gõ */
export function PasswordChecklist({ password }: { password: string }) {
  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
  const strength = passed / PASSWORD_RULES.length;
  const barColor = strength < 0.6 ? '#ef4444' : strength < 1 ? '#f59e0b' : '#16a34a';
  const label = strength < 0.6 ? 'Yếu' : strength < 1 ? 'Trung bình' : 'Mạnh';

  return (
    <div className="w-full text-left" aria-live="polite">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="flex-1 h-1.5 rounded-full bg-[#e5e7eb] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${strength * 100}%`, backgroundColor: barColor }}
          />
        </div>
        <span className="text-[11px] font-medium" style={{ color: barColor }}>{label}</span>
      </div>
      <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <li key={rule.id} className={`flex items-center gap-1 text-[11px] ${ok ? 'text-green-600' : 'text-[#6b7280]'}`}>
              {ok ? <CheckIcon /> : <XIcon />}
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
