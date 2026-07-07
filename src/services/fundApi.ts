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
 *
 * 注意：天天基金 fundgz 接口固定使用 jsonpgz 作为 JSONP 回调名，
 * 无论请求参数如何，响应始终为 jsonpgz({...})。
 * 因此必须注册 window.jsonpgz 来接收数据。
 */
let fetchSeq = 0; // 请求序列号，防止过期响应污染后续请求

export async function fetchEstimatedNav(code: string): Promise<EstimatedNavData | null> {
  return new Promise((resolve) => {
    const seq = ++fetchSeq;
    const scriptId = `script_est_${code}_${seq}`;
    const url = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`;

    const cleanup = () => {
      // 只在当前 handler 仍然是激活的回调时才清理，避免误删后续请求的 handler
      if ((window as any).jsonpgz === handler) {
        delete (window as any).jsonpgz;
      }
      const el = document.getElementById(scriptId);
      el?.remove();
    };

    const handler = (data: any) => {
      cleanup();
      // 天天基金 fundgz 接口使用中文拼音字段名，需映射到标准接口
      if (data && data.fundcode) {
        const mapped: EstimatedNavData = {
          fundCode: data.fundcode,
          name: data.name ?? '',
          navDate: data.jzrq ?? '',
          nav: parseFloat(data.dwjz) || 0,
          estimatedNav: parseFloat(data.gsz) || 0,
          estimatedChange: parseFloat(data.gszzl) || 0,
          estimatedTime: data.gztime ?? '',
        };
        resolve(mapped);
      } else {
        resolve(null);
      }
    };

    // 注册全局 jsonpgz 回调（天天基金固定使用的回调名）
    (window as any).jsonpgz = handler;

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = url;
    script.onerror = () => { cleanup(); resolve(null); };
    document.body.appendChild(script);

    setTimeout(() => {
      if ((window as any).jsonpgz === handler) {
        cleanup();
        resolve(null);
      }
    }, 10000);
  });
}
