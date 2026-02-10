/**
 * 银保数据自动化报表 - Express API路由
 * 使用S3存储替代本地文件系统
 */
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { processReport } from './report/index';
import { parseSourceFile, validateSourceColumns } from './report/dataSource';
import { parseRenwangFile } from './report/networkAndHr';
import { parseDailyFile } from './report/dailyList';
import { loadLookupTables } from './report/lookups';
import { storagePut, storageGet } from './storage';
import { syncFromTemplate, syncFromRenwang } from './syncSettings';
import { scanStaffFromSource, fillMissingAttribution } from './staffScanner';
import { onStaffChanged } from './settingsApi';
import { generateExcelBuffer } from './exportExcel';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

/**
 * Fix multer filename encoding for Chinese characters.
 * Multer stores originalname in latin1, but browsers send UTF-8.
 */
function fixFilename(name: string): string {
  try {
    return Buffer.from(name, 'latin1').toString('utf8');
  } catch {
    return name;
  }
}

const router = Router();

// ===== S3 存储键 =====
const S3_PREFIX = 'yinbao-data';
const S3_SOURCE_KEY = `${S3_PREFIX}/uploads/source.xlsx`;
const S3_RENWANG_KEY = `${S3_PREFIX}/uploads/renwang.xlsx`;
const S3_DAILY_KEY = `${S3_PREFIX}/uploads/daily.xlsx`;
const S3_REPORT_CACHE_KEY = `${S3_PREFIX}/report_cache.json`;
const S3_META_KEY = `${S3_PREFIX}/upload_meta.json`;

// Template file path - downloaded from CDN on first use
const TEMPLATE_URL = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663337503349/uDkGPpfkbqgXhhdf.xlsx';
let templateBuffer: Buffer | null = null;

