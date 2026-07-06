import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { colors } from '@/theme'
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  getStorageMode,
  setStorageMode,
  testConnection,
  syncLocalToCloud,
  type StorageMode,
} from '@/services/supabase'

interface SupabaseConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfigChange?: () => void
}

export function SupabaseConfigDialog({
  open,
  onOpenChange,
  onConfigChange,
}: SupabaseConfigDialogProps) {
  const [url, setUrl] = useState('')
  const [key, setKey] = useState('')
  const [mode, setMode] = useState<StorageMode>('local')
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!open) return
    const config = getSupabaseConfig()
    if (config) {
      setUrl(config.url)
      setKey(config.key)
    } else {
      setUrl('')
      setKey('')
    }
    setMode(getStorageMode())
    setTestResult(null)
    setSaved(false)
  }, [open])

  const handleTest = async () => {
    if (!url.trim() || !key.trim()) {
      setTestResult({ ok: false, error: '请填写 URL 和 Anon Key' })
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const result = await testConnection({ url: url.trim(), key: key.trim() })
      setTestResult(result)
    } catch {
      setTestResult({ ok: false, error: '测试请求失败' })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    if (mode === 'cloud') {
      if (!url.trim() || !key.trim()) {
        alert('请填写 Supabase URL 和 Anon Key')
        return
      }
      saveSupabaseConfig({ url: url.trim(), key: key.trim() })
      // 同步本地数据到云端
      setSyncing(true)
      try {
        await syncLocalToCloud()
      } catch (e) {
        alert('同步数据失败: ' + (e instanceof Error ? e.message : '未知错误'))
        setSyncing(false)
        return
      }
      setSyncing(false)
    } else {
      clearSupabaseConfig()
    }
    setStorageMode(mode)
    setSaved(true)
    setTimeout(() => {
      onOpenChange(false)
      onConfigChange?.()
    }, 800)
  }

  const handleDisconnect = () => {
    clearSupabaseConfig()
    setStorageMode('local')
    setMode('local')
    setSaved(true)
    setTimeout(() => {
      onOpenChange(false)
      onConfigChange?.()
    }, 500)
  }

  const isConfigured = !!getSupabaseConfig()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-xl p-6 gap-0">
        <div className="mb-5">
          <DialogTitle className="text-left text-lg font-semibold tracking-tight text-[#1A1D26]">
            数据同步设置
          </DialogTitle>
          <DialogDescription className="text-left text-sm text-[#6B7280] mt-1">
            配置 Supabase 云存储实现多端同步
          </DialogDescription>
        </div>

        {/* 存储模式切换 */}
        <div className="mb-5">
          <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
            存储模式
          </label>
          <div className="flex rounded-xl border overflow-hidden" style={{ borderColor: colors.border }}>
            <button
              type="button"
              className="flex-1 py-2.5 text-sm font-medium transition-colors"
              style={{
                backgroundColor: mode === 'local' ? colors.primary : 'transparent',
                color: mode === 'local' ? '#fff' : colors.textSecondary,
              }}
              onClick={() => setMode('local')}
            >
              本地存储
            </button>
            <button
              type="button"
              className="flex-1 py-2.5 text-sm font-medium transition-colors"
              style={{
                backgroundColor: mode === 'cloud' ? colors.primary : 'transparent',
                color: mode === 'cloud' ? '#fff' : colors.textSecondary,
              }}
              onClick={() => setMode('cloud')}
            >
              云端同步
            </button>
          </div>
          {mode === 'cloud' && (
            <div className="text-[11px] mt-1.5" style={{ color: colors.textTertiary }}>
              数据将读写到 Supabase 数据库，多台设备可共享
            </div>
          )}
          {mode === 'local' && (
            <div className="text-[11px] mt-1.5" style={{ color: colors.textTertiary }}>
              数据仅存储在浏览器本地，不同设备间不共享
            </div>
          )}
        </div>

        {/* Supabase 连接配置（仅云端模式需要） */}
        {mode === 'cloud' && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
                Supabase URL
              </label>
              <input
                type="text"
                placeholder="https://xxx.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border text-sm outline-none"
                style={{
                  backgroundColor: colors.bgInput,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                  fontFamily: 'ui-monospace, monospace',
                }}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
                Anon Key
              </label>
              <input
                type="text"
                placeholder="eyJhbGciOiJIUzI1NiIs..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border text-sm outline-none"
                style={{
                  backgroundColor: colors.bgInput,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                  fontFamily: 'ui-monospace, monospace',
                }}
              />
            </div>

            {/* 测试连接按钮 */}
            <div className="flex gap-3 mb-4">
              <Button
                variant="outline"
                className="flex-1 h-11 rounded-xl text-sm font-medium border"
                style={{ borderColor: colors.border, color: colors.textSecondary }}
                onClick={handleTest}
                disabled={testing}
              >
                {testing ? '测试中...' : '测试连接'}
              </Button>
            </div>

            {testResult && (
              <div
                className="rounded-xl px-4 py-2.5 mb-4 text-sm"
                style={{
                  backgroundColor: testResult.ok ? colors.profitBg : colors.lossBg,
                  color: testResult.ok ? colors.profit : colors.loss,
                }}
              >
                {testResult.ok ? '✅ 连接成功，表结构正确' : `❌ ${testResult.error}`}
              </div>
            )}
          </>
        )}

        {saved && (
          <div className="rounded-xl px-4 py-2.5 mb-4 text-sm" style={{ backgroundColor: colors.profitBg, color: colors.profit }}>
            ✅ 设置已保存
          </div>
        )}

        <div className="flex gap-3">
          {isConfigured && mode === 'cloud' && (
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-xl text-sm font-medium border"
              style={{ borderColor: colors.loss, color: colors.loss }}
              onClick={handleDisconnect}
            >
              断开连接
            </Button>
          )}
          <Button
            variant="outline"
            className="flex-1 h-12 rounded-xl text-sm font-medium border"
            style={{ borderColor: colors.border, color: colors.textSecondary }}
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            className="flex-1 h-12 rounded-xl text-sm font-semibold text-white border-0"
            style={{ backgroundColor: colors.primary }}
            onClick={handleSave}
            disabled={syncing}
          >
            {syncing ? '同步中...' : '保存'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
