/**
 * 通用 Excel 导出工具（前端）
 * 使用 xlsx 库生成带样式的 Excel 文件并下载
 * v1.1.0
 */
import * as XLSX from "xlsx";

/** 列定义 */
export interface ExportColumn {
  header: string;       // 表头名称
  key: string;          // 数据字段名
  width?: number;       // 列宽（字符数）
  type?: "string" | "number" | "percent"; // 数据类型
}

/** 导出配置（对象形式） */
export interface ExportOptions {
  fileName?: string;
  filename?: string;
  sheetName?: string;
  title?: string;
  columns: ExportColumn[];
  data?: Record<string, any>[];
  dataSource?: Record<string, any>[];
  totalRow?: Record<string, any>;
  totalLabel?: string;
  footer?: Record<string, any>;
  sheets?: ExportSheet[];
}

export interface ExportSheet {
  sheetName: string;
  title?: string;
  columns: ExportColumn[];
  data?: Record<string, any>[];
  dataSource?: Record<string, any>[];
  totalRow?: Record<string, any>;
  totalLabel?: string;
}

/**
 * 构建一个 worksheet
 */
function buildSheet(
  columns: ExportColumn[],
  data: Record<string, any>[],
  title?: string,
  totalRow?: Record<string, any>,
  totalLabel?: string,
): XLSX.WorkSheet {
  const wsData: any[][] = [];

  // 标题行
  if (title) {
    wsData.push([title]);
  }

  // 表头行
  wsData.push(columns.map((c) => c.header));

  // 数据行
  for (const row of data) {
    const rowData: any[] = [];
    for (const col of columns) {
      let val = row[col.key];
      if (col.type === "number" && val !== undefined && val !== null) {
        val = Number(val) || 0;
      }
      rowData.push(val ?? "");
    }
    wsData.push(rowData);
  }

  // 合计行
  if (totalRow) {
    const totalData: any[] = [];
    for (let i = 0; i < columns.length; i++) {
      if (i === 0) {
        totalData.push(totalLabel || "合计");
      } else {
        const col = columns[i];
        let val = totalRow[col.key];
        if (col.type === "number" && val !== undefined && val !== null) {
          val = Number(val) || 0;
        }
        totalData.push(val ?? "");
      }
    }
    wsData.push(totalData);
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // 设置列宽
  ws["!cols"] = columns.map((c) => ({
    wch: c.width || Math.max(c.header.length * 2 + 2, 10),
  }));

  // 如果有标题行，合并标题单元格
  if (title) {
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } },
    ];
  }

  return ws;
}

/**
 * 导出 Excel 文件
 * 支持多种调用方式：
 * 1. exportToExcel(columns, data, fileName)
 * 2. exportToExcel(data, columns, fileName)
 * 3. exportToExcel({ columns, data, fileName, ... })
 */
export function exportToExcel(
  arg1: ExportColumn[] | Record<string, any>[] | ExportOptions,
  arg2?: Record<string, any>[] | ExportColumn[] | string,
  arg3?: string,
): void {
  let columns: ExportColumn[];
  let data: Record<string, any>[];
  let fileName: string;
  let title: string | undefined;
  let totalRow: Record<string, any> | undefined;
  let totalLabel: string | undefined;
  let sheets: ExportSheet[] | undefined;

  // 判断调用方式
  if (arg1 && !Array.isArray(arg1) && typeof arg1 === "object" && "columns" in arg1) {
    // 对象形式: exportToExcel({ columns, data, fileName, ... })
    const opts = arg1 as ExportOptions;
    columns = opts.columns;
    data = opts.data || opts.dataSource || [];
    fileName = opts.fileName || opts.filename || "导出数据";
    title = opts.title;
    totalRow = opts.totalRow || opts.footer;
    totalLabel = opts.totalLabel;
    sheets = opts.sheets;
  } else if (Array.isArray(arg1) && Array.isArray(arg2)) {
    // 两个数组 + 文件名
    // 判断哪个是 columns：columns 数组的元素有 header 属性
    const first = arg1 as any[];
    const second = arg2 as any[];
    if (first.length > 0 && first[0].header) {
      // exportToExcel(columns, data, fileName)
      columns = first as ExportColumn[];
      data = second as Record<string, any>[];
    } else if (second.length > 0 && second[0].header) {
      // exportToExcel(data, columns, fileName)
      columns = second as ExportColumn[];
      data = first as Record<string, any>[];
    } else {
      // 默认第一个是 columns
      columns = first as ExportColumn[];
      data = second as Record<string, any>[];
    }
    fileName = (arg3 as string) || "导出数据";
  } else {
    console.error("exportToExcel: 无法识别的参数格式");
    return;
  }

  const wb = XLSX.utils.book_new();

  if (sheets && sheets.length > 0) {
    // 多 sheet 模式
    for (const sheet of sheets) {
      const sheetData = sheet.data || sheet.dataSource || [];
      const ws = buildSheet(
        sheet.columns,
        sheetData,
        sheet.title,
        sheet.totalRow,
        sheet.totalLabel,
      );
      XLSX.utils.book_append_sheet(wb, ws, sheet.sheetName);
    }
  } else {
    // 单 sheet 模式
    const ws = buildSheet(columns!, data!, title, totalRow, totalLabel);
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  }

  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

/**
 * 多Sheet导出（保留向后兼容）
 */
export function exportMultiSheetExcel(
  fileName: string,
  sheetList: ExportSheet[],
): void {
  exportToExcel({
    fileName,
    columns: [],
    sheets: sheetList,
  });
}
