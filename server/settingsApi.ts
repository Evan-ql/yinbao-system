/**
 * 系统设置 API
 * 使用 JSON 文件持久化存储后台配置数据
 */
import { Router, Request, Response } from 'express';
import { storagePut, storageGet } from './storage';

const router = Router();
const S3_SETTINGS_KEY = 'yinbao-data/settings.json';

// ===== 数据结构定义 =====

export interface Staff {
  id: string;
  name: string;
  code: string; // 工号
  role: 'director' | 'deptManager' | 'customerManager'; // 总监/营业部经理/客户经理
  parentId: string; // 上级姓名（总监的parentId为空）
  status: 'active' | 'resigned' | 'transferred'; // 在职/离职/转岗
  month: number; // 生效月份 1-12，0表示全年默认状态
}

export interface DeptTarget {
  id: string;
  deptName: string; // 营业部名称（经理姓名）
  month: number; // 月份（0表示全年）
  qjTarget: number; // 期交目标
  dcTarget: number; // 趸交目标
}

export interface PersonTarget {
  id: string;
  name: string; // 人员姓名
  zhiji: string; // 职级
  weichi: number; // 维持标保
}

export interface DailyTarget {
  id: string;
  deptName: string;
  dailyTarget: number; // 日保费底线目标
}

export interface ProductShort {
  id: string;
  fullName: string; // 产品全名
  shortName: string; // 产品简称
  category: string; // 分类：方案1/方案0.5/普通
}

export interface BankShort {
  id: string;
  fullName: string; // 银行全名
  shortName: string; // 银行简称
  sortOrder: number; // 排序
}

export interface ZhebiaoCof {
  id: string;
  xianzhong: string; // 险种
  nianxian: string; // 年限
  xishu: number; // 折标系数
}

export interface CoreNetwork {
  id: string;
  totalBankName: string;
  networkCode: string;
  agencyName: string;
  customerManager: string;
  deptManager: string;
  areaDirector: string;
  coreNetwork: string;
}

export interface NetworkShort {
  id: string;
  fullName: string; // 网点全名
  shortName: string; // 网点简称
}

export interface DirectorTarget {
  id: string;
  name: string; // 总监姓名
  month: number; // 月份 1-12，0表示全年
  qjTarget: number; // 期交目标
  dcTarget: number; // 趸交目标
}

export interface DeptManagerTarget {
  id: string;
  name: string; // 营业部经理姓名
  director: string; // 所属总监
  month: number; // 月份
  qjTarget: number;
  dcTarget: number;
}

export interface CustomerManagerTarget {
  id: string;
  name: string; // 客户经理姓名
  deptManager: string; // 所属营业部经理
  month: number; // 月份
  qjTarget: number;
  dcTarget: number;
}

export interface NetworkTarget {
  id: string;
  networkName: string; // 网点名称
  bankName: string; // 银行渠道
  deptManager: string; // 营业部经理
  customerManager: string; // 客户经理
  month: number; // 月份 1-12，0表示全年
  qjTarget: number; // 期交目标
  dcTarget: number; // 趸交目标
}

export interface Settings {
  staff: Staff[];
  deptTargets: DeptTarget[];
  directorTargets: DirectorTarget[];
  deptManagerTargets: DeptManagerTarget[];
  customerManagerTargets: CustomerManagerTarget[];
  personTargets: PersonTarget[];
  dailyTargets: DailyTarget[];
  productShorts: ProductShort[];
  bankShorts: BankShort[];
  zhebiaoCofs: ZhebiaoCof[];
  coreNetworks: CoreNetwork[];
  networkShorts: NetworkShort[];
  networkTargets: NetworkTarget[];
}

