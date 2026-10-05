import { useState } from 'react';
import { AuthInput } from './AuthInput';
import { authApi } from '@/lib/api';
import { AuthTokens, AuthUser } from '@/lib/api';
import { AlertIcon, SpinnerIcon } from './icons';

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

interface Props {
  open: boolean;
  tempToken: string;
  onClose: () => void;
  onSuccess: (user: AuthUser, tokens: AuthTokens) => void;
}

export function TwoFactorModal({ open, tempToken, onClose, onSuccess }: Props) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const cleanCode = code.replace(/\s+/g, '');
    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      setError('Mã xác thực phải gồm 6 chữ số');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await authApi.login2FA(tempToken, cleanCode);
      if (res.data && 'accessToken' in res.data) {
        onSuccess(res.data.user, { accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
      }
    } catch (err: any) {
      setError(err.message || 'Mã không đúng hoặc phiên đã hết hạn');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Xác thực 2 bước</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-[#00a3d9]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#00a3d9]">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            Tài khoản của bạn đã được bảo vệ bằng xác thực 2 yếu tố. Vui lòng mở ứng dụng <strong>Google Authenticator</strong> và nhập mã 6 số.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-[280px] mx-auto">
            {error && <FormAlert message={error} />}
            <AuthInput
              id="2fa-code"
              placeholder="123456"
              maxLength={6}
              value={code}
              onValueChange={setCode}
              className="text-center text-2xl tracking-[0.5em] font-mono h-14"
              autoFocus
            />
            <SubmitButton loading={loading} loadingText="Đang xác thực...">
              Xác thực
            </SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}
