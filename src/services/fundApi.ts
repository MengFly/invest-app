// 基金接口服务层 - 封装基金数据接口请求
import type { FundBasicInfo, NetWorthRecord, EstimatedNavData } from '@/types';
import { fetchFundBasicInfoFromSupabase, fetchFundNetWorthFromSupabase } from './supabase';

/**
 * 拉取基金基本信息（从 Supabase 查询）
 * 数据由后端服务定时同步到 fund_basic_info 表
 */
export async function fetchFundBasicInfo(code: string): Promise<FundBasicInfo> {
  const data = await fetchFundBasicInfoFromSupabase(code);
  if (!data) {
    throw new Error(`基金 ${code} 信息不存在`);
  }
  return data;
}

/**
 * 拉取基金净值数据（从 Supabase 查询）
 * 数据由后端服务定时同步到 fund_net_worth 表
 */
export async function fetchFundNetWorth(code: string): Promise<NetWorthRecord[]> {
  const data = await fetchFundNetWorthFromSupabase(code);
  if (!data || data.length === 0) {
    throw new Error(`基金 ${code} 净值数据不存在`);
  }
  return data;
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