// ===== 默认数据 =====
function getDefaultSettings(): Settings {
  return {
    staff: [],
    deptTargets: [],
    directorTargets: [],
    deptManagerTargets: [],
    customerManagerTargets: [],
    personTargets: [],
    dailyTargets: [],
    productShorts: [],
    bankShorts: [
      { id: '1', fullName: '中国工商银行', shortName: '工行', sortOrder: 1 },
      { id: '2', fullName: '中国建设银行', shortName: '建行', sortOrder: 2 },
      { id: '3', fullName: '中国农业银行', shortName: '农行', sortOrder: 3 },
      { id: '4', fullName: '中国银行', shortName: '中行', sortOrder: 4 },
      { id: '5', fullName: '中国民生银行', shortName: '民生', sortOrder: 5 },
      { id: '6', fullName: '中信银行', shortName: '中信', sortOrder: 6 },
      { id: '7', fullName: '浦发银行', shortName: '浦发', sortOrder: 7 },
      { id: '8', fullName: '华夏银行', shortName: '华夏', sortOrder: 8 },
      { id: '9', fullName: '中国光大银行', shortName: '光大', sortOrder: 9 },
      { id: '10', fullName: '河北银行', shortName: '河行', sortOrder: 10 },
      { id: '11', fullName: '沧州银行', shortName: '沧州', sortOrder: 11 },
      { id: '12', fullName: '张家口银行', shortName: '张家口', sortOrder: 12 },
      { id: '13', fullName: '交通银行', shortName: '交行', sortOrder: 13 },
      { id: '14', fullName: '中国邮政储蓄银行', shortName: '邮政', sortOrder: 14 },
    ],
    zhebiaoCofs: [],
    coreNetworks: [],
    networkShorts: [],
    networkTargets: [],
  };
}

// ===== S3 存储 =====
let cachedSettings: Settings | null = null;
let settingsLoaded = false;

async function loadSettingsFromS3(): Promise<Settings> {
  try {
    const { url } = await storageGet(S3_SETTINGS_KEY);
    const response = await fetch(url);
    if (!response.ok) return getDefaultSettings();
    const raw = await response.json();
    return { ...getDefaultSettings(), ...raw };
  } catch (e) {
    console.log('[Settings] No S3 settings found, using defaults');
    return getDefaultSettings();
  }
}

async function saveSettingsToS3(settings: Settings) {
  try {
    const json = JSON.stringify(settings, null, 2);
    await storagePut(S3_SETTINGS_KEY, json, 'application/json');
    console.log('[Settings] Saved to S3');
  } catch (e) {
    console.error('[Settings] Failed to save to S3:', e);
  }
}

function getSettings(): Settings {
  if (!cachedSettings) {
    cachedSettings = getDefaultSettings();
  }
  return cachedSettings;
}

async function ensureSettingsLoaded() {
  if (!settingsLoaded) {
    cachedSettings = await loadSettingsFromS3();
    settingsLoaded = true;
  }
}

function updateSettings(updater: (s: Settings) => void) {
  const s = getSettings();
  updater(s);
  cachedSettings = s;
  // 异步保存到S3，不阻塞响应
  saveSettingsToS3(s).catch(e => console.error('[Settings] Async save error:', e));
}

// 启动时异步加载
const settingsLoadPromise = ensureSettingsLoaded().catch(e => {
  console.error('[Settings] Initial load failed:', e);
});

// ===== 通用 ID 生成 =====
let idCounter = Date.now();
function genId(): string {
  return String(++idCounter);
}

// ===== API 路由 =====

// 获取所有设置
router.get('/', async (_req: Request, res: Response) => {
  await settingsLoadPromise;
  res.json(getSettings());
});

// ===== 组织架构 =====
router.get('/staff', (_req: Request, res: Response) => {
  res.json(getSettings().staff);
});

router.post('/staff', (req: Request, res: Response) => {
  const item: Staff = { ...req.body, id: genId() };
  updateSettings(s => s.staff.push(item));
  notifyStaffChanged();
  res.json(item);
});

router.put('/staff/:id', (req: Request, res: Response) => {
  updateSettings(s => {
    const idx = s.staff.findIndex(i => i.id === req.params.id);
    if (idx >= 0) {
      const oldRole = s.staff[idx].role;
      const oldName = s.staff[idx].name;
      s.staff[idx] = { ...s.staff[idx], ...req.body, id: req.params.id };
      const newRole = s.staff[idx].role;
      // 当角色从营业部经理变为客户经理时，自动移除对应的 deptTargets
      if (oldRole === 'deptManager' && newRole === 'customerManager') {
        const beforeCount = s.deptTargets.length;
        s.deptTargets = s.deptTargets.filter(t => t.deptName !== oldName);
        console.log(`[Settings] Role changed: ${oldName} deptManager -> customerManager, removed ${beforeCount - s.deptTargets.length} deptTarget(s)`);
      }
    }
  });
  notifyStaffChanged();
  res.json({ ok: true });
});

