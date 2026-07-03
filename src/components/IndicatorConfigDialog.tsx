import { useState, useEffect } from 'react'
import { ChevronRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { colors } from '@/theme'
import { getAllIndicators } from '@/indicators'
import { useIndicatorConfig } from '@/hooks/useIndicatorConfig'
import {
  getIndicatorState,
  setIndicatorEnabled,
  setIndicatorConfig,
} from '@/services/indicatorConfig'
import type { IndicatorDefinition, IndicatorConfig, ConfigField } from '@/types'

const GROUPS: IndicatorDefinition['group'][] = [
  '收益指标',
  '风险指标',
  '持仓指标',
  '基金指标',
]

interface IndicatorConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fundCode: string
}

export function IndicatorConfigDialog({
  open,
  onOpenChange,
  fundCode,
}: IndicatorConfigDialogProps) {
  const allIndicators = getAllIndicators()
  const { configMap, loading, refresh } = useIndicatorConfig(fundCode)
  const [detailDef, setDetailDef] = useState<IndicatorDefinition | null>(null)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm rounded-xl p-6 gap-0 max-h-[85vh] flex flex-col">
          <DialogTitle className="text-left text-lg font-semibold tracking-tight text-[#1A1D26] mb-4">
            指标配置
          </DialogTitle>

          <ScrollArea className="flex-1 pr-1">
            {loading ? (
              <div
                className="text-center py-8 text-sm"
                style={{ color: colors.textSecondary }}
              >
                加载配置...
              </div>
            ) : (
              GROUPS.map((group) => {
                const items = allIndicators.filter((it) => it.group === group)
                if (items.length === 0) return null
                return (
                  <div
                    key={group}
                    className="rounded-2xl overflow-hidden mb-2 border"
                    style={{
                      backgroundColor: colors.bgCard,
                      borderColor: colors.borderLight,
                    }}
                  >
                    <div
                      className="px-3 py-2 border-b text-[11px] font-semibold"
                      style={{
                        borderBottomColor: colors.borderLight,
                        color: colors.textTertiary,
                      }}
                    >
                      {group}
                    </div>
                    {items.map((it, idx) => {
                      const enabled = configMap?.[it.id]?.enabled ?? false
                      return (
                        <button
                          key={it.id}
                          type="button"
                          className="w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors"
                          style={
                            idx < items.length - 1
                              ? {
                                  borderBottomWidth: 1,
                                  borderBottomColor: colors.borderLight,
                                }
                              : undefined
                          }
                          onClick={() => setDetailDef(it)}
                        >
                          <div className="flex-1 mr-3 min-w-0">
                            <div
                              className="text-sm font-medium"
                              style={{ color: colors.textPrimary }}
                            >
                              {it.name}
                            </div>
                            <div
                              className="text-[11px] mt-0.5 truncate"
                              style={{ color: colors.textTertiary }}
                            >
                              {it.desc}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: enabled
                                  ? colors.primaryLight
                                  : colors.bgInput,
                                color: enabled
                                  ? colors.primary
                                  : colors.textTertiary,
                              }}
                            >
                              {enabled ? '已添加' : '未添加'}
                            </span>
                            <ChevronRight
                              size={14}
                              color={colors.textTertiary}
                            />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              })
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

      {detailDef && (
        <IndicatorDetailDialog
          def={detailDef}
          fundCode={fundCode}
          open={!!detailDef}
          onOpenChange={() => {
            setDetailDef(null)
            refresh()
          }}
        />
      )}
    </>
  )
}

interface IndicatorDetailDialogProps {
  def: IndicatorDefinition
  fundCode: string
  open: boolean
  onOpenChange: () => void
}

function IndicatorDetailDialog({
  def,
  fundCode,
  open,
  onOpenChange,
}: IndicatorDetailDialogProps) {
  const [enabled, setEnabledState] = useState(false)
  const [config, setConfigState] = useState<IndicatorConfig>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    getIndicatorState(fundCode, def.id).then((state) => {
      if (state) {
        setEnabledState(state.enabled)
        setConfigState({ ...state.config })
      } else {
        setEnabledState(false)
        setConfigState({ ...def.defaultConfig })
      }
      setLoading(false)
    })
  }, [open, fundCode, def])

  const handleEnabledChange = (value: boolean) => {
    setEnabledState(value)
    setIndicatorEnabled(fundCode, def.id, value)
  }

  const handleConfigChange = (key: string, value: boolean | string | number) => {
    const nextConfig = { ...config, [key]: value }
    setConfigState(nextConfig)
    setIndicatorConfig(fundCode, def.id, { [key]: value })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-xl p-6 gap-0 max-h-[85vh] overflow-y-auto">
        <div className="mb-4">
          <DialogTitle className="text-left text-lg font-semibold tracking-tight text-[#1A1D26]">
            {def.name}
          </DialogTitle>
          <DialogDescription className="text-left text-sm text-[#6B7280] mt-1">
            {def.desc}
          </DialogDescription>
          <div
            className="inline-block rounded-full px-2 py-0.5 mt-2"
            style={{ backgroundColor: colors.bgInput }}
          >
            <span
              className="text-[10px] font-medium"
              style={{ color: colors.textTertiary }}
            >
              {def.group}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-6 text-sm" style={{ color: colors.textSecondary }}>
            加载配置...
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5 py-1">
              <span className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                启用该指标
              </span>
              <Switch
                checked={enabled}
                onCheckedChange={handleEnabledChange}
              />
            </div>

            {def.configSchema.length > 0 && (
              <div className="mb-4">
                <div
                  className="text-[11px] font-medium mb-2"
                  style={{ color: colors.textTertiary }}
                >
                  配置
                </div>
                <div
                  className="rounded-xl px-3"
                  style={{
                    backgroundColor: colors.bgInput,
                    opacity: enabled ? 1 : 0.6,
                  }}
                >
                  {def.configSchema.map((field, idx) => (
                    <ConfigFieldRenderer
                      key={field.key}
                      field={field}
                      value={config[field.key]}
                      disabled={!enabled}
                      onChange={(v) => handleConfigChange(field.key, v)}
                      isLast={idx === def.configSchema.length - 1}
                    />
                  ))}
                </div>
                {!enabled && (
                  <div
                    className="text-[11px] text-center mt-1.5"
                    style={{ color: colors.textTertiary }}
                  >
                    启用指标后可编辑配置
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <Button
          variant="outline"
          className="w-full h-11 rounded-xl text-sm font-medium border"
          style={{ borderColor: colors.border, color: colors.textSecondary }}
          onClick={onOpenChange}
        >
          关闭
        </Button>
      </DialogContent>
    </Dialog>
  )
}

function ConfigFieldRenderer({
  field,
  value,
  disabled,
  onChange,
  isLast,
}: {
  field: ConfigField
  value: boolean | string | number | undefined
  disabled: boolean
  onChange: (v: boolean | string | number) => void
  isLast: boolean
}) {
  const fieldValue = value ?? field.default

  return (
    <div
      className="flex items-center justify-between py-2.5"
      style={
        !isLast
          ? { borderBottomWidth: 1, borderBottomColor: colors.borderLight }
          : undefined
      }
    >
      <span
        className="text-sm shrink-0 mr-3"
        style={{
          color: disabled ? colors.textTertiary : colors.textSecondary,
        }}
      >
        {field.label}
      </span>

      {field.type === 'boolean' && (
        <Switch
          checked={Boolean(fieldValue)}
          onCheckedChange={onChange}
          disabled={disabled}
        />
      )}

      {field.type === 'enum' && (
        <div
          className="flex rounded-md border overflow-hidden shrink-0"
          style={{ borderColor: colors.border, opacity: disabled ? 0.5 : 1 }}
        >
          {field.options?.map((opt) => {
            const active = fieldValue === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                className="px-2.5 py-1 text-[11px] font-medium transition-colors"
                style={{
                  backgroundColor: active ? colors.primary : 'transparent',
                  color: active ? colors.bgCard : colors.textSecondary,
                }}
                onClick={() => !disabled && onChange(opt.value)}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      )}

      {field.type === 'number' && (
        <input
          type="number"
          value={String(fieldValue)}
          min={field.min}
          max={field.max}
          step={field.step}
          disabled={disabled}
          onChange={(e) => {
            const num = Number(e.target.value)
            if (!isNaN(num)) onChange(num)
          }}
          className="w-16 px-2 py-1 rounded-md border text-center text-[11px] outline-none"
          style={{
            borderColor: colors.border,
            backgroundColor: disabled ? colors.bgInput : colors.bgCard,
            color: disabled ? colors.textTertiary : colors.textPrimary,
            fontFamily: 'ui-monospace, monospace',
          }}
        />
      )}
    </div>
  )
}
