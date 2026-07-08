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
import { updateTransaction, removeTransaction } from '@/services/transaction'
import { findNavByDate } from '@/utils/navUtils'
import type { Transaction, NetWorthRecord } from '@/types'

interface EditTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: Transaction
  netWorths: NetWorthRecord[]
  onSuccess?: () => void
}

export function EditTransactionDialog({
  open,
  onOpenChange,
  transaction,
  netWorths,
  onSuccess,
}: EditTransactionDialogProps) {
  const [date, setDate] = useState(transaction.date)
  const [amount, setAmount] = useState(String(transaction.amount))
  const [shares, setShares] = useState(String(transaction.shares))
  const [fee, setFee] = useState(String(transaction.fee))
  const [note, setNote] = useState(transaction.note ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const numAmount = parseFloat(amount) || 0
  const numShares = parseFloat(shares) || 0
  const numFee = parseFloat(fee) || 0
  const navRecord = findNavByDate(netWorths, date)
  const dayNav = navRecord?.netWorth ?? 0

  const isBuy = transaction.type === 'buy'
  const typeLabel = isBuy ? '买入' : '卖出'

  const handleSave = async () => {
    if (numAmount <= 0) { alert('请输入金额'); return }
    if (numShares <= 0) { alert('请输入份额'); return }
    if (!navRecord) { alert(`所选日期 ${date} 非交易日`); return }
    setSubmitting(true)
    try {
      await updateTransaction(transaction.id, {
        date,
        amount: numAmount,
        shares: numShares,
        fee: numFee,
        note: note.trim() || undefined,
      }, transaction.fundCode)
      onOpenChange(false)
      onSuccess?.()
    } catch (e) {
      alert(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('确定删除此交易记录？')) return
    setDeleting(true)
    try {
      await removeTransaction(transaction.id, transaction.fundCode)
      onOpenChange(false)
      onSuccess?.()
    } catch {
      alert('删除失败')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-xl p-6 gap-0">
        <div className="mb-5">
          <DialogTitle className="text-left text-lg font-semibold tracking-tight text-[#1A1D26]">
            编辑{typeLabel}记录
          </DialogTitle>
          <DialogDescription className="text-left text-sm text-[#6B7280] mt-1">
            {transaction.id}
          </DialogDescription>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
            交易日期
          </label>
          <div className="flex items-center h-11 px-4 rounded-xl border gap-2"
            style={{ backgroundColor: colors.bgInput, borderColor: colors.border }}>
            <Calendar size={16} color={colors.textTertiary} />
            <input
              type="date" value={date}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              className="flex-1 bg-transparent text-sm font-medium outline-none"
              style={{ color: colors.textPrimary, fontFamily: 'ui-monospace, monospace' }}
            />
          </div>
          {!navRecord && date && (
            <div className="text-[11px] mt-1.5" style={{ color: colors.loss }}>该日非交易日，无净值数据</div>
          )}
        </div>

        {dayNav > 0 && (
          <div className="rounded-xl p-3 mb-4 flex items-center gap-3" style={{ backgroundColor: colors.bgInput }}>
            <div className="text-[11px]" style={{ color: colors.textTertiary }}>当日净值</div>
            <div className="text-sm font-medium font-mono" style={{ color: colors.textPrimary }}>{dayNav.toFixed(4)}</div>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
            {isBuy ? '买入金额' : '卖出金额'}
          </label>
          <div className="flex items-center h-12 px-4 rounded-xl" style={{ backgroundColor: colors.bgInput }}>
            <span className="text-base font-medium mr-2" style={{ color: colors.textTertiary }}>¥</span>
            <input type="text" inputMode="decimal" placeholder="金额"
              value={amount} onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-transparent text-base font-medium outline-none"
              style={{ color: colors.textPrimary, fontFamily: 'ui-monospace, monospace' }} />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
            份额
          </label>
          <div className="flex items-center h-12 px-4 rounded-xl" style={{ backgroundColor: colors.bgInput }}>
            <input type="text" inputMode="decimal" placeholder="份额"
              value={shares} onChange={(e) => setShares(e.target.value)}
              className="flex-1 bg-transparent text-base font-medium outline-none"
              style={{ color: colors.textPrimary, fontFamily: 'ui-monospace, monospace' }} />
            <span className="ml-2 text-sm" style={{ color: colors.textTertiary }}>份</span>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
            手续费
          </label>
          <div className="flex items-center h-12 px-4 rounded-xl" style={{ backgroundColor: colors.bgInput }}>
            <span className="text-base font-medium mr-2" style={{ color: colors.textTertiary }}>¥</span>
            <input type="text" inputMode="decimal" placeholder="手续费"
              value={fee} onChange={(e) => setFee(e.target.value)}
              className="flex-1 bg-transparent text-base font-medium outline-none"
              style={{ color: colors.textPrimary, fontFamily: 'ui-monospace, monospace' }} />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>备注</label>
          <input type="text" placeholder="可选" value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full h-10 px-4 rounded-xl text-sm outline-none"
            style={{ backgroundColor: colors.bgInput, color: colors.textPrimary }} />
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-12 rounded-xl text-sm font-medium border"
            style={{ borderColor: colors.loss, color: colors.loss }}
            onClick={handleDelete}
            disabled={submitting || deleting}
          >
            {deleting ? '删除中...' : '删除'}
          </Button>
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
            disabled={submitting || deleting}
          >
            {submitting ? '保存中...' : '保存'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
