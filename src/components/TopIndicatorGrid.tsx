import { colors } from '@/theme';
import type { IndicatorDefinition, ValueResult } from '@/types';

interface TopIndicatorGridProps {
  results: { def: IndicatorDefinition; value: ValueResult }[];
}

function getColumns(count: number): number {
  return count <= 4 ? 2 : 3;
}

const SCROLL_MAX_HEIGHT = 180;

export function TopIndicatorGrid({ results }: TopIndicatorGridProps) {
  if (results.length === 0) return null;

  const columns = getColumns(results.length);
  const cellWidth = columns === 2 ? '50%' : '33.33%';
  const needsScroll = results.length >= 7;

  const grid = (
    <div className="flex flex-wrap -mx-1">
      {results.map(({ def, value }) => (
        <div
          key={def.id}
          className="px-1 py-1.5 overflow-hidden"
          style={{ width: cellWidth }}
        >
          <div
            className="rounded-lg px-2.5 py-2"
            style={{ backgroundColor: colors.bg }}
          >
            <div className="text-[10px] leading-[14px] truncate font-medium" style={{ color: colors.textTertiary }}>
              {def.name}
            </div>
            <div
              className="mt-0.5 text-sm font-bold font-mono leading-[18px] truncate"
              style={{ color: value.color ?? colors.textPrimary }}
            >
              {value.value}
            </div>
            {value.sub && (
              <div
                className="text-[9px] leading-[12px] font-mono truncate mt-px"
                style={{ color: colors.textTertiary }}
              >
                {value.sub}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div
      className="overflow-hidden rounded-xl border"
      style={{ borderColor: colors.borderLight }}
    >
      {needsScroll ? (
        <div className="overflow-y-auto p-2" style={{ maxHeight: SCROLL_MAX_HEIGHT }}>
          {grid}
        </div>
      ) : (
        <div className="p-2">{grid}</div>
      )}
    </div>
  );
}