router.delete('/staff/:id', (req: Request, res: Response) => {
  updateSettings(s => {
    s.staff = s.staff.filter(i => i.id !== req.params.id);
  });
  notifyStaffChanged();
  res.json({ ok: true });
});

// 调岗操作：在原营业部标记“调出”，在新营业部新增“在职”记录
router.post('/staff/transfer', (req: Request, res: Response) => {
  const { staffId, newParentId, month } = req.body;
  if (!staffId || !newParentId || !month) {
    return res.status(400).json({ error: '缺少必要参数: staffId, newParentId, month' });
  }
  let newItem: Staff | null = null;
  updateSettings(s => {
    // 找到原始记录
    const original = s.staff.find(i => i.id === staffId);
    if (!original) return;
    // 在原营业部添加一条“调出”记录（当月生效）
    const transferOutId = genId();
    s.staff.push({
      id: transferOutId,
      name: original.name,
      code: original.code,
      role: original.role,
      parentId: original.parentId,
      status: 'transferred',
      month: month,
    });
    // 在新营业部添加一条“在职”记录（当月生效）
    newItem = {
      id: genId(),
      name: original.name,
      code: original.code,
      role: original.role,
      parentId: newParentId,
      status: 'active',
      month: month,
    };
    s.staff.push(newItem);
  });
  notifyStaffChanged();
  res.json({ ok: true, newItem });
});

// 获取某月份的有效人员列表（合并默认状态和月度覆盖）
router.get('/staff/effective/:month', (req: Request, res: Response) => {
  const month = parseInt(req.params.month);
  if (isNaN(month) || month < 1 || month > 12) {
    return res.status(400).json({ error: '无效月份' });
  }
  const allStaff = getSettings().staff;
  const effective = getEffectiveStaff(allStaff, month);
  res.json(effective);
});

// ===== 营业部目标 =====
router.get('/dept-targets', (_req: Request, res: Response) => {
  res.json(getSettings().deptTargets);
});

router.post('/dept-targets', (req: Request, res: Response) => {
  const item: DeptTarget = { ...req.body, id: genId() };
  updateSettings(s => s.deptTargets.push(item));
  res.json(item);
});

router.put('/dept-targets/:id', (req: Request, res: Response) => {
  updateSettings(s => {
    const idx = s.deptTargets.findIndex(i => i.id === req.params.id);
    if (idx >= 0) s.deptTargets[idx] = { ...s.deptTargets[idx], ...req.body, id: req.params.id };
  });
  res.json({ ok: true });
});

router.delete('/dept-targets/:id', (req: Request, res: Response) => {
  updateSettings(s => {
    s.deptTargets = s.deptTargets.filter(i => i.id !== req.params.id);
  });
  res.json({ ok: true });
});

// ===== 个人职级与维持标保 =====
router.get('/person-targets', (_req: Request, res: Response) => {
  res.json(getSettings().personTargets);
});

router.post('/person-targets', (req: Request, res: Response) => {
  const item: PersonTarget = { ...req.body, id: genId() };
  updateSettings(s => s.personTargets.push(item));
  res.json(item);
});

router.put('/person-targets/:id', (req: Request, res: Response) => {
  updateSettings(s => {
    const idx = s.personTargets.findIndex(i => i.id === req.params.id);
    if (idx >= 0) s.personTargets[idx] = { ...s.personTargets[idx], ...req.body, id: req.params.id };
  });
  res.json({ ok: true });
});

router.delete('/person-targets/:id', (req: Request, res: Response) => {
  updateSettings(s => {
    s.personTargets = s.personTargets.filter(i => i.id !== req.params.id);
  });
  res.json({ ok: true });
});

