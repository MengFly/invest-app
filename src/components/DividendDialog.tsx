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
import type { NetWorthRecord } from '@/types'

interface DividendDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fundCode: string
  fundName: string
  netWorths: NetWorthRecord[]
  onSuccess?: () => void
}

export function DividendDialog({
  open,
  onOpenChange,
  fundCode,
  fundName,
  netWorths,
  onSuccess,
}: DividendDialogProps) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  )

  const numAmount = parseFloat(amount.replace(/,/g, '')) || 0

  // 按选定日期查找当日净值（仅用于判断是否交易日）
  const navRecord = netWorths.find((r) => r.date === selectedDate) ?? null
  const isTradingDay = !!navRecord

  const resetForm = () => {
    setAmount('')
    setNote('')
    setSelectedDate(new Date().toISOString().slice(0, 10))
    setSubmitting(false)
  }

  const handleConfirm = async () => {
    if (numAmount <= 0) {
      alert('请输入分红金额')
      return
    }
    setSubmitting(true)
    try {
      const holdings = await getHoldings()
      if (!holdings.some((h) => h.code === fundCode)) {
        alert('请先添加基金到持仓')
        return
      }
      await addTransaction({
        fundCode,
        type: 'dividend',
        date: selectedDate,
        amount: numAmount,
        shares: 0,
        fee: 0,
        note: note.trim() || undefined,
      })
      resetForm()
      onOpenChange(false)
      onSuccess?.()
    } catch (e) {
      alert(e instanceof Error ? e.message : '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-xl p-6 gap-0">
        <div className="mb-5">
          <DialogTitle className="text-left text-lg font-semibold tracking-tight text-[#1A1D26]">
            分红
          </DialogTitle>
          <DialogDescription className="text-left text-sm text-[#6B7280] mt-1">
            {fundName} ({fundCode})
          </DialogDescription>
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
            记录基金现金分红，分红金额会增加累计收益
          </span>
        </div>

        <div className="mb-4">
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: colors.textSecondary }}
          >
            分红日期
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
          {selectedDate && !isTradingDay && (
            <div className="text-[11px] mt-1.5" style={{ color: colors.loss }}>
              该日非交易日，但分红仍可记录
            </div>
          )}
        </div>

        <div className="mb-4">
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: colors.textSecondary }}
          >
            分红金额
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
              placeholder="请输入分红金额"
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
            {submitting ? '提交中...' : '确认'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}