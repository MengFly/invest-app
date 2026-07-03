import { colors } from '@/theme';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

export function Tooltip({ text, children }: TooltipProps) {
  const lines = text.split('\\n');

  return (
    <div className="relative inline-flex group">
      {children}
      <div
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-[11px] leading-relaxed pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-sm text-left"
        style={{
          backgroundColor: colors.textPrimary,
          color: '#fff',
          maxWidth: 320,
          whiteSpace: 'nowrap',
        }}
      >
        {lines.map((line, i) => (
          <span key={i}>
            {i > 0 && <br />}
            {line}
          </span>
        ))}
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
          style={{
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: `5px solid ${colors.textPrimary}`,
          }}
        />
      </div>
    </div>
  );
}
