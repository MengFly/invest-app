import { useState } from 'react'
import { Calendar } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { colors } from '@/theme'
import { formatMoney, formatPercent } from '@/utils/format'
import { addTransaction } from '@/services/transaction'
import { getHoldings } from '@/services/portfolio'
import type { HoldingSummary } from '@/types'

interface SellDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fundCode: string
  fundName: string
  summary: HoldingSummary | null
  onSuccess?: () => void
}

export function SellDialog({
  open,
  onOpenChange,
  fundCode,
  fundName,
  summary,
  onSuccess,
}: SellDialogProps) {
  const [shares, setShares] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const holdShares = summary?.holdShares ?? 0
  const holdAmount = summary?.holdAmount ?? 0
  const totalProfit = summary?.totalProfit ?? 0
  const totalProfitRate = summary?.totalProfitRate ?? 0
  const latestNav = summary?.latestNav ?? 0

  const numShares = parseFloat(shares.replace(/,/g, '')) || 0
  const estAmount = numShares > 0 && latestNav > 0 ? numShares * latestNav : 0
  const fee = estAmount > 0 ? estAmount * 0.001 : 0
  const actual = estAmount - fee

  const costNav = holdShares > 0 ? (summary?.totalInvested ?? 0) / holdShares : 0
  const estProfit = numShares > 0 && latestNav > 0 ? (latestNav - costNav) * numShares : 0

  const overSell = numShares > holdShares
  const canSubmit = numShares > 0 && !overSell && latestNav > 0 && holdShares > 0 && !submitting

  const percentages = [
    { label: '10%', ratio: 0.1 },
    { label: '25%', ratio: 0.25 },
    { label: '50%', ratio: 0.5 },
    { label: '75%', ratio: 0.75 },
    { label: '全部', ratio: 1 },
  ]
  const [activePct, setActivePct] = useState(0)

  const applyPct = (ratio: number) => {
    setActivePct(ratio)
    if (holdShares <= 0) {
      setShares('')
      return
    }
    setShares((holdShares * ratio).toFixed(2))
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  const profitColor = totalProfit >= 0 ? colors.profit : colors.loss

  const resetForm = () => {
    setShares('')
    setNote('')
    setActivePct(0)
    setSubmitting(false)
  }

  const handleConfirm = async () => {
    if (numShares <= 0) {
      alert('请输入赎回份额')
      return
    }
    if (overSell) {
      alert(`赎回份额不能超过持有份额 ${holdShares.toFixed(2)} 份`)
      return
    }
    if (latestNav <= 0) {
      alert('最新净值数据未加载，请稍后重试')
      return
    }
    if (holdShares <= 0) {
      alert('当前无持有份额，无法赎回')
      return
    }
    setSubmitting(true)
    try {
      const holdings = await getHoldings()
      if (!holdings.some((h) => h.code === fundCode)) {
        alert('持仓不存在，可能已被删除')
        return
      }
      await addTransaction({
        fundCode,
        type: 'sell',
        date: todayStr,
        amount: actual,
        shares: numShares,
        fee,
        note: note.trim() || undefined,
      })
      resetForm()
      onOpenChange(false)
      onSuccess?.()
    } catch (e) {
      alert(e instanceof Error ? e.message : '赎回失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-xl p-6 gap-0 max-h-[90vh] overflow-y-auto">
        <div className="mb-4">
          <DialogTitle className="text-left text-lg font-semibold tracking-tight text-[#1A1D26]">
            减仓
          </DialogTitle>
          <DialogDescription className="text-left text-sm text-[#6B7280] mt-1">
            {fundName} ({fundCode})
          </DialogDescription>
        </div>

        <div
          className="flex gap-2 rounded-2xl p-3 mb-4"
          style={{ backgroundColor: colors.bgInput }}
        >
          <div className="flex-1 text-center">
            <div className="text-[11px]" style={{ color: colors.textTertiary }}>
              持有金额
            </div>
            <div
              className="mt-1 text-sm font-semibold"
              style={{
                color: colors.textPrimary,
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              {formatMoney(holdAmount)}
            </div>
          </div>
          <div className="flex-1 text-center">
            <div className="text-[11px]" style={{ color: colors.textTertiary }}>
              持有份额
            </div>
            <div
              className="mt-1 text-sm font-semibold"
              style={{
                color: colors.textPrimary,
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              {holdShares.toFixed(2)} 份
            </div>
          </div>
          <div className="flex-1 text-center">
            <div className="text-[11px]" style={{ color: colors.textTertiary }}>
              持有收益
            </div>
            <div
              className="mt-1 text-sm font-semibold"
              style={{
                color: profitColor,
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              {formatMoney(totalProfit, true)}
            </div>
            <div
              className="text-[11px]"
              style={{ color: profitColor, fontFamily: 'ui-monospace, monospace' }}
            >
              ({formatPercent(totalProfitRate)})
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: colors.textSecondary }}
          >
            交易日期
          </label>
          <div
            className="flex items-center h-11 px-4 rounded-2xl border gap-2"
            style={{
              backgroundColor: colors.bgInput,
              borderColor: colors.border,
            }}
          >
            <Calendar size={16} color={colors.textTertiary} />
            <span
              className="text-sm font-medium ml-2"
              style={{
                color: colors.textPrimary,
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              {todayStr}
            </span>
          </div>
        </div>

        <div className="mb-4">
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: colors.textSecondary }}
          >
            赎回份额
          </label>
          <div
            className="flex justify-between mb-1.5"
            style={{ color: colors.textTertiary }}
          >
            <span className="text-[11px]">可赎回份额</span>
            <span
              className="text-[11px] font-medium"
              style={{
                color: colors.textSecondary,
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              {holdShares.toFixed(2)} 份
            </span>
          </div>
          <div
            className="flex items-center h-12 px-4 rounded-2xl border"
            style={{
              backgroundColor: colors.bgInput,
              borderColor: overSell ? colors.loss : colors.border,
            }}
          >
            <input
              type="text"
              inputMode="decimal"
              placeholder="请输入赎回份额"
              value={shares}
              onChange={(t) => {
                setShares(t.target.value)
                setActivePct(0)
              }}
              className="flex-1 bg-transparent text-base font-semibold outline-none"
              style={{
                color: colors.textPrimary,
                fontFamily: 'ui-monospace, monospace',
              }}
            />
            <span
              className="ml-2 text-sm font-medium"
              style={{ color: colors.textTertiary }}
            >
              份
            </span>
          </div>
          {overSell && (
            <div className="text-[11px] mt-1.5" style={{ color: colors.loss }}>
              赎回份额不能超过持有份额
            </div>
          )}
          <div className="flex gap-2 mt-3">
            {percentages.map((p) => (
              <button
                key={p.label}
                type="button"
                className="flex-1 h-8 rounded-xl text-sm font-medium transition-colors"
                style={{
                  backgroundColor:
                    activePct === p.ratio
                      ? colors.primaryLight
                      : colors.bgInput,
                  color:
                    activePct === p.ratio ? colors.primary : colors.textSecondary,
                  fontWeight: activePct === p.ratio ? 600 : 500,
                  opacity: holdShares <= 0 ? 0.4 : 1,
                }}
                onClick={() => applyPct(p.ratio)}
                disabled={holdShares <= 0}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div
          className="rounded-2xl p-4 mb-4"
          style={{ backgroundColor: colors.primaryLight }}
        >
          <div className="flex justify-between items-center py-1.5">
            <span className="text-sm" style={{ color: colors.textSecondary }}>
              赎回份额
            </span>
            <span
              className="text-sm font-semibold"
              style={{
                color: colors.textPrimary,
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              {numShares.toFixed(2)} 份
            </span>
          </div>
          <div
            className="flex justify-between items-center py-1.5"
            style={{ borderTopWidth: 1, borderTopColor: 'rgba(197,61,67,0.18)' }}
          >
            <span className="text-sm" style={{ color: colors.textSecondary }}>
              预估金额
            </span>
            <span
              className="text-sm font-semibold"
              style={{
                color: colors.textPrimary,
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              ¥{estAmount.toFixed(2)}
            </span>
          </div>
          <div
            className="flex justify-between items-center py-1.5"
            style={{ borderTopWidth: 1, borderTopColor: 'rgba(197,61,67,0.18)' }}
          >
            <span className="text-sm" style={{ color: colors.textSecondary }}>
              预估收益
            </span>
            <span
              className="text-sm font-semibold"
              style={{
                color: estProfit >= 0 ? colors.profit : colors.loss,
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              {estProfit >= 0 ? '+' : ''}¥{Math.abs(estProfit).toFixed(2)}
            </span>
          </div>
          <div
            className="flex justify-between items-center py-1.5"
            style={{ borderTopWidth: 1, borderTopColor: 'rgba(197,61,67,0.18)' }}
          >
            <div className="flex items-center gap-1">
              <span className="text-sm" style={{ color: colors.textSecondary }}>
                手续费
              </span>
              <span className="text-[11px]" style={{ color: colors.textTertiary }}>
                (0.10%, {'>'}7天免手续费)
              </span>
            </div>
            <span
              className="text-sm font-semibold"
              style={{
                color: colors.textPrimary,
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              ¥{fee.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center pt-3">
            <span
              className="text-sm font-semibold"
              style={{ color: colors.textPrimary }}
            >
              实际到账
            </span>
            <span
              className="text-base font-bold"
              style={{
                color: colors.textPrimary,
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              ¥{actual.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="mb-5">
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: colors.textSecondary }}
          >
            备注
          </label>
          <input
            type="text"
            placeholder="选填"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full h-10 px-4 rounded-2xl border text-sm outline-none"
            style={{
              backgroundColor: colors.bgInput,
              borderColor: colors.border,
              color: colors.textPrimary,
            }}
          />
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-11 rounded-2xl text-sm font-semibold border"
            style={{ borderColor: colors.border, color: colors.textSecondary }}
            onClick={() => {
              resetForm()
              onOpenChange(false)
            }}
          >
            取消
          </Button>
          <Button
            className="flex-1 h-11 rounded-2xl text-sm font-semibold text-white border-0"
            style={{
              backgroundColor: colors.primary,
              opacity: !canSubmit ? 0.4 : 1,
            }}
            onClick={handleConfirm}
            disabled={!canSubmit}
          >
            {submitting ? '提交中...' : '确认赎回'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