// ===== 日保费目标 =====
router.get('/daily-targets', (_req: Request, res: Response) => {
  res.json(getSettings().dailyTargets);
});

router.post('/daily-targets', (req: Request, res: Response) => {
  const item: DailyTarget = { ...req.body, id: genId() };
  updateSettings(s => s.dailyTargets.push(item));
  res.json(item);
});

router.put('/daily-targets/:id', (req: Request, res: Response) => {
  updateSettings(s => {
    const idx = s.dailyTargets.findIndex(i => i.id === req.params.id);
    if (idx >= 0) s.dailyTargets[idx] = { ...s.dailyTargets[idx], ...req.body, id: req.params.id };
  });
  res.json({ ok: true });
});

router.delete('/daily-targets/:id', (req: Request, res: Response) => {
  updateSettings(s => {
    s.dailyTargets = s.dailyTargets.filter(i => i.id !== req.params.id);
  });
  res.json({ ok: true });
});

// ===== 产品简称 =====
router.get('/product-shorts', (_req: Request, res: Response) => {
  res.json(getSettings().productShorts);
});

router.post('/product-shorts', (req: Request, res: Response) => {
  const item: ProductShort = { ...req.body, id: genId() };
  updateSettings(s => s.productShorts.push(item));
  res.json(item);
});

router.put('/product-shorts/:id', (req: Request, res: Response) => {
  updateSettings(s => {
    const idx = s.productShorts.findIndex(i => i.id === req.params.id);
    if (idx >= 0) s.productShorts[idx] = { ...s.productShorts[idx], ...req.body, id: req.params.id };
  });
  res.json({ ok: true });
});

router.delete('/product-shorts/:id', (req: Request, res: Response) => {
  updateSettings(s => {
    s.productShorts = s.productShorts.filter(i => i.id !== req.params.id);
  });
  res.json({ ok: true });
});

// ===== 银行简称 =====
router.get('/bank-shorts', (_req: Request, res: Response) => {
  res.json(getSettings().bankShorts);
});

router.post('/bank-shorts', (req: Request, res: Response) => {
  const item: BankShort = { ...req.body, id: genId() };
  updateSettings(s => s.bankShorts.push(item));
  res.json(item);
});

router.put('/bank-shorts/:id', (req: Request, res: Response) => {
  updateSettings(s => {
    const idx = s.bankShorts.findIndex(i => i.id === req.params.id);
    if (idx >= 0) s.bankShorts[idx] = { ...s.bankShorts[idx], ...req.body, id: req.params.id };
  });
  res.json({ ok: true });
});

router.delete('/bank-shorts/:id', (req: Request, res: Response) => {
  updateSettings(s => {
    s.bankShorts = s.bankShorts.filter(i => i.id !== req.params.id);
  });
  res.json({ ok: true });
});

// ===== 折标系数 =====
router.get('/zhebiao-cofs', (_req: Request, res: Response) => {
  res.json(getSettings().zhebiaoCofs);
});

router.post('/zhebiao-cofs', (req: Request, res: Response) => {
  const item: ZhebiaoCof = { ...req.body, id: genId() };
  updateSettings(s => s.zhebiaoCofs.push(item));
  res.json(item);
});

router.put('/zhebiao-cofs/:id', (req: Request, res: Response) => {
  updateSettings(s => {
    const idx = s.zhebiaoCofs.findIndex(i => i.id === req.params.id);
    if (idx >= 0) s.zhebiaoCofs[idx] = { ...s.zhebiaoCofs[idx], ...req.body, id: req.params.id };
  });
  res.json({ ok: true });
});

router.delete('/zhebiao-cofs/:id', (req: Request, res: Response) => {
  updateSettings(s => {
    s.zhebiaoCofs = s.zhebiaoCofs.filter(i => i.id !== req.params.id);
  });
  res.json({ ok: true });
});

// ===== 核心网点 =====
router.get('/core-networks', (_req: Request, res: Response) => {
  res.json(getSettings().coreNetworks);
});

router.post('/core-networks', (req: Request, res: Response) => {
  const item: CoreNetwork = { ...req.body, id: genId() };
  updateSettings(s => s.coreNetworks.push(item));
  res.json(item);
});

