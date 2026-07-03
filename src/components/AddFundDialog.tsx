import { useState, useEffect } from 'react'
import { Search, Plus, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { colors } from '@/theme'
import { useFundList } from '@/hooks/useFund'
import { addHolding, getHoldings } from '@/services/portfolio'

const RECENT_SEARCH_KEY = 'recent-search-codes'

interface AddFundDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AddFundDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddFundDialogProps) {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [recentCodes, setRecentCodes] = useState<string[]>([])
  const [heldCodes, setHeldCodes] = useState<Set<string>>(new Set())
  const [addingCode, setAddingCode] = useState<string | null>(null)

  const { data: fundList, loading, error, refresh } = useFundList()

  useEffect(() => {
    if (!open) return
    setQuery('')
    setAddingCode(null)
    ;(async () => {
      try {
        const raw = localStorage.getItem(RECENT_SEARCH_KEY)
        if (raw) {
          const codes = JSON.parse(raw) as string[]
          if (Array.isArray(codes)) {
            setRecentCodes(codes)
          }
        }
      } catch {}
      try {
        const holdings = await getHoldings()
        setHeldCodes(new Set(holdings.map((h) => h.code)))
      } catch {}
    })()
  }, [open])

  const addRecent = async (code: string) => {
    try {
      const next = [code, ...recentCodes.filter((c) => c !== code)].slice(0, 6)
      setRecentCodes(next)
      localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(next))
    } catch {}
  }

  const handleAdd = async (code: string, name: string) => {
    if (heldCodes.has(code)) {
      alert('该基金已在持仓中')
      return
    }
    setAddingCode(code)
    try {
      await addHolding(code, name)
      setHeldCodes((prev) => new Set(prev).add(code))
      addRecent(code)
      onOpenChange(false)
      onSuccess?.()
    } catch (e) {
      alert(e instanceof Error ? e.message : '添加失败')
    } finally {
      setAddingCode(null)
    }
  }

  const source = fundList ?? []
  const filtered = query
    ? source.filter((f) => f.name.includes(query) || f.code.includes(query))
    : source

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-xl p-6 gap-0 max-h-[90vh] flex flex-col">
        <DialogTitle className="text-left text-lg font-semibold tracking-tight text-[#1A1D26] mb-4">
          添加基金
        </DialogTitle>

        <div className="mb-5">
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: colors.textSecondary }}
          >
            搜索基金
          </label>
          <div
            className="flex items-center h-11 px-3 rounded-xl gap-2 transition-colors"
            style={{
              backgroundColor: focused ? colors.borderLight : colors.bgInput,
            }}
          >
            <Search size={18} color={colors.textTertiary} />
            <input
              type="text"
              placeholder="输入基金名称或代码"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: colors.textPrimary }}
            />
          </div>
        </div>

        {!query && recentCodes.length > 0 && (
          <div className="mb-5">
            <div
              className="text-sm mb-2"
              style={{ color: colors.textTertiary }}
            >
              最近搜索
            </div>
            <div className="flex flex-wrap gap-2">
              {recentCodes.map((code) => (
                <button
                  key={code}
                  type="button"
                  className="h-8 px-3 rounded-full text-sm"
                  style={{
                    backgroundColor: colors.bgInput,
                    color: colors.textSecondary,
                    fontFamily: 'ui-monospace, monospace',
                  }}
                  onClick={() => setQuery(code)}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0">
          <div
            className="text-sm mb-2"
            style={{ color: colors.textTertiary }}
          >
            基金列表
          </div>

          {loading && !fundList && (
            <div
              className="flex flex-col items-center gap-3 py-8"
              style={{ color: colors.textSecondary }}
            >
              <div className="text-sm">加载中...</div>
            </div>
          )}

          {error && !fundList && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="text-sm" style={{ color: colors.textSecondary }}>
                {error}
              </div>
              <Button variant="outline" size="sm" onClick={refresh}>
                重试
              </Button>
            </div>
          )}

          {fundList && (
            <ScrollArea className="h-[280px]">
              {filtered.map((fund, i) => {
                const isHeld = heldCodes.has(fund.code)
                const isAdding = addingCode === fund.code
                return (
                  <div
                    key={fund.code}
                    className="flex items-center py-3 gap-3"
                    style={
                      i < filtered.length - 1
                        ? { borderBottomWidth: 1, borderBottomColor: colors.borderLight }
                        : undefined
                    }
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-sm font-medium truncate"
                          style={{ color: colors.textPrimary }}
                        >
                          {fund.name}
                        </span>
                        {isHeld && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-sm"
                            style={{
                              color: colors.textTertiary,
                              backgroundColor: colors.bgInput,
                            }}
                          >
                            已添加
                          </span>
                        )}
                      </div>
                      <div
                        className="text-sm mt-0.5"
                        style={{
                          color: colors.textTertiary,
                          fontFamily: 'ui-monospace, monospace',
                        }}
                      >
                        {fund.code}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isHeld || isAdding}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity"
                      style={{
                        backgroundColor: isHeld
                          ? colors.bgInput
                          : colors.secondary,
                      }}
                      onClick={() => handleAdd(fund.code, fund.name)}
                    >
                      {isAdding ? (
                        <div
                          className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                          style={{ borderColor: '#FFFFFF', borderTopColor: 'transparent' }}
                        />
                      ) : isHeld ? (
                        <Check size={16} color={colors.textTertiary} />
                      ) : (
                        <Plus size={16} color="#FFFFFF" />
                      )}
                    </button>
                  </div>
                )
              })}
              {filtered.length === 0 && (
                <div
                  className="text-center py-6 text-sm"
                  style={{ color: colors.textTertiary }}
                >
                  未找到匹配的基金
                </div>
              )}
            </ScrollArea>
          )}
        </div>

        <Button
          variant="outline"
          className="w-full h-11 rounded-xl text-sm font-medium mt-4 border"
          style={{ borderColor: colors.border, color: colors.textSecondary }}
          onClick={() => onOpenChange(false)}
        >
          取消
        </Button>
      </DialogContent>
    </Dialog>
  )
}
