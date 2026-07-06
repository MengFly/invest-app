// 基金接口服务层 - 封装三个真实接口的请求
import type { FundListItem, FundBasicInfo, NetWorthRecord, EstimatedNavData } from '@/types';

// 接口基础地址
const BASE_URL = 'https://mengfly.github.io/invest-backend/fund';

// 请求超时时间
const REQUEST_TIMEOUT = 15000;

/**
 * 带超时的 fetch 封装
 */
async function fetchWithTimeout(url: string, timeout = REQUEST_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 拉取基金列表
 * GET /fund/fund-list.json
 */
export async function fetchFundList(): Promise<FundListItem[]> {
  const res = await fetchWithTimeout(`${BASE_URL}/fund-list.json`);
  if (!res.ok) {
    throw new Error(`基金列表请求失败: ${res.status}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error('基金列表数据格式错误');
  }
  return data as FundListItem[];
}

/**
 * 拉取基金基本信息
 * GET /fund/basic-info/{code}.json
 */
export async function fetchFundBasicInfo(code: string): Promise<FundBasicInfo> {
  const res = await fetchWithTimeout(`${BASE_URL}/basic-info/${code}.json`);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`基金 ${code} 信息不存在`);
    }
    throw new Error(`基金信息请求失败: ${res.status}`);
  }
  const data = await res.json();
  if (!data || !data.fundCode) {
    throw new Error('基金信息数据格式错误');
  }
  return data as FundBasicInfo;
}

/**
 * 拉取基金净值数据
 * GET /fund/net-worth/{code}.json
 */
export async function fetchFundNetWorth(code: string): Promise<NetWorthRecord[]> {
  const res = await fetchWithTimeout(`${BASE_URL}/net-worth/${code}.json`);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`基金 ${code} 净值数据不存在`);
    }
    throw new Error(`基金净值请求失败: ${res.status}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error('基金净值数据格式错误');
  }
  return data as NetWorthRecord[];
}

/**
 * 拉取基金实时估算净值（天天基金 JSONP 接口）
 * 使用 script 标签注入方式请求，通过全局回调接收数据
 */
export async function fetchEstimatedNav(code: string): Promise<EstimatedNavData | null> {
  return new Promise((resolve) => {
    const callbackName = `jsonpgz_${code}_${Date.now()}`;
    const url = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`;

    const cleanup = () => {
      delete (window as any)[callbackName];
      const el = document.getElementById(`script_${callbackName}`);
      el?.remove();
    };

    (window as any)[callbackName] = (data: any) => {
      cleanup();
      if (data && data.fundCode) {
        resolve(data as EstimatedNavData);
      } else {
        resolve(null);
      }
    };

    const script = document.createElement('script');
    script.id = `script_${callbackName}`;
    script.src = url;
    script.onerror = () => { cleanup(); resolve(null); };
    document.body.appendChild(script);

    setTimeout(() => {
      if ((window as any)[callbackName]) {
        cleanup();
        resolve(null);
      }
    }, 10000);
  });
}
