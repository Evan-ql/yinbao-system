import { describe, expect, it } from "vitest";

/**
 * Test the fixFilename function logic (same as in reportApi.ts)
 */
function fixFilename(name: string): string {
  try {
    return Buffer.from(name, 'latin1').toString('utf8');
  } catch {
    return name;
  }
}

describe("fixFilename - Chinese filename encoding fix", () => {
  it("should decode latin1-encoded Chinese filename to UTF-8", () => {
    // Simulate what multer does: UTF-8 bytes interpreted as latin1
    const originalChinese = "测试文件.xlsx";
    const utf8Bytes = Buffer.from(originalChinese, 'utf8');
    const latin1Mangled = utf8Bytes.toString('latin1');
    
    const fixed = fixFilename(latin1Mangled);
    expect(fixed).toBe(originalChinese);
  });

  it("should handle already-ASCII filenames", () => {
    const asciiName = "test_file_2026.xlsx";
    const fixed = fixFilename(asciiName);
    expect(fixed).toBe(asciiName);
  });

  it("should handle mixed Chinese and ASCII filenames", () => {
    const original = "L101038_银保数据_2026(49).xlsx";
    const utf8Bytes = Buffer.from(original, 'utf8');
    const latin1Mangled = utf8Bytes.toString('latin1');
    
    const fixed = fixFilename(latin1Mangled);
    expect(fixed).toBe(original);
  });
});

describe("detectHeaderRow logic", () => {
  // Simulate the header detection logic
  function detectHeaderRow(rawData: any[][], keyColumns: string[] = ['保单号', '新约保费', '险种', '银行总行', '保单状态']): number {
    for (let r = 0; r < Math.min(20, rawData.length); r++) {
      const row = rawData[r];
      if (!row) continue;
      const rowStrs = row.map((c: any) => String(c || '').trim());
      const matchCount = keyColumns.filter(k => rowStrs.includes(k)).length;
      if (matchCount >= 2) {
        return r;
      }
    }
    return 6; // default
  }

  it("should detect header at row 7 (index 6) for standard files", () => {
    const rawData: any[][] = [];
    // Rows 0-5: metadata/empty
    for (let i = 0; i < 6; i++) rawData.push(['', '', '']);
    // Row 6: header
    rawData.push(['二级机构', '保单号', '险种', '新约保费', '银行总行', '保单状态']);
    // Row 7+: data
    rawData.push(['机构A', '001', '险种A', 1000, '银行A', '有效']);
    
    expect(detectHeaderRow(rawData)).toBe(6);
  });

  it("should detect header at row 1 (index 0) when headers are at top", () => {
    const rawData: any[][] = [];
    // Row 0: header directly
    rawData.push(['保单号', '险种', '新约保费', '银行总行', '保单状态']);
    rawData.push(['001', '险种A', 1000, '银行A', '有效']);
    
    expect(detectHeaderRow(rawData)).toBe(0);
  });

  it("should detect header at row 3 (index 2) for non-standard files", () => {
    const rawData: any[][] = [];
    rawData.push(['报表标题']);
    rawData.push(['日期: 2026-01-01']);
    // Row 2: header
    rawData.push(['保单号', '险种', '新约保费', '银行总行']);
    rawData.push(['001', '险种A', 1000, '银行A']);
    
    expect(detectHeaderRow(rawData)).toBe(2);
  });

  it("should default to row 6 when no headers found", () => {
    const rawData: any[][] = [];
    for (let i = 0; i < 10; i++) rawData.push([i, i + 1, i + 2]);
    
    expect(detectHeaderRow(rawData)).toBe(6);
  });
});
