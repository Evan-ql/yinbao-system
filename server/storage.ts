/**
 * 本地文件存储实现
 * 替换原有的 Manus Forge API 代理存储，将所有数据保存到本地磁盘的 data/ 目录下。
 * 对外接口保持不变：storagePut / storageGet，确保 reportApi.ts、settingsApi.ts 等调用方无需修改。
 *
 * storageGet 返回的 url 指向本服务器自身的 /api/local-storage/:key 路由，
 * 调用方可以直接 fetch(url) 获取文件内容，行为与原 S3 下载链接一致。
 */

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

// ===== 配置 =====

/** 本地存储根目录（项目根目录下的 data/ 文件夹） */
const DATA_DIR = path.resolve(process.cwd(), 'data');

/**
 * 服务器监听端口，用于拼接下载 URL。
 * 读取环境变量 PORT，默认 3000。
 */
function getBaseUrl(): string {
  const port = process.env.PORT || '3000';
  return `http://localhost:${port}`;
}

// ===== 工具函数 =====

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, '');
}

/**
 * 确保目标文件所在目录存在
 */
async function ensureDir(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fsp.mkdir(dir, { recursive: true });
}

// ===== 对外接口 =====

/**
 * 将数据写入本地文件系统
 *
 * @param relKey   相对路径键，例如 "yinbao-data/uploads/source.xlsx"
 * @param data     文件内容（Buffer / Uint8Array / string）
 * @param _contentType  保留参数，本地存储不使用，但保持签名兼容
 * @returns        { key, url } — url 可被 fetch() 直接访问
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  _contentType = 'application/octet-stream',
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const fullPath = path.join(DATA_DIR, key);

  await ensureDir(fullPath);

  if (typeof data === 'string') {
    await fsp.writeFile(fullPath, data, 'utf-8');
  } else {
    await fsp.writeFile(fullPath, data);
  }

  const url = `${getBaseUrl()}/api/local-storage/${key}`;
  console.log(`[LocalStorage] Saved: ${key} → ${fullPath}`);
  return { key, url };
}

/**
 * 获取本地文件的可访问 URL
 *
 * @param relKey  相对路径键
 * @returns       { key, url } — url 可被 fetch() 直接访问；若文件不存在也返回 url，由调用方处理 404
 */
export async function storageGet(
  relKey: string,
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const url = `${getBaseUrl()}/api/local-storage/${key}`;
  return { key, url };
}