async function getTemplateBuffer(): Promise<Buffer> {
  if (templateBuffer) return templateBuffer;
  console.log('[Template] Downloading from CDN...');
  const response = await fetch(TEMPLATE_URL);
  if (!response.ok) throw new Error(`Failed to download template: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  templateBuffer = Buffer.from(arrayBuffer);
  console.log('[Template] Downloaded successfully');
  return templateBuffer;
}

// In-memory storage for uploaded file buffers
let storedSourceBuffer: Buffer | null = null;
let storedRenwangBuffer: Buffer | null = null;
let storedDailyBuffer: Buffer | null = null;

// Cached report data
let cachedReport: any = null;
let cachedMonthStart: number = 1;
let cachedMonthEnd: number = 1;

// Upload meta
let uploadMeta: any = {};

// ===== S3 持久化函数 =====

/** 保存上传的文件到S3 */
async function persistFileToS3(key: string, buffer: Buffer) {
  try {
    await storagePut(key, buffer, 'application/octet-stream');
    console.log(`[S3 Persist] Saved: ${key} (${(buffer.length / 1024).toFixed(0)}KB)`);
  } catch (e) {
    console.error(`[S3 Persist] Failed to save ${key}:`, e);
  }
}

/** 保存JSON数据到S3 */
async function persistJsonToS3(key: string, data: any) {
  try {
    const json = JSON.stringify(data);
    await storagePut(key, json, 'application/json');
    console.log(`[S3 Persist] Saved JSON: ${key}`);
  } catch (e) {
    console.error(`[S3 Persist] Failed to save JSON ${key}:`, e);
  }
}

/** 从S3下载文件 */
async function loadFileFromS3(key: string): Promise<Buffer | null> {
  try {
    const { url } = await storageGet(key);
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (e) {
    console.log(`[S3 Restore] File not found: ${key}`);
    return null;
  }
}

/** 从S3下载JSON */
async function loadJsonFromS3(key: string): Promise<any | null> {
  try {
    const { url } = await storageGet(key);
    // Add cache-busting to avoid CDN stale data
    const bustUrl = url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now();
    const response = await fetch(bustUrl, { cache: 'no-store' });
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    console.log(`[S3 Restore] JSON not found: ${key}`);
    return null;
  }
}

/** 保存报表缓存到S3 */
async function persistReport(report: any, monthStart: number, monthEnd: number) {
  const data = { report, monthStart, monthEnd, savedAt: new Date().toISOString() };
  await persistJsonToS3(S3_REPORT_CACHE_KEY, data);
}

/** 保存上传元信息到S3 */
async function persistMeta(meta: { sourceFileName?: string; renwangFileName?: string; dailyFileName?: string }) {
  uploadMeta = { ...uploadMeta, ...meta, updatedAt: new Date().toISOString() };
  await persistJsonToS3(S3_META_KEY, uploadMeta);
}

/** 启动时从S3恢复数据 */
async function restoreFromS3() {
  console.log('[S3 Restore] Starting data restoration...');
  
  // 恢复上传的文件
  const sourceBuffer = await loadFileFromS3(S3_SOURCE_KEY);
  if (sourceBuffer) {
    storedSourceBuffer = sourceBuffer;
    console.log(`[S3 Restore] Source file loaded (${(sourceBuffer.length / 1024).toFixed(0)}KB)`);
  }
  
  const renwangBuffer = await loadFileFromS3(S3_RENWANG_KEY);
  if (renwangBuffer) {
    storedRenwangBuffer = renwangBuffer;
    console.log(`[S3 Restore] Renwang file loaded (${(renwangBuffer.length / 1024).toFixed(0)}KB)`);
  }
  
  const dailyBuffer = await loadFileFromS3(S3_DAILY_KEY);
  if (dailyBuffer) {
    storedDailyBuffer = dailyBuffer;
    console.log(`[S3 Restore] Daily file loaded (${(dailyBuffer.length / 1024).toFixed(0)}KB)`);
  }

  // 恢复报表缓存
  const cacheData = await loadJsonFromS3(S3_REPORT_CACHE_KEY);
  if (cacheData) {
    cachedReport = cacheData.report;
    cachedMonthStart = cacheData.monthStart || 1;
    cachedMonthEnd = cacheData.monthEnd || 1;
    console.log(`[S3 Restore] Report cache loaded (months ${cachedMonthStart}-${cachedMonthEnd})`);
  }

  // 恢复元信息
  const metaData = await loadJsonFromS3(S3_META_KEY);
  if (metaData) {
    // Fix any garbled filenames from previous uploads
    for (const key of ['sourceFileName', 'renwangFileName', 'dailyFileName']) {
      if (metaData[key]) {
        try {
          const decoded = Buffer.from(metaData[key], 'latin1').toString('utf8');
          if (/[\u4e00-\u9fff]/.test(decoded) && !decoded.includes('\ufffd')) {
            metaData[key] = decoded;
          }
        } catch {}
      }
    }
    uploadMeta = metaData;
    console.log('[S3 Restore] Meta loaded');
  }

  console.log('[S3 Restore] Restoration complete');
}

// 启动时异步恢复（不阻塞服务器启动）
let restorePromise = restoreFromS3().catch(e => {
  console.error('[S3 Restore] Failed:', e);
});

/**
 * Auto-detect month range from source data
 * 
 * 策略：统计每个月份的保单数量，排除上一年遗留数据（如12月），
 * 然后从剩余月份中取 min 和 max 作为统计范围。
 * 判断标准：如果某月份的保单数量不足最大月份的 5%，视为遗留/异常数据。
 */
function detectMonthRange(sourceRows: any[]): { monthStart: number; monthEnd: number } {
  const months = sourceRows
    .map((r: any) => {
      const d = r['保单签单日期'];
      if (!d) return null;
      const date = typeof d === 'number'
        ? new Date(new Date(1899, 11, 30).getTime() + d * 86400000)
        : new Date(d);
      return isNaN(date.getTime()) ? null : date.getMonth() + 1;
    })
    .filter((m: any): m is number => m !== null);

  // 统计每个月份的保单数量
  const monthCounts: Record<number, number> = {};
  for (const m of months) {
    monthCounts[m] = (monthCounts[m] || 0) + 1;
  }
  
  // 如果同时存在1月和12月的数据，排除12月（上一年遗留数据）
  if (monthCounts[1] && monthCounts[12]) {
    console.log(`[detectMonthRange] Excluding month 12 (${monthCounts[12]} records) as previous year data`);
    delete monthCounts[12];
  }
  
  const allMonths = Object.keys(monthCounts).map(m => parseInt(m));
  if (allMonths.length === 0) {
    console.log(`[detectMonthRange] No valid months found, defaulting to 1-1`);
    return { monthStart: 1, monthEnd: 1 };
  }
  
  // 从所有有效月份中取最小和最大值作为统计范围
  const monthStart = Math.min(...allMonths);
  const monthEnd = Math.max(...allMonths);
  
  console.log(`[detectMonthRange] Month counts: ${JSON.stringify(monthCounts)}, valid months: ${allMonths.sort().join(',')}, range: ${monthStart}-${monthEnd}`);
  return { monthStart, monthEnd };
}

/**
 * Try to auto-generate report if both required files are uploaded
 */
async function tryAutoGenerate(): Promise<any | null> {
  if (!storedSourceBuffer || !storedRenwangBuffer) return null;

  try {
    const tplBuffer = await getTemplateBuffer();
    const sourceRaw = parseSourceFile(storedSourceBuffer);
    const { monthStart, monthEnd } = detectMonthRange(sourceRaw);

    console.log(`[Report API] Auto-generating report: months ${monthStart}-${monthEnd}`);
    const report = processReport(
      storedSourceBuffer,
      storedRenwangBuffer,
      tplBuffer,
      monthStart,
      monthEnd,
      storedDailyBuffer || undefined
    );

    // 缓存报表并持久化到S3
    cachedReport = report;
    cachedMonthStart = monthStart;
    cachedMonthEnd = monthEnd;
    await persistReport(report, monthStart, monthEnd);

    return report;
  } catch (error: any) {
    console.error('[Report API] Auto-generate error:', error);
    return null;
  }
}

// ===== API路由 =====

/**
 * GET /api/report/status
 */
router.get('/status', async (_req: Request, res: Response) => {
  await restorePromise; // 确保恢复完成
  
  // Calculate data counts from stored buffers
  let sourceTotalCount = 0;
  let renwangAgencyCount = 0;
  let renwangNetworkCount = 0;
  let dailyTotalCount = 0;
  
  if (storedSourceBuffer) {
    try {
      const rows = parseSourceFile(storedSourceBuffer);
      sourceTotalCount = rows.length;
    } catch (e) {
      console.error('[Status] Error counting source rows:', e);
    }
  }
  if (storedRenwangBuffer) {
    try {
      const { agency, network } = parseRenwangFile(storedRenwangBuffer);
      renwangAgencyCount = agency.length;
      renwangNetworkCount = network.length;
    } catch (e) {
      console.error('[Status] Error counting renwang rows:', e);
    }
  }
  if (storedDailyBuffer) {
    try {
      const rows = parseDailyFile(storedDailyBuffer);
      dailyTotalCount = rows.length;
    } catch (e) {
      console.error('[Status] Error counting daily rows:', e);
    }
  }
  
  res.json({
    hasSource: !!storedSourceBuffer,
    hasRenwang: !!storedRenwangBuffer,
    hasDaily: !!storedDailyBuffer,
    hasReport: !!cachedReport,
    monthStart: cachedMonthStart,
    monthEnd: cachedMonthEnd,
    sourceFileName: uploadMeta.sourceFileName || null,
    renwangFileName: uploadMeta.renwangFileName || null,
    dailyFileName: uploadMeta.dailyFileName || null,
    updatedAt: uploadMeta.updatedAt || null,
    sourceTotalCount,
    renwangAgencyCount,
    renwangNetworkCount,
    dailyTotalCount,
  });
});

/**
 * GET /api/report/current
 */
router.get('/current', async (_req: Request, res: Response) => {
  await restorePromise;
  if (!cachedReport) {
    res.json({ report: null });
    return;
  }
  res.json({
    report: cachedReport,
    monthStart: cachedMonthStart,
    monthEnd: cachedMonthEnd,
  });
});

/**
 * POST /api/report/upload-source
 */
router.post(
  '/upload-source',
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: '请上传文件' });
        return;
      }

      storedSourceBuffer = req.file.buffer;
      console.log('[Report API] Parsing source file...');

      const columnValidation = validateSourceColumns(storedSourceBuffer);

      // 持久化到S3
      await persistFileToS3(S3_SOURCE_KEY, storedSourceBuffer);
      const fixedSourceName = fixFilename(req.file.originalname);
      console.log('[Report API] Source file:', fixedSourceName, 'size:', req.file.buffer.length);
      await persistMeta({ sourceFileName: fixedSourceName });

      // Sync template data to settings on first upload
      try {
        const tpl = await getTemplateBuffer();
        syncFromTemplate(tpl);
      } catch (e) {
        console.error('[Report API] Template sync error:', e);
      }

      // 自动扫描人员信息并更新组织架构
      try {
        console.log('[Report API] Scanning staff from source data...');
        const scanResult = scanStaffFromSource(storedSourceBuffer);
        console.log(`[Report API] Staff scan result: +${scanResult.added.length} added, ${scanResult.transferred.length} transferred, ${scanResult.unchanged} unchanged`);
      } catch (e) {
        console.error('[Report API] Staff scan error:', e);
      }

      const rawRows = parseSourceFile(storedSourceBuffer);
      const report = await tryAutoGenerate();

      res.json({
        rawData: rawRows.slice(0, 3000),
        totalCount: rawRows.length,
        report,
        columnValidation,
      });
    } catch (error: any) {
      console.error('[Report API] Upload source error:', error);
      res.status(500).json({ error: error.message || '文件解析失败' });
    }
  }
);

/**
 * POST /api/report/upload-renwang
 */
router.post(
  '/upload-renwang',
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: '请上传文件' });
        return;
      }

      storedRenwangBuffer = req.file.buffer;
      console.log('[Report API] Parsing renwang file...');

      await persistFileToS3(S3_RENWANG_KEY, storedRenwangBuffer);
      const fixedRenwangName = fixFilename(req.file.originalname);
      console.log('[Report API] Renwang file:', fixedRenwangName, 'size:', req.file.buffer.length);
      await persistMeta({ renwangFileName: fixedRenwangName });

      try {
        syncFromRenwang(storedRenwangBuffer);
      } catch (e) {
        console.error('[Report API] Renwang sync error:', e);
      }

      const { agency, network } = parseRenwangFile(storedRenwangBuffer);
      const report = await tryAutoGenerate();

      res.json({
        rawData: {
          agency: agency.slice(0, 3000),
          network: network.slice(0, 3000),
          agencyTotalCount: agency.length,
          networkTotalCount: network.length,
        },
        report,
      });
    } catch (error: any) {
      console.error('[Report API] Upload renwang error:', error);
      res.status(500).json({ error: error.message || '文件解析失败' });
    }
  }
);

/**
 * POST /api/report/upload-daily
 */
router.post(
  '/upload-daily',
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: '请上传文件' });
        return;
      }

      storedDailyBuffer = req.file.buffer;
      console.log('[Report API] Parsing daily file...');

      await persistFileToS3(S3_DAILY_KEY, storedDailyBuffer);
      const fixedDailyName = fixFilename(req.file.originalname);
      console.log('[Report API] Daily file:', fixedDailyName, 'size:', req.file.buffer.length);
      await persistMeta({ dailyFileName: fixedDailyName });

      const rawRows = parseDailyFile(storedDailyBuffer);
      const report = await tryAutoGenerate();

      res.json({
        rawData: rawRows.slice(0, 3000),
        totalCount: rawRows.length,
        report,
      });
    } catch (error: any) {
      console.error('[Report API] Upload daily error:', error);
      res.status(500).json({ error: error.message || '文件解析失败' });
    }
  }
);

/**
 * POST /api/report/upload (legacy)
 */
router.post(
  '/upload',
  upload.fields([
    { name: 'sourceFile', maxCount: 1 },
    { name: 'renwangFile', maxCount: 1 },
    { name: 'dailyFile', maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files?.sourceFile?.[0] || !files?.renwangFile?.[0]) {
        res.status(400).json({ error: '请上传"2026数据"和"最新人网"文件' });
        return;
      }

      storedSourceBuffer = files.sourceFile[0].buffer;
      storedRenwangBuffer = files.renwangFile[0].buffer;
      storedDailyBuffer = files.dailyFile?.[0]?.buffer || null;

      // 持久化到S3
      await persistFileToS3(S3_SOURCE_KEY, storedSourceBuffer);
      await persistFileToS3(S3_RENWANG_KEY, storedRenwangBuffer);
      if (storedDailyBuffer) await persistFileToS3(S3_DAILY_KEY, storedDailyBuffer);
      await persistMeta({
        sourceFileName: fixFilename(files.sourceFile[0].originalname),
        renwangFileName: fixFilename(files.renwangFile[0].originalname),
        dailyFileName: files.dailyFile?.[0]?.originalname ? fixFilename(files.dailyFile[0].originalname) : undefined,
      });

      // 自动扫描人员信息并更新组织架构
      try {
        console.log('[Report API] Scanning staff from source data...');
        const scanResult = scanStaffFromSource(storedSourceBuffer);
        console.log(`[Report API] Staff scan result: +${scanResult.added.length} added, ${scanResult.transferred.length} transferred, ${scanResult.unchanged} unchanged`);
      } catch (e) {
        console.error('[Report API] Staff scan error:', e);
      }

      const tplBuffer = await getTemplateBuffer();
      const sourceRaw = parseSourceFile(storedSourceBuffer);
      const { agency: renwangAgency, network: renwangNetwork } = parseRenwangFile(storedRenwangBuffer);
      let dailyRaw: any[] = [];
      if (storedDailyBuffer) {
        dailyRaw = parseDailyFile(storedDailyBuffer);
      }

      const { monthStart, monthEnd } = detectMonthRange(sourceRaw);
      const report = processReport(
        storedSourceBuffer,
        storedRenwangBuffer,
        tplBuffer,
        monthStart,
        monthEnd,
        storedDailyBuffer || undefined
      );

      cachedReport = report;
      cachedMonthStart = monthStart;
      cachedMonthEnd = monthEnd;
      await persistReport(report, monthStart, monthEnd);

      res.json({
        rawData: {
          source: sourceRaw.slice(0, 2000),
          renwang: renwangNetwork.slice(0, 2000),
          daily: dailyRaw.slice(0, 2000),
          sourceTotalCount: sourceRaw.length,
          renwangTotalCount: renwangNetwork.length,
          dailyTotalCount: dailyRaw.length,
        },
        report,
      });
    } catch (error: any) {
      console.error('[Report API] Upload error:', error);
      res.status(500).json({ error: error.message || '文件解析失败' });
    }
  }
);

/**
 * POST /api/report/generate (legacy)
 */
router.post(
  '/generate',
  upload.fields([
    { name: 'sourceFile', maxCount: 1 },
    { name: 'renwangFile', maxCount: 1 },
    { name: 'dailyFile', maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files?.sourceFile?.[0] || !files?.renwangFile?.[0]) {
        res.status(400).json({ error: '请上传"2026数据"和"最新人网"文件' });
        return;
      }

      const sourceBuffer = files.sourceFile[0].buffer;
      const renwangBuffer = files.renwangFile[0].buffer;
      const dailyBuffer = files.dailyFile?.[0]?.buffer;

      const monthStart = parseInt(req.body.monthStart) || 1;
      const monthEnd = parseInt(req.body.monthEnd) || monthStart;

      const tplBuffer = await getTemplateBuffer();
      const result = processReport(
        sourceBuffer,
        renwangBuffer,
        tplBuffer,
        monthStart,
        monthEnd,
        dailyBuffer
      );

      cachedReport = result;
      cachedMonthStart = monthStart;
      cachedMonthEnd = monthEnd;
      await persistReport(result, monthStart, monthEnd);

      res.json(result);
    } catch (error: any) {
      console.error('[Report API] Error:', error);
      res.status(500).json({ error: error.message || '报表生成失败' });
    }
  }
);

/**
 * POST /api/report/regenerate
 */
router.post(
  '/regenerate',
  async (req: Request, res: Response) => {
    try {
      if (!storedSourceBuffer || !storedRenwangBuffer) {
        res.status(400).json({ error: '请先上传2026数据和人网数据文件' });
        return;
      }

      const { monthStart, monthEnd } = req.body;
      if (!monthStart || !monthEnd) {
        res.status(400).json({ error: '请提供月份范围' });
        return;
      }

      const tplBuffer = await getTemplateBuffer();
      const report = processReport(
        storedSourceBuffer,
        storedRenwangBuffer,
        tplBuffer,
        monthStart,
        monthEnd,
        storedDailyBuffer || undefined
      );

      cachedReport = report;
      cachedMonthStart = monthStart;
      cachedMonthEnd = monthEnd;
      await persistReport(report, monthStart, monthEnd);

      res.json({ report });
    } catch (error: any) {
      console.error('[Report API] Regenerate error:', error);
      res.status(500).json({ error: error.message || '报表重新生成失败' });
    }
  }
);

// ===== 清空数据 API =====

router.post('/clear-report', async (_req: Request, res: Response) => {
  try {
    cachedReport = null;
    storedSourceBuffer = null;
    storedRenwangBuffer = null;
    storedDailyBuffer = null;
    cachedMonthStart = 1;
    cachedMonthEnd = 1;
    uploadMeta = {};
    // 用空内容覆盖S3中的文件（S3不支持直接删除）
    await persistJsonToS3(S3_REPORT_CACHE_KEY, {});
    await persistJsonToS3(S3_META_KEY, {});
    // 上传空buffer覆盖文件
    const emptyBuf = Buffer.from('');
    await persistFileToS3(S3_SOURCE_KEY, emptyBuf);
    await persistFileToS3(S3_RENWANG_KEY, emptyBuf);
    await persistFileToS3(S3_DAILY_KEY, emptyBuf);
    console.log('[Clear] 报表数据已清空');
    res.json({ success: true, message: '报表数据已清空' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '清空失败' });
  }
});

router.post('/clear-source', async (_req: Request, res: Response) => {
  try {
    storedSourceBuffer = null;
    await persistFileToS3(S3_SOURCE_KEY, Buffer.from(''));
    console.log('[Clear] 源数据文件已清空');
    res.json({ success: true, message: '2026数据文件已清空' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '清空失败' });
  }
});

router.post('/clear-renwang', async (_req: Request, res: Response) => {
  try {
    storedRenwangBuffer = null;
    await persistFileToS3(S3_RENWANG_KEY, Buffer.from(''));
    console.log('[Clear] 人网数据已清空');
    res.json({ success: true, message: '人网数据已清空' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '清空失败' });
  }
});

router.post('/clear-daily', async (_req: Request, res: Response) => {
  try {
    storedDailyBuffer = null;
    await persistFileToS3(S3_DAILY_KEY, Buffer.from(''));
    console.log('[Clear] 日清单已清空');
    res.json({ success: true, message: '日清单已清空' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '清空失败' });
  }
});

// ── 总表导出 ──
router.get('/export-excel', async (_req: Request, res: Response) => {
  try {
    if (!cachedReport) {
      return res.status(400).json({ error: '暂无报表数据，请先上传数据' });
    }
    const buf = generateExcelBuffer(cachedReport);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="report.xlsx"');
    res.send(buf);
  } catch (error: any) {
    console.error('[Export] Failed to export Excel:', error);
    res.status(500).json({ error: error.message || '导出失败' });
  }
});

// 注册人员变动回调：手动修改staff时自动重新生成报表
onStaffChanged(async () => {
  try {
    const report = await tryAutoGenerate();
    if (report) {
      console.log('[Report API] Report regenerated after staff change');
    }
  } catch (e) {
    console.error('[Report API] Failed to regenerate after staff change:', e);
  }
});

export default router;
