// 数据导出导入工具 - 导出/导入持久化数据 (JSON)
// 支持持仓、排序、交易记录的合并导入
import type { Holding, Transaction } from '@/types';
import { clearAllTxCache } from '@/services/transaction';

// ===== 导出数据类型定义 =====

const EXPORT_VERSION = 1;

export interface ExportData {
  version: number;
  exportedAt: string;
  holdings: Holding[];
  order: string[];
  transactions: Transaction[];
}

// ===== localStorage 键 =====

const HOLDINGS_KEY = 'portfolio:holdings';
const ORDER_KEY = 'portfolio:order';
const TRANSACTIONS_KEY = 'portfolio:transactions';

// ===== 导出 =====

export function exportData(): ExportData {
  const holdings = readJSON<Holding[]>(HOLDINGS_KEY) ?? [];
  const order = readJSON<string[]>(ORDER_KEY) ?? [];
  const transactions = readJSON<Transaction[]>(TRANSACTIONS_KEY) ?? [];

  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    holdings,
    order,
    transactions,
  };
}

// ===== 导入 (合并) =====

export async function importData(data: ExportData): Promise<ImportResult> {
  const errors: string[] = [];

  // 1. 合并持仓：文件中有的本地没有则新增，已有的跳过
  try {
    mergeHoldings(data.holdings);
  } catch (e) {
    errors.push(`持仓导入失败: ${e instanceof Error ? e.message : '未知错误'}`);
  }

  // 2. 合并排序：合并所有基金代码，已有的顺序不变，新增的追加到末尾
  try {
    mergeOrder(data.order);
  } catch (e) {
    errors.push(`排序导入失败: ${e instanceof Error ? e.message : '未知错误'}`);
  }

  // 3. 合并交易记录：按 id 去重，有的跳过
  try {
    mergeTransactions(data.transactions);
    clearAllTxCache();
  } catch (e) {
    errors.push(`交易记录导入失败: ${e instanceof Error ? e.message : '未知错误'}`);
  }

  return { success: errors.length === 0, errors };
}

export interface ImportResult {
  success: boolean;
  errors: string[];
}

// ===== JSON 下载 =====

export function downloadJson(data: ExportData, filename?: string): void {
  const name = filename ?? `invest-data-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ===== JSON 上传解析 =====

export function parseImportFile(file: File): Promise<ExportData> {
  return new Promise((resolve, reject) => {
    if (!file.name.endsWith('.json')) {
      reject(new Error('请选择 .json 格式的文件'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text) as ExportData;
        if (!data.version || !Array.isArray(data.holdings) || !Array.isArray(data.transactions) || !Array.isArray(data.order)) {
          reject(new Error('文件格式无效，缺少必要字段'));
          return;
        }
        resolve(data);
      } catch {
        reject(new Error('文件解析失败，请检查文件内容'));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

// ===== 内部合并逻辑 =====

function mergeHoldings(imported: Holding[]): void {
  const local = readJSON<Holding[]>(HOLDINGS_KEY) ?? [];
  const localCodes = new Set(local.map((h) => h.code));
  let changed = false;

  for (const h of imported) {
    if (!localCodes.has(h.code)) {
      local.push(h);
      localCodes.add(h.code);
      changed = true;
    }
  }

  if (changed) {
    localStorage.setItem(HOLDINGS_KEY, JSON.stringify(local));
  }
}

function mergeOrder(imported: string[]): void {
  const local = readJSON<string[]>(ORDER_KEY) ?? [];
  const localSet = new Set(local);
  let changed = false;

  for (const code of imported) {
    if (!localSet.has(code)) {
      local.push(code);
      localSet.add(code);
      changed = true;
    }
  }

  if (changed) {
    localStorage.setItem(ORDER_KEY, JSON.stringify(local));
  }
}

function mergeTransactions(imported: Transaction[]): void {
  const local = readJSON<Transaction[]>(TRANSACTIONS_KEY) ?? [];
  const localIds = new Set(local.map((t) => t.id));
  let changed = false;

  for (const t of imported) {
    if (!localIds.has(t.id)) {
      local.push(t);
      localIds.add(t.id);
      changed = true;
    }
  }

  if (changed) {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(local));
  }
}

// ===== 辅助 =====

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
