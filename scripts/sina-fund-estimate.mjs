/**
 * 新浪基金实时估值查询脚本
 * 使用 Node.js 直接请求新浪 fu_ 接口，绕过浏览器 CORS/Referer 限制
 *
 * 用法:
 *   node scripts/sina-fund-estimate.mjs <基金代码> [基金代码...]
 *
 * 示例:
 *   node scripts/sina-fund-estimate.mjs 000001
 *   node scripts/sina-fund-estimate.mjs 000001 110011 005827
 */

const SINA_API = 'https://hq.sinajs.cn/list';

/**
 * 解析新浪 fu_ 接口的批量返回
 * 字段顺序（按逗号切分）:
 *   0 基金名 | 1 时间 HH:MM:SS | 2 估算净值 GSZ | 3 昨日净值 DWJZ
 *   4 ? | 5 0 | 6 估算涨跌幅% GSZZL | 7 估值日期 YYYY-MM-DD
 *   8 ? | 9 ?
 */
function parseSinaFu(text) {
  const results = [];
  for (const line of text.trim().split('\n')) {
    const match = line.match(/var\s+hq_str_fu_(\w+)\s*=\s*"(.*)"/);
    if (!match) continue;
    const code = match[1];
    const body = match[2];
    if (!body) {
      results.push({ code, name: null, estimateNav: null, error: 'empty response' });
      continue;
    }
    const p = body.split(',');
    if (p.length < 8) {
      results.push({ code, name: null, estimateNav: null, error: 'insufficient fields' });
      continue;
    }
    results.push({
      code,
      name: p[0],
      time: p[1],
      estimateNav: parseFloat(p[2]) || 0,       // 估算净值
      yesterdayNav: parseFloat(p[3]) || 0,       // 昨日净值
      estimateChangePct: parseFloat(p[6]) || 0,  // 估算涨跌幅%
      estimateDate: p[7],                        // 估值日期
    });
  }
  return results;
}

/**
 * 获取基金实时估值
 * @param {string[]} codes 基金代码列表
 * @returns {Promise<Array>} 估值数据数组
 */
async function fetchFundEstimates(codes) {
  if (codes.length === 0) return [];

  const uniqueCodes = [...new Set(codes)];
  const url = `${SINA_API}=fu_${uniqueCodes.join(',fu_')}&r=${Date.now()}`;

  const res = await fetch(url, {
    headers: { Referer: 'https://finance.sina.com.cn/' },
  });

  if (!res.ok) {
    throw new Error(`请求失败: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  console.log(text)
  return parseSinaFu(text);
}

// ===== CLI 入口 =====
const codes = process.argv.slice(2);
if (codes.length === 0) {
  console.error('用法: node scripts/sina-fund-estimate.mjs <基金代码> [基金代码...]');
  console.error('示例: node scripts/sina-fund-estimate.mjs 000001 110011 005827');
  process.exit(1);
}

fetchFundEstimates(codes)
  .then((results) => {
    console.log('\n========== 基金实时估值 ==========\n');
    for (const item of results) {
      if (item.error) {
        console.log(`  ${item.code}  ✗ ${item.error}`);
        continue;
      }
      const sign = item.estimateChangePct >= 0 ? '+' : '';
      console.log(`  ${item.code}  ${item.name}`);
      console.log(`    估算净值: ${item.estimateNav.toFixed(4)}`);
      console.log(`    昨日净值: ${item.yesterdayNav.toFixed(4)}`);
      console.log(`    估算涨跌: ${sign}${item.estimateChangePct.toFixed(2)}%`);
      console.log(`    估值时间: ${item.estimateDate} ${item.time}`);
      console.log('');
    }
  })
  .catch((err) => {
    console.error('错误:', err.message);
    process.exit(1);
  });