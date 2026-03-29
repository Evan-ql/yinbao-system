/**
 * 通用 Excel 导出工具（前端）
 * 使用 xlsx-js-style 库生成带样式的 Excel 文件并下载
 * v1.2.0 — 新增 mergeKeys 支持（按指定列合并相同值的连续单元格）
 */
import XLSX from "xlsx-js-style";

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
  /** 需要合并相同连续值的列 key 列表 */
  mergeKeys?: string[];
}

export interface ExportSheet {
  sheetName: string;
  title?: string;
  columns: ExportColumn[];
  data?: Record<string, any>[];
  dataSource?: Record<string, any>[];
  totalRow?: Record<string, any>;
  totalLabel?: string;
  /** 需要合并相同连续值的列 key 列表 */
  mergeKeys?: string[];
}

/* ────────── 样式定义 ────────── */

/** 标题行样式：紫蓝背景 + 白色粗体 + 居中 */
const titleStyle: XLSX.CellStyle = {
  font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
  fill: { fgColor: { rgb: "6366F1" } },
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: "999999" } },
    bottom: { style: "thin", color: { rgb: "999999" } },
    left: { style: "thin", color: { rgb: "999999" } },
    right: { style: "thin", color: { rgb: "999999" } },
  },
};

/** 表头行样式：紫蓝背景 + 白色粗体 + 居中 */
const headerStyle: XLSX.CellStyle = {
  font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
  fill: { fgColor: { rgb: "6366F1" } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: {
    top: { style: "thin", color: { rgb: "AAAAAA" } },
    bottom: { style: "thin", color: { rgb: "AAAAAA" } },
    left: { style: "thin", color: { rgb: "AAAAAA" } },
    right: { style: "thin", color: { rgb: "AAAAAA" } },
  },
};

/** 数据行样式（偶数行）：白色背景 */
const dataStyleEven: XLSX.CellStyle = {
  font: { sz: 10 },
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: "CCCCCC" } },
    bottom: { style: "thin", color: { rgb: "CCCCCC" } },
    left: { style: "thin", color: { rgb: "CCCCCC" } },
    right: { style: "thin", color: { rgb: "CCCCCC" } },
  },
};

/** 数据行样式（奇数行）：浅紫背景（斑马纹） */
const dataStyleOdd: XLSX.CellStyle = {
  font: { sz: 10 },
  fill: { fgColor: { rgb: "E8E8FD" } },
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: "CCCCCC" } },
    bottom: { style: "thin", color: { rgb: "CCCCCC" } },
    left: { style: "thin", color: { rgb: "CCCCCC" } },
    right: { style: "thin", color: { rgb: "CCCCCC" } },
  },
};

/** 合计行样式：浅橙背景 + 粗体 */
const totalStyle: XLSX.CellStyle = {
  font: { bold: true, sz: 11, color: { rgb: "000000" } },
  fill: { fgColor: { rgb: "FCE4D6" } },
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top: { style: "medium", color: { rgb: "999999" } },
    bottom: { style: "medium", color: { rgb: "999999" } },
    left: { style: "thin", color: { rgb: "999999" } },
    right: { style: "thin", color: { rgb: "999999" } },
  },
};

/** 数字格式化样式（继承基础样式后覆盖 numFmt） */
function withNumberFmt(base: XLSX.CellStyle, type?: string): XLSX.CellStyle {
  if (type === "percent") {
    return { ...base, numFmt: "0.00%" };
  }
  if (type === "number") {
    return { ...base, numFmt: "#,##0.00" };
  }
  return base;
}

/**
 * 构建一个 worksheet（带完整样式）
 * @param mergeKeys - 需要合并相同连续值的列 key 列表
 */
