import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { getClient } from '@/services/supabase';
import { useAuth } from '@/hooks/useAuth';
import { colors } from '@/theme';

type AuthMode = 'login' | 'register';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 认证加载中显示 spinner
  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ backgroundColor: colors.bg }}>
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: colors.border, borderTopColor: colors.primary }}
        />
      </div>
    );
  }
  // 已登录用户直接跳转到主界面
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async () => {
    setError(null);

    if (!email.trim()) {
      setError('请输入邮箱');
      return;
    }
    if (!password) {
      setError('请输入密码');
      return;
    }
    if (password.length < 6) {
      setError('密码长度不能少于 6 位');
      return;
    }

    setLoading(true);
    try {
      const client = getClient();

      if (mode === 'login') {
        const { error: signInError } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) {
          if (signInError.message.includes('Invalid login credentials')) {
            throw new Error('邮箱或密码错误');
          } else if (signInError.message.includes('Email not confirmed')) {
            throw new Error('邮箱尚未验证，请检查收件箱');
          }
          throw new Error(signInError.message);
        }
      } else {
        const { data, error: signUpError } = await client.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            throw new Error('该邮箱已注册，请直接登录');
          }
          throw new Error(signUpError.message);
        }
        if (data?.session) {
          // session 存在说明无需邮箱确认，已自动登录
          navigate('/');
          return;
        }
        // session 为 null 说明需要邮箱确认
        setError('✅ 注册成功！请检查邮箱确认邮件（如未收到可先尝试登录）');
        setMode('login');
        setLoading(false);
        return;
      }

      // 登录成功，跳转到主页
      navigate('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSubmit();
    }
  };

  return (
    <div
      className="h-screen w-screen flex items-center justify-center"
      style={{ backgroundColor: colors.bg }}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-2xl border p-8"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.border,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}
      >
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: colors.primary }}
          >
            <span className="text-white text-xl font-bold">💰</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: colors.textPrimary }}>
            基金投资管理
          </h1>
          <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
            {mode === 'login' ? '登录以管理你的基金持仓' : '创建账号开始管理你的投资'}
          </p>
        </div>

        {/* Email */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1.5" style={{ color: colors.textSecondary }}>
            邮箱
          </label>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="email"
            className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all duration-150 focus:ring-2"
            style={{
              backgroundColor: colors.bgInput,
              borderColor: colors.border,
              color: colors.textPrimary,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = colors.primary;
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = colors.border;
              e.currentTarget.style.backgroundColor = colors.bgInput;
            }}
          />
        </div>

        {/* Password */}
        <div className="mb-5">
          <label className="block text-sm font-medium mb-1.5" style={{ color: colors.textSecondary }}>
            密码
          </label>
          <input
            type="password"
            placeholder="至少 6 位"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all duration-150 focus:ring-2"
            style={{
              backgroundColor: colors.bgInput,
              borderColor: colors.border,
              color: colors.textPrimary,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = colors.primary;
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = colors.border;
              e.currentTarget.style.backgroundColor = colors.bgInput;
            }}
          />
        </div>

        {/* Error/Success message */}
        {error && (
          <div
            className="rounded-xl px-4 py-2.5 mb-4 text-sm"
            style={{
              backgroundColor: error.startsWith('✅') ? colors.profitBg : colors.lossBg,
              color: error.startsWith('✅') ? colors.profit : colors.loss,
            }}
          >
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          type="button"
          className="w-full rounded-xl py-2.5 text-sm font-semibold text-white border-0 mb-4 cursor-pointer transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
          style={{ backgroundColor: colors.primary }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              处理中...
            </span>
          ) : (
            mode === 'login' ? '登录' : '注册'
          )}
        </button>

        {/* Toggle mode */}
        <div className="text-center text-sm" style={{ color: colors.textSecondary }}>
          {mode === 'login' ? (
            <>
              还没有账号？
              <button
                type="button"
                className="font-semibold cursor-pointer hover:opacity-70 ml-1"
                style={{ color: colors.primary }}
                onClick={() => { setMode('register'); setError(null); }}
              >
                注册
              </button>
            </>
          ) : (
            <>
              已有账号？
              <button
                type="button"
                className="font-semibold cursor-pointer hover:opacity-70 ml-1"
                style={{ color: colors.primary }}
                onClick={() => { setMode('login'); setError(null); }}
              >
                登录
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
