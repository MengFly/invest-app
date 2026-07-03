import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { colors } from '@/theme'
import type { FundBasicInfo } from '@/types'

interface FundInfoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  basicInfo: FundBasicInfo | null
}

export function FundInfoDialog({
  open,
  onOpenChange,
  basicInfo,
}: FundInfoDialogProps) {
  const rows = basicInfo
    ? [
        { label: '基金名称', value: basicInfo.fundName, mono: false },
        { label: '基金代码', value: basicInfo.fundCode, mono: true },
        { label: '基金类型', value: basicInfo.fundType, mono: false },
        { label: '基金经理', value: basicInfo.manager, mono: false },
        { label: '基金公司', value: basicInfo.company, mono: false },
      ]
    : []

  const titleName = basicInfo?.fundName ?? '--'
  const titleCode = basicInfo?.fundCode ?? ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-xl p-6 gap-0 max-h-[80vh] flex flex-col">
        <div className="mb-5">
          <DialogTitle className="text-left text-lg font-semibold tracking-tight text-[#1A1D26]">
            基金信息
          </DialogTitle>
          <DialogDescription className="text-left text-sm text-[#6B7280] mt-1">
            {titleName}
            {titleCode && ` (${titleCode})`}
          </DialogDescription>
        </div>

        <ScrollArea className="flex-1 pr-1">
          {basicInfo ? (
            <>
              {rows.map((row, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-3"
                  style={
                    i < rows.length - 1
                      ? { borderBottomWidth: 1, borderBottomColor: colors.borderLight }
                      : undefined
                  }
                >
                  <span className="text-sm" style={{ color: colors.textSecondary }}>
                    {row.label}
                  </span>
                  <span
                    className="text-sm font-medium text-right shrink-0 ml-4 max-w-[60%] truncate"
                    style={{
                      color: colors.textPrimary,
                      fontFamily: row.mono ? 'ui-monospace, monospace' : undefined,
                    }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}

              {basicInfo.managementFees.length > 0 && (
                <div className="mt-5">
                  <h4
                    className="text-sm font-semibold mb-1"
                    style={{ color: colors.textPrimary }}
                  >
                    管理费率
                  </h4>
                  {basicInfo.managementFees.map((fee, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-3"
                      style={
                        i < basicInfo.managementFees.length - 1
                          ? { borderBottomWidth: 1, borderBottomColor: colors.borderLight }
                          : undefined
                      }
                    >
                      <span className="text-sm" style={{ color: colors.textSecondary }}>
                        {fee.name}
                      </span>
                      <span
                        className="text-sm font-medium"
                        style={{
                          color: colors.textPrimary,
                          fontFamily: 'ui-monospace, monospace',
                        }}
                      >
                        {fee.value.toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {basicInfo.buyRules.length > 0 && (
                <div className="mt-5">
                  <h4
                    className="text-sm font-semibold mb-1"
                    style={{ color: colors.textPrimary }}
                  >
                    买入费率
                  </h4>
                  {basicInfo.buyRules.map((rule, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-3"
                      style={
                        i < basicInfo.buyRules.length - 1
                          ? { borderBottomWidth: 1, borderBottomColor: colors.borderLight }
                          : undefined
                      }
                    >
                      <span className="text-sm" style={{ color: colors.textSecondary }}>
                        {rule.minAmount === 0
                          ? '任意金额'
                          : `${rule.minAmount.toLocaleString()}元以上`}
                      </span>
                      <span
                        className="text-sm font-medium"
                        style={{
                          color: colors.textPrimary,
                          fontFamily: 'ui-monospace, monospace',
                        }}
                      >
                        {rule.value.toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {basicInfo.sellRules.length > 0 && (
                <div className="mt-5">
                  <h4
                    className="text-sm font-semibold mb-1"
                    style={{ color: colors.textPrimary }}
                  >
                    赎回费率
                  </h4>
                  {basicInfo.sellRules.map((rule, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-3"
                      style={
                        i < basicInfo.sellRules.length - 1
                          ? { borderBottomWidth: 1, borderBottomColor: colors.borderLight }
                          : undefined
                      }
                    >
                      <span className="text-sm" style={{ color: colors.textSecondary }}>
                        持有{rule.dayStart}天
                        {rule.dayEnd ? `-${rule.dayEnd}天` : '以上'}
                      </span>
                      <span
                        className="text-sm font-medium"
                        style={{
                          color: colors.textPrimary,
                          fontFamily: 'ui-monospace, monospace',
                        }}
                      >
                        {rule.value.toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div
              className="text-center py-8 text-sm"
              style={{ color: colors.textSecondary }}
            >
              暂无基金信息
            </div>
          )}
        </ScrollArea>

        <Button
          variant="outline"
          className="w-full h-11 rounded-xl text-sm font-medium mt-4 border"
          style={{ borderColor: colors.border, color: colors.textSecondary }}
          onClick={() => onOpenChange(false)}
        >
          关闭
        </Button>
      </DialogContent>
    </Dialog>
  )
}
