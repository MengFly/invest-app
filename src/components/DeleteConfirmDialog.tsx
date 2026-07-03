import { useState, useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { colors } from '@/theme'
import { getHoldings, removeHolding } from '@/services/portfolio'
import { removeByFund } from '@/services/transaction'
import type { Holding } from '@/types'

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fundCode: string
  fundName: string
  onSuccess?: () => void
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  fundCode,
  fundName,
  onSuccess,
}: DeleteConfirmDialogProps) {
  const [holding, setHolding] = useState<Holding | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const all = await getHoldings()
        if (cancelled) return
        setHolding(all.find((h) => h.code === fundCode) ?? null)
      } catch {
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, fundCode])

  const displayName = holding?.name ?? fundName

  const handleConfirm = async () => {
    setSubmitting(true)
    try {
      await removeByFund(fundCode)
      await removeHolding(fundCode)
      onOpenChange(false)
      onSuccess?.()
    } catch (e) {
      alert(e instanceof Error ? e.message : '删除失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs rounded-xl p-6 gap-0">
        <button
          type="button"
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: colors.primaryLight }}
        >
          <AlertTriangle size={24} color={colors.primary} />
        </div>

        <DialogTitle className="text-center text-lg font-semibold tracking-tight text-[#1A1D26]">
          删除持仓
        </DialogTitle>

        {loading ? (
          <div
            className="h-11 flex items-center justify-center mt-2"
            style={{ color: colors.textTertiary }}
          >
            <div className="text-sm">加载中...</div>
          </div>
        ) : (
          <p
            className="mt-2 text-center text-sm leading-relaxed max-w-[280px] mx-auto"
            style={{ color: colors.textSecondary }}
          >
            确定要删除「{displayName}」的持仓记录吗？删除后交易记录将一并清除，此操作不可撤销。
          </p>
        )}

        <div className="flex flex-col gap-3 mt-6">
          <Button
            variant="outline"
            className="w-full h-11 rounded-xl text-sm font-medium border"
            style={{ borderColor: colors.border, color: colors.textPrimary }}
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            className="w-full h-11 rounded-xl text-sm font-semibold text-white border-0"
            style={{
              backgroundColor: colors.primary,
              opacity: submitting || loading ? 0.6 : 1,
            }}
            onClick={handleConfirm}
            disabled={submitting || loading}
          >
            {submitting ? '删除中...' : '确认删除'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
