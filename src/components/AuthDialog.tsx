import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getClient } from '@/services/supabase';
import { colors } from '@/theme';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoginSuccess?: () => void;
}

type AuthMode = 'login' | 'register';

export function AuthDialog({ open, onOpenChange, onLoginSuccess }: AuthDialogProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setError(null);
    setLoading(false);
  };

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
          onOpenChange(false);
          onLoginSuccess?.();
          return;
        }
        // session 为 null 说明需要邮箱确认
        setError('✅ 注册成功！请检查邮箱确认邮件（如未收到可先尝试登录）');
        setMode('login');
        setLoading(false);
        return;
      }

      // 登录成功
      onOpenChange(false);
      onLoginSuccess?.();
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
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-sm rounded-xl p-6 gap-0">
        <div className="mb-5">
          <DialogTitle className="text-left text-lg font-semibold tracking-tight" style={{ color: colors.textPrimary }}>
            {mode === 'login' ? '登录' : '注册'}
          </DialogTitle>
          <DialogDescription className="text-left text-sm mt-1" style={{ color: colors.textSecondary }}>
            {mode === 'login' ? '登录后数据将同步到云端' : '创建账号以开启云同步'}
          </DialogDescription>
        </div>

        {/* 邮箱输入 */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
            邮箱
          </label>
          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="email"
          />
        </div>

        {/* 密码输入 */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
            密码
          </label>
          <Input
            type="password"
            placeholder="至少 6 位"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </div>

        {/* 错误提示 */}
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

        {/* 提交按钮 */}
        <Button
          className="w-full h-12 rounded-xl text-sm font-semibold text-white border-0 mb-3"
          style={{ backgroundColor: colors.primary }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? '处理中...' : (mode === 'login' ? '登录' : '注册')}
        </Button>

        {/* 切换登录/注册 */}
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
      </DialogContent>
    </Dialog>
  );
}
