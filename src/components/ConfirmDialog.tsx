import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { colors } from '@/theme'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs rounded-xl p-6 gap-0">
        <DialogTitle className="text-center text-lg font-semibold tracking-tight" style={{ color: colors.textPrimary }}>
          {title}
        </DialogTitle>

        <p
          className="mt-3 text-center text-sm leading-relaxed"
          style={{ color: colors.textSecondary }}
        >
          {message}
        </p>

        <div className="flex flex-col gap-3 mt-6">
          <Button
            variant="outline"
            className="w-full h-11 rounded-xl text-sm font-medium border"
            style={{ borderColor: colors.border, color: colors.textPrimary }}
            onClick={() => onOpenChange(false)}
          >
            {cancelText}
          </Button>
          <Button
            className="w-full h-11 rounded-xl text-sm font-semibold text-white border-0"
            style={{ backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? '处理中...' : confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
