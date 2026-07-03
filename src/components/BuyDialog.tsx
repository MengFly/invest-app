import { useState } from 'react'
import { Info, Calendar } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { colors } from '@/theme'
import { addTransaction } from '@/services/transaction'
import { getHoldings } from '@/services/portfolio'
import { findNavByDate, calcBuyFeeRate } from '@/utils/navUtils'
import type { NetWorthRecord, FundBasicInfo } from '@/types'

interface BuyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fundCode: string
  fundName: string
  netWorths: NetWorthRecord[]
  basicInfo: FundBasicInfo | null
  onSuccess?: () => void
}

export function BuyDialog({
  open,
  onOpenChange,
  fundCode,
  fundName,
  netWorths,
  basicInfo,
  onSuccess,
}: BuyDialogProps) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  )

  const quickAmounts = ['1000', '5000', '10000', '50000']
  const numAmount = parseFloat(amount.replace(/,/g, '')) || 0

  // 按选定日期查找当日净值
  const navRecord = findNavByDate(netWorths, selectedDate)
  const dayNav = navRecord?.netWorth ?? 0

  const estShares = numAmount > 0 && dayNav > 0 ? (numAmount / dayNav).toFixed(2) : '0.00'
  const buyFeeRate = calcBuyFeeRate(basicInfo, numAmount)
  const fee = numAmount > 0 ? (numAmount * buyFeeRate).toFixed(2) : '0.00'

  const resetForm = () => {
    setAmount('')
    setNote('')
    setSelectedDate(new Date().toISOString().slice(0, 10))
    setSubmitting(false)
  }

  const handleConfirm = async () => {
    if (numAmount <= 0) {
      alert('请输入买入金额')
      return
    }
    if (!navRecord) {
      alert(`所选日期 ${selectedDate} 非交易日，请选择有净值数据的日期`)
      return
    }
    setSubmitting(true)
    try {
      const holdings = await getHoldings()
      if (!holdings.some((h) => h.code === fundCode)) {
        alert('请先添加基金到持仓')
        return
      }
      const shares = numAmount / dayNav
      const feeNum = numAmount * buyFeeRate
      await addTransaction({
        fundCode,
        type: 'buy',
        date: selectedDate,
        amount: numAmount,
        shares,
        fee: feeNum,
        note: note.trim() || undefined,
      })
      resetForm()
      onOpenChange(false)
      onSuccess?.()
    } catch (e) {
      alert(e instanceof Error ? e.message : '买入失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-xl p-6 gap-0">
        <div className="mb-5">
          <DialogTitle className="text-left text-lg font-semibold tracking-tight text-[#1A1D26]">
            加仓
          </DialogTitle>
          <DialogDescription className="text-left text-sm text-[#6B7280] mt-1">
            {fundName} ({fundCode})
          </DialogDescription>
        </div>

        <div
          className="flex gap-3 rounded-xl p-3 mb-4"
          style={{ backgroundColor: colors.bgInput }}
        >
          <div className="flex-1">
            <div className="text-[11px]" style={{ color: colors.textTertiary }}>
              所选日净值
            </div>
            <div
              className="mt-0.5 text-base font-medium"
              style={{
                color: colors.textPrimary,
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              {dayNav > 0 ? dayNav.toFixed(4) : '--'}
            </div>
          </div>
          <div className="w-px" style={{ backgroundColor: colors.border }} />
          <div className="flex-1">
            <div className="text-[11px]" style={{ color: colors.textTertiary }}>
              买入费率
            </div>
            <div
              className="mt-0.5 text-base font-medium"
              style={{
                color: colors.textPrimary,
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              {basicInfo && basicInfo.buyRules.length > 0
                ? `${(buyFeeRate * 100).toFixed(2)}%`
                : '--'}
            </div>
          </div>
        </div>

        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2 mb-4"
          style={{ backgroundColor: colors.warningBg }}
        >
          <Info size={14} color={colors.warning} />
          <span
            className="text-[11px] flex-1"
            style={{ color: colors.warning }}
          >
            买入将按确认日的净值成交，实际份额以确认结果为准
          </span>
        </div>

        <div className="mb-4">
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: colors.textSecondary }}
          >
            交易日期
          </label>
          <div
            className="flex items-center h-11 px-4 rounded-xl border gap-2"
            style={{
              backgroundColor: colors.bgInput,
              borderColor: colors.border,
            }}
          >
            <Calendar size={16} color={colors.textTertiary} />
            <input
              type="date"
              value={selectedDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex-1 bg-transparent text-sm font-medium outline-none"
              style={{
                color: colors.textPrimary,
                fontFamily: 'ui-monospace, monospace',
              }}
            />
          </div>
          {!navRecord && selectedDate && (
            <div className="text-[11px] mt-1.5" style={{ color: colors.loss }}>
              该日非交易日，无净值数据
            </div>
          )}
        </div>

        <div className="mb-4">
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: colors.textSecondary }}
          >
            买入金额
          </label>
          <div
            className="flex items-center h-13 px-4 rounded-xl"
            style={{ backgroundColor: colors.bgInput }}
          >
            <span
              className="text-base font-medium mr-2"
              style={{ color: colors.textTertiary }}
            >
              ¥
            </span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="请输入金额"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-transparent text-base font-medium outline-none"
              style={{
                color: colors.textPrimary,
                fontFamily: 'ui-monospace, monospace',
              }}
            />
          </div>
        </div>

        <div className="flex gap-2 mb-5">
          {quickAmounts.map((q) => (
            <button
              key={q}
              type="button"
              className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
              style={{ backgroundColor: colors.bgInput, color: colors.textSecondary }}
              onClick={() => setAmount(q)}
            >
              {parseInt(q).toLocaleString()}
            </button>
          ))}
        </div>

        <div
          className="flex items-center rounded-xl p-3 mb-4"
          style={{ backgroundColor: colors.secondaryLight }}
        >
          <div className="flex-1">
            <div className="text-[11px]" style={{ color: colors.textSecondary }}>
              预估份额
            </div>
            <div
              className="mt-0.5 text-sm font-medium"
              style={{
                color: colors.textPrimary,
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              ~{estShares}{' '}
              <span className="text-[11px] font-normal" style={{ color: colors.textSecondary }}>
                份
              </span>
            </div>
          </div>
          <div
            className="w-px h-8 mx-3"
            style={{ backgroundColor: colors.secondary, opacity: 0.2 }}
          />
          <div className="flex-1">
            <div className="text-[11px]" style={{ color: colors.textSecondary }}>
              手续费
            </div>
            <div
              className="mt-0.5 text-sm font-medium"
              style={{
                color: colors.textPrimary,
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              ¥{fee}{' '}
              <span className="text-[11px] font-normal" style={{ color: colors.textSecondary }}>
                ({(buyFeeRate * 100).toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: colors.textSecondary }}
          >
            备注
          </label>
          <input
            type="text"
            placeholder="可选"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full h-10 px-4 rounded-xl text-sm outline-none"
            style={{
              backgroundColor: colors.bgInput,
              color: colors.textPrimary,
            }}
          />
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-12 rounded-xl text-sm font-medium border"
            style={{ borderColor: colors.border, color: colors.textSecondary }}
            onClick={() => {
              resetForm()
              onOpenChange(false)
            }}
          >
            取消
          </Button>
          <Button
            className="flex-1 h-12 rounded-xl text-sm font-semibold text-white border-0"
            style={{ backgroundColor: colors.secondary }}
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? '提交中...' : '确认买入'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
