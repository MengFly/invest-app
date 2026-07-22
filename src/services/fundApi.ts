// 基金接口服务层 - 封装基金数据接口请求
import type { FundBasicInfo, NetWorthRecord, EstimatedNavData } from '@/types';
import { fetchEstimatedNavFromSupabase, fetchFundBasicInfoFromSupabase, fetchFundNetWorthFromSupabase } from './supabase';

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
 * 拉取基金实时估算净值（从 Supabase 查询）
 * 数据由后端服务定时同步到 fund_estimation 表
 */
export async function fetchEstimatedNav(code: string): Promise<EstimatedNavData | null> {
  return fetchEstimatedNavFromSupabase(code);
}