function buildSheet(
  columns: ExportColumn[],
  data: Record<string, any>[],
  title?: string,
  totalRow?: Record<string, any>,
  totalLabel?: string,
  mergeKeys?: string[],
): XLSX.WorkSheet {
  const wsData: any[][] = [];
  let rowIdx = 0;

  // 标题行
  if (title) {
    const titleRow = [title, ...Array(columns.length - 1).fill("")];
    wsData.push(titleRow);
    rowIdx++;
  }

  // 表头行
  wsData.push(columns.map((c) => c.header));
  const headerRowIdx = rowIdx;
  rowIdx++;

  // 数据行
  const dataStartRow = rowIdx;
  for (const row of data) {
    const rowData: any[] = [];
    for (const col of columns) {
      let val = row[col.key];
      if (col.type === "number" && val !== undefined && val !== null && val !== "") {
        val = Number(val) || 0;
      }
      if (col.type === "percent" && val !== undefined && val !== null && val !== "") {
        // 百分比：如果值已经是如 "85.5%" 这样的字符串，转为小数
        if (typeof val === "string" && val.endsWith("%")) {
          val = parseFloat(val) / 100;
        } else {
          val = Number(val) || 0;
          // 如果值大于1，认为是百分比数值（如 85.5），转为小数
          if (val > 1) val = val / 100;
        }
      }
      rowData.push(val ?? "");
    }
    wsData.push(rowData);
    rowIdx++;
  }

  // 合计行
  let totalRowIdx = -1;
  if (totalRow) {
    const totalData: any[] = [];
    for (let i = 0; i < columns.length; i++) {
      if (i === 0) {
        totalData.push(totalLabel || "合计");
      } else {
        const col = columns[i];
        let val = totalRow[col.key];
        if (col.type === "number" && val !== undefined && val !== null && val !== "") {
          val = Number(val) || 0;
        }
        totalData.push(val ?? "");
      }
    }
    wsData.push(totalData);
    totalRowIdx = rowIdx;
    rowIdx++;
  }

  // 创建 worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // ────────── 合并单元格 ──────────
  const merges: XLSX.Range[] = [];

  // 标题行合并
  if (title) {
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } });
  }

  // mergeKeys: 按指定列合并相同连续值的单元格
  if (mergeKeys && mergeKeys.length > 0 && data.length > 0) {
    for (const mergeKey of mergeKeys) {
      const colIdx = columns.findIndex((c) => c.key === mergeKey);
      if (colIdx < 0) continue;

      let startR = dataStartRow;
      let currentVal = data[0]?.[mergeKey] ?? "";

      for (let i = 1; i <= data.length; i++) {
        const val = i < data.length ? (data[i]?.[mergeKey] ?? "") : "__END__";
        if (val !== currentVal) {
          const endR = dataStartRow + i - 1;
          if (endR > startR) {
            merges.push({
              s: { r: startR, c: colIdx },
              e: { r: endR, c: colIdx },
            });
          }
          startR = dataStartRow + i;
          currentVal = val;
        }
      }
    }
  }

  ws["!merges"] = merges;

  // ────────── 应用样式 ──────────

  // 标题行样式
  if (title) {
    for (let c = 0; c < columns.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c });
      if (ws[addr]) ws[addr].s = titleStyle;
    }
  }

  // 表头行样式
  for (let c = 0; c < columns.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: headerRowIdx, c });
    if (ws[addr]) ws[addr].s = headerStyle;
  }

  // 数据行样式（斑马纹）
  for (let r = dataStartRow; r < dataStartRow + data.length; r++) {
    const isOdd = (r - dataStartRow) % 2 === 1;
    const baseStyle = isOdd ? dataStyleOdd : dataStyleEven;
    for (let c = 0; c < columns.length; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (ws[addr]) {
        ws[addr].s = withNumberFmt(baseStyle, columns[c].type);
      }
    }
  }

  // 合计行样式
  if (totalRowIdx >= 0) {
    for (let c = 0; c < columns.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: totalRowIdx, c });
      if (ws[addr]) ws[addr].s = totalStyle;
    }
  }

  // 设置列宽（根据表头长度和数据自适应）
  ws["!cols"] = columns.map((col) => {
    const headerLen = col.header.length * 2 + 2;
    const defaultWidth = col.width || Math.max(headerLen, 12);
    return { wch: defaultWidth };
  });

  // 设置行高
  ws["!rows"] = [];
  if (title) {
    ws["!rows"][0] = { hpt: 30 }; // 标题行高
  }
  ws["!rows"][headerRowIdx] = { hpt: 24 }; // 表头行高

  return ws;
}

/**
 * 导出 Excel 文件
 * 支持多种调用方式：
 * 1. exportToExcel({ columns, data, fileName, ... })
 * 2. exportToExcel(columns, data, fileName)
 * 3. exportToExcel(data, columns, fileName)
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
  let mergeKeys: string[] | undefined;

  // 判断调用方式
  if (arg1 && !Array.isArray(arg1) && typeof arg1 === "object" && ("columns" in arg1 || "sheets" in arg1)) {
    // 对象形式: exportToExcel({ columns, data, fileName, ... })
    const opts = arg1 as ExportOptions;
    columns = opts.columns;
    data = opts.data || opts.dataSource || [];
    fileName = opts.fileName || opts.filename || "导出数据";
    title = opts.title;
    totalRow = opts.totalRow || opts.footer;
    totalLabel = opts.totalLabel;
    sheets = opts.sheets;
    mergeKeys = opts.mergeKeys;
  } else if (Array.isArray(arg1) && Array.isArray(arg2)) {
    // 两个数组 + 文件名
    const first = arg1 as any[];
    const second = arg2 as any[];
    if (first.length > 0 && first[0].header) {
      columns = first as ExportColumn[];
      data = second as Record<string, any>[];
    } else if (second.length > 0 && second[0].header) {
      columns = second as ExportColumn[];
      data = first as Record<string, any>[];
    } else {
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
    for (const sheet of sheets) {
      const sheetData = sheet.data || sheet.dataSource || [];
      const ws = buildSheet(
        sheet.columns,
        sheetData,
        sheet.title,
        sheet.totalRow,
        sheet.totalLabel,
        sheet.mergeKeys,
      );
      XLSX.utils.book_append_sheet(wb, ws, sheet.sheetName);
    }
  } else {
    const ws = buildSheet(columns!, data!, title, totalRow, totalLabel, mergeKeys);
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
