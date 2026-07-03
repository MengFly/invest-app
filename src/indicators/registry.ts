import type { IndicatorDefinition, IndicatorPosition } from '@/types';

const REGISTRY: Record<string, IndicatorDefinition> = {};

export function registerIndicator(def: IndicatorDefinition): void {
  REGISTRY[def.id] = def;
}

export function getIndicator(id: string): IndicatorDefinition | undefined {
  return REGISTRY[id];
}

export function getAllIndicators(): IndicatorDefinition[] {
  return Object.values(REGISTRY);
}

export function getIndicatorsByPosition(pos: IndicatorPosition): IndicatorDefinition[] {
  return Object.values(REGISTRY).filter((def) => def.position === pos);
}

export function getIndicatorsByGroup(group: IndicatorDefinition['group']): IndicatorDefinition[] {
  return Object.values(REGISTRY).filter((def) => def.group === group);
}