router.put('/core-networks/:id', (req: Request, res: Response) => {
  updateSettings(s => {
    const idx = s.coreNetworks.findIndex(i => i.id === req.params.id);
    if (idx >= 0) s.coreNetworks[idx] = { ...s.coreNetworks[idx], ...req.body, id: req.params.id };
  });
  res.json({ ok: true });
});

router.delete('/core-networks/:id', (req: Request, res: Response) => {
  updateSettings(s => {
    s.coreNetworks = s.coreNetworks.filter(i => i.id !== req.params.id);
  });
  res.json({ ok: true });
});

// ===== 网点简称 =====
router.get('/network-shorts', (_req: Request, res: Response) => {
  res.json(getSettings().networkShorts);
});

router.post('/network-shorts', (req: Request, res: Response) => {
  const item: NetworkShort = { ...req.body, id: genId() };
  updateSettings(s => s.networkShorts.push(item));
  res.json(item);
});

router.put('/network-shorts/:id', (req: Request, res: Response) => {
  updateSettings(s => {
    const idx = s.networkShorts.findIndex(i => i.id === req.params.id);
    if (idx >= 0) s.networkShorts[idx] = { ...s.networkShorts[idx], ...req.body, id: req.params.id };
  });
  res.json({ ok: true });
});

router.delete('/network-shorts/:id', (req: Request, res: Response) => {
  updateSettings(s => {
    s.networkShorts = s.networkShorts.filter(i => i.id !== req.params.id);
  });
  res.json({ ok: true });
});

// ===== 网点目标 =====
router.get('/network-targets', (_req: Request, res: Response) => {
  res.json(getSettings().networkTargets);
});

router.post('/network-targets', (req: Request, res: Response) => {
  const item: NetworkTarget = { ...req.body, id: genId() };
  updateSettings(s => s.networkTargets.push(item));
  res.json(item);
});

router.put('/network-targets/:id', (req: Request, res: Response) => {
  updateSettings(s => {
    const idx = s.networkTargets.findIndex(i => i.id === req.params.id);
    if (idx >= 0) s.networkTargets[idx] = { ...s.networkTargets[idx], ...req.body, id: req.params.id };
  });
  res.json({ ok: true });
});

router.delete('/network-targets/:id', (req: Request, res: Response) => {
  updateSettings(s => {
    s.networkTargets = s.networkTargets.filter(i => i.id !== req.params.id);
  });
  res.json({ ok: true });
});

// ===== 总监目标 =====
router.get('/director-targets', (_req: Request, res: Response) => {
  res.json(getSettings().directorTargets);
});

router.post('/director-targets', (req: Request, res: Response) => {
  const item: DirectorTarget = { ...req.body, id: genId() };
  updateSettings(s => s.directorTargets.push(item));
  res.json(item);
});

router.put('/director-targets/:id', (req: Request, res: Response) => {
  updateSettings(s => {
    const idx = s.directorTargets.findIndex(i => i.id === req.params.id);
    if (idx >= 0) s.directorTargets[idx] = { ...s.directorTargets[idx], ...req.body, id: req.params.id };
  });
  res.json({ ok: true });
});

router.delete('/director-targets/:id', (req: Request, res: Response) => {
  updateSettings(s => {
    s.directorTargets = s.directorTargets.filter(i => i.id !== req.params.id);
  });
  res.json({ ok: true });
});

// ===== 营业部经理目标 =====
router.get('/dept-manager-targets', (_req: Request, res: Response) => {
  res.json(getSettings().deptManagerTargets);
});

router.post('/dept-manager-targets', (req: Request, res: Response) => {
  const item: DeptManagerTarget = { ...req.body, id: genId() };
  updateSettings(s => s.deptManagerTargets.push(item));
  res.json(item);
});

router.put('/dept-manager-targets/:id', (req: Request, res: Response) => {
  updateSettings(s => {
    const idx = s.deptManagerTargets.findIndex(i => i.id === req.params.id);
    if (idx >= 0) s.deptManagerTargets[idx] = { ...s.deptManagerTargets[idx], ...req.body, id: req.params.id };
  });
  res.json({ ok: true });
});

