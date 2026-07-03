import React from 'react';
import { colors } from '@/theme';
import type { LayerDescriptor, ChartCoords } from '@/types';

interface OverlayRendererProps {
  layers: LayerDescriptor[];
  coords: ChartCoords;
}

const DEFAULT_STROKE = colors.textTertiary;
const DEFAULT_DASH = '4,3';
const DEFAULT_LABEL_COLOR = colors.textTertiary;
const DEFAULT_POINT_R = 3;

export function OverlayRenderer({ layers, coords }: OverlayRendererProps) {
  if (!layers || layers.length === 0) return null;

  return (
    <>
      {layers.map((layer, idx) => {
        const key = `${layer.kind}-${idx}`;
        switch (layer.kind) {
          case 'hline': {
            const y = coords.dataToY(layer.y);
            const stroke = layer.stroke ?? DEFAULT_STROKE;
            return (
              <React.Fragment key={key}>
                <line
                  x1={coords.padLeft}
                  y1={y}
                  x2={coords.width - coords.padRight}
                  y2={y}
                  stroke={stroke}
                  strokeWidth={1}
                  strokeDasharray={layer.dash?.join(',') ?? DEFAULT_DASH}
                />
                {layer.label && (
                  <text
                    x={coords.width - coords.padRight}
                    y={y - 4}
                    textAnchor="end"
                    fill={stroke}
                    fontSize={9}
                  >
                    {layer.label}
                  </text>
                )}
              </React.Fragment>
            );
          }

          case 'vline': {
            const x = coords.toX(layer.x);
            const stroke = layer.stroke ?? DEFAULT_STROKE;
            return (
              <React.Fragment key={key}>
                <line
                  x1={x}
                  y1={coords.padTop}
                  x2={x}
                  y2={coords.height - coords.padBottom}
                  stroke={stroke}
                  strokeWidth={1}
                  strokeDasharray={layer.dash?.join(',') ?? DEFAULT_DASH}
                />
                {layer.label && (
                  <text
                    x={x}
                    y={coords.padTop - 4}
                    textAnchor="middle"
                    fill={stroke}
                    fontSize={9}
                  >
                    {layer.label}
                  </text>
                )}
              </React.Fragment>
            );
          }

          case 'polyline': {
            if (layer.points.length === 0) return null;
            const pts = layer.points
              .map((p) => `${coords.toX(p.x).toFixed(1)},${coords.dataToY(p.y).toFixed(1)}`)
              .join(' ');
            const stroke = layer.stroke ?? colors.primary;
            return (
              <React.Fragment key={key}>
                {layer.fill && (
                  <polygon
                    points={`${pts} ${coords.toX(layer.points[layer.points.length - 1].x).toFixed(1)},${(coords.padTop + coords.chartH).toFixed(1)} ${coords.toX(layer.points[0].x).toFixed(1)},${(coords.padTop + coords.chartH).toFixed(1)}`}
                    fill={layer.fill}
                  />
                )}
                <polyline
                  points={pts}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </React.Fragment>
            );
          }

          case 'area': {
            if (layer.points.length === 0) return null;
            const pts = layer.points
              .map((p) => `${coords.toX(p.x).toFixed(1)},${coords.dataToY(p.y).toFixed(1)}`)
              .join(' ');
            const areaPts = `${pts} ${coords.toX(layer.points[layer.points.length - 1].x).toFixed(1)},${(coords.padTop + coords.chartH).toFixed(1)} ${coords.toX(layer.points[0].x).toFixed(1)},${(coords.padTop + coords.chartH).toFixed(1)}`;
            return <polygon key={key} points={areaPts} fill={layer.fill} />;
          }

          case 'point': {
            return (
              <circle
                key={key}
                cx={coords.toX(layer.x)}
                cy={coords.dataToY(layer.y)}
                r={layer.r ?? DEFAULT_POINT_R}
                fill={layer.fill}
              />
            );
          }

          case 'endLabel': {
            const px = coords.toX(layer.x);
            const py = coords.dataToY(layer.y);
            const bg = layer.bg ?? colors.primary;
            const color = layer.color ?? '#FFFFFF';
            const text = layer.text;
            const w = Math.max(40, text.length * 7 + 8);
            return (
              <React.Fragment key={key}>
                <rect x={px - w / 2} y={py - 16} width={w} height={16} rx={3} fill={bg} />
                <text
                  x={px}
                  y={py - 5}
                  textAnchor="middle"
                  fill={color}
                  fontSize={9}
                  fontWeight="600"
                >
                  {text}
                </text>
              </React.Fragment>
            );
          }

          case 'text': {
            const anchor = layer.anchor ?? 'middle';
            return (
              <text
                key={key}
                x={coords.toX(layer.x)}
                y={coords.dataToY(layer.y)}
                textAnchor={anchor}
                fill={layer.color ?? DEFAULT_LABEL_COLOR}
                fontSize={9}
              >
                {layer.text}
              </text>
            );
          }

          default:
            return null;
        }
      })}
    </>
  );
}
