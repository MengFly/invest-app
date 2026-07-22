import { useState, useEffect, useRef } from 'react'
import { Search, Plus, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { colors } from '@/theme'
import { searchFundsFromSupabase } from '@/services/supabase'
import { addHolding, getHoldings } from '@/services/portfolio'
import type { FundListItem } from '@/types'

const RECENT_SEARCH_KEY = 'recent-search-codes'
const DEBOUNCE_MS = 300

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
  const [searchResults, setSearchResults] = useState<FundListItem[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setAddingCode(null)
    setSearchResults([])
    setSearchError(null)
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

  // 防抖搜索：用户输入 300ms 后发起 Supabase 搜索
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    if (!query.trim()) {
      setSearchResults([])
      setSearchError(null)
      return
    }
    setSearchLoading(true)
    setSearchError(null)
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchFundsFromSupabase(query.trim())
        setSearchResults(results)
      } catch (e) {
        setSearchError(e instanceof Error ? e.message : '搜索失败')
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query])

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

        {!query.trim() && recentCodes.length > 0 && (
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
          {query.trim() && (
            <div
              className="text-sm mb-2"
              style={{ color: colors.textTertiary }}
            >
              搜索结果
            </div>
          )}

          {searchLoading && (
            <div
              className="flex flex-col items-center gap-3 py-8"
              style={{ color: colors.textSecondary }}
            >
              <div className="text-sm">搜索中...</div>
            </div>
          )}

          {searchError && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="text-sm" style={{ color: colors.textSecondary }}>
                {searchError}
              </div>
            </div>
          )}

          {!searchLoading && !searchError && query.trim() && (
            <ScrollArea className="h-[280px]">
              {searchResults.length === 0 ? (
                <div
                  className="text-center py-6 text-sm"
                  style={{ color: colors.textTertiary }}
                >
                  未找到匹配的基金
                </div>
              ) : (
                searchResults.map((fund, i) => {
                  const isHeld = heldCodes.has(fund.code)
                  const isAdding = addingCode === fund.code
                  return (
                    <div
                      key={fund.code}
                      className="flex items-center py-3 gap-3"
                      style={
                        i < searchResults.length - 1
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
                })
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