router.delete('/dept-manager-targets/:id', (req: Request, res: Response) => {
  updateSettings(s => {
    s.deptManagerTargets = s.deptManagerTargets.filter(i => i.id !== req.params.id);
  });
  res.json({ ok: true });
});

// ===== 客户经理目标 =====
router.get('/customer-manager-targets', (_req: Request, res: Response) => {
  res.json(getSettings().customerManagerTargets);
});

router.post('/customer-manager-targets', (req: Request, res: Response) => {
  const item: CustomerManagerTarget = { ...req.body, id: genId() };
  updateSettings(s => s.customerManagerTargets.push(item));
  res.json(item);
});

router.put('/customer-manager-targets/:id', (req: Request, res: Response) => {
  updateSettings(s => {
    const idx = s.customerManagerTargets.findIndex(i => i.id === req.params.id);
    if (idx >= 0) s.customerManagerTargets[idx] = { ...s.customerManagerTargets[idx], ...req.body, id: req.params.id };
  });
  res.json({ ok: true });
});

router.delete('/customer-manager-targets/:id', (req: Request, res: Response) => {
  updateSettings(s => {
    s.customerManagerTargets = s.customerManagerTargets.filter(i => i.id !== req.params.id);
  });
  res.json({ ok: true });
});

// ===== 批量导入（从模板Excel初始化） =====
router.post('/import-from-template', (req: Request, res: Response) => {
  try {
    const data = req.body;
    updateSettings(s => {
      if (data.staff?.length) s.staff = data.staff.map((i: any) => ({ ...i, id: genId() }));
      if (data.deptTargets?.length) s.deptTargets = data.deptTargets.map((i: any) => ({ ...i, id: genId() }));
      if (data.directorTargets?.length) s.directorTargets = data.directorTargets.map((i: any) => ({ ...i, id: genId() }));
      if (data.deptManagerTargets?.length) s.deptManagerTargets = data.deptManagerTargets.map((i: any) => ({ ...i, id: genId() }));
      if (data.customerManagerTargets?.length) s.customerManagerTargets = data.customerManagerTargets.map((i: any) => ({ ...i, id: genId() }));
      if (data.personTargets?.length) s.personTargets = data.personTargets.map((i: any) => ({ ...i, id: genId() }));
      if (data.dailyTargets?.length) s.dailyTargets = data.dailyTargets.map((i: any) => ({ ...i, id: genId() }));
      if (data.productShorts?.length) s.productShorts = data.productShorts.map((i: any) => ({ ...i, id: genId() }));
      if (data.bankShorts?.length) s.bankShorts = data.bankShorts.map((i: any) => ({ ...i, id: genId() }));
      if (data.zhebiaoCofs?.length) s.zhebiaoCofs = data.zhebiaoCofs.map((i: any) => ({ ...i, id: genId() }));
      if (data.coreNetworks?.length) s.coreNetworks = data.coreNetworks.map((i: any) => ({ ...i, id: genId() }));
      if (data.networkShorts?.length) s.networkShorts = data.networkShorts.map((i: any) => ({ ...i, id: genId() }));
      if (data.networkTargets?.length) s.networkTargets = data.networkTargets.map((i: any) => ({ ...i, id: genId() }));
    });
    res.json({ ok: true, message: '导入成功' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '导入失败' });
  }
});

// ===== 清空数据 API =====

/** 清空全部业绩目标 */
router.post('/clear-targets', (_req: Request, res: Response) => {
  try {
    updateSettings(s => {
      s.deptTargets = [];
      s.directorTargets = [];
      s.deptManagerTargets = [];
      s.customerManagerTargets = [];
      s.networkTargets = [];
      s.personTargets = [];
      s.dailyTargets = [];
    });
    console.log('[Clear] 全部业绩目标已清空');
    res.json({ success: true, message: '全部业绩目标已清空' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '清空失败' });
  }
});

/** 清空组织架构 */
router.post('/clear-org', (_req: Request, res: Response) => {
  try {
    updateSettings(s => {
      s.staff = [];
    });
    console.log('[Clear] 组织架构已清空');
    res.json({ success: true, message: '组织架构已清空' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '清空失败' });
  }
});

/** 清空产品简称 */
router.post('/clear-products', (_req: Request, res: Response) => {
  try {
    updateSettings(s => {
      s.productShorts = [];
    });
    console.log('[Clear] 产品简称已清空');
    res.json({ success: true, message: '产品简称已清空' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '清空失败' });
  }
});

/** 清空银行渠道 */
router.post('/clear-banks', (_req: Request, res: Response) => {
  try {
    updateSettings(s => {
      s.bankShorts = [];
    });
    console.log('[Clear] 银行渠道已清空');
    res.json({ success: true, message: '银行渠道已清空' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '清空失败' });
  }
});

/** 清空折标系数 */
router.post('/clear-zhebiao', (_req: Request, res: Response) => {
  try {
    updateSettings(s => {
      s.zhebiaoCofs = [];
    });
    console.log('[Clear] 折标系数已清空');
    res.json({ success: true, message: '折标系数已清空' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '清空失败' });
  }
});

/** 清空核心网点 */
router.post('/clear-core-networks', (_req: Request, res: Response) => {
  try {
    updateSettings(s => {
      s.coreNetworks = [];
    });
    console.log('[Clear] 核心网点已清空');
    res.json({ success: true, message: '核心网点已清空' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '清空失败' });
  }
});

/** 清空网点简称 */
router.post('/clear-network-shorts', (_req: Request, res: Response) => {
  try {
    updateSettings(s => {
      s.networkShorts = [];
    });
    console.log('[Clear] 网点简称已清空');
    res.json({ success: true, message: '网点简称已清空' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '清空失败' });
  }
});

/**
 * 获取某月份的有效人员列表
 * 逻辑：先取month=0的默认记录，再用当月的记录覆盖
 * 覆盖规则：同一人（按工号+上级姓名唯一标识）的月度记录优先于默认记录
 */
export function getEffectiveStaff(allStaff: Staff[], month: number): Staff[] {
  // 收集所有小于等于目标月份的记录，按人员分组
  // key = 工号（如果有）或姓名
  const personRecords = new Map<string, Staff[]>();
  
  for (const s of allStaff) {
    const key = s.code || s.name;
    if (!personRecords.has(key)) personRecords.set(key, []);
    personRecords.get(key)!.push(s);
  }
  
  const result: Staff[] = [];
  
  for (const [key, records] of personRecords.entries()) {
    // 找到该人员在目标月份的所有有效记录
    // 优先级：当月记录 > 之前最近月份的记录 > 默认记录(month=0)
    
    // 按parentId分组（因为同一人可能在不同营业部有不同记录）
    const byParent = new Map<string, Staff[]>();
    for (const r of records) {
      const pKey = r.parentId || '__root__';
      if (!byParent.has(pKey)) byParent.set(pKey, []);
      byParent.get(pKey)!.push(r);
    }
    
    // 对每个上级分组，找到当月有效的记录
    for (const [parentKey, parentRecords] of byParent.entries()) {
      // 筛选出月份 <= 目标月份的记录，按月份降序排列
      const validRecords = parentRecords
        .filter(r => r.month === 0 || r.month <= month)
        .sort((a, b) => b.month - a.month);
      
      if (validRecords.length > 0) {
        const effective = validRecords[0]; // 取月份最大的（最新的）
        // 只返回在职的人员
        if (effective.status === 'active') {
          result.push(effective);
        }
      }
    }
  }
  
  return result;
}

// ===== 人员变动回调 =====
// 当staff被手动修改时，通知报表系统重新生成
let onStaffChangedCallback: (() => void) | null = null;

export function onStaffChanged(callback: () => void) {
  onStaffChangedCallback = callback;
}

function notifyStaffChanged() {
  if (onStaffChangedCallback) {
    console.log('[Settings] Staff changed, triggering report regeneration...');
    // 延迟执行，确保settings已保存
    setTimeout(() => {
      onStaffChangedCallback?.();
    }, 500);
  }
}

// 导出 getSettings 供报表生成使用
export { getSettings as getSettingsData, updateSettings };

export default router;
