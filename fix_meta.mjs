import { storageGet, storagePut } from './server/storage.ts';

async function fixMeta() {
  try {
    // Load current meta
    const { url } = await storageGet('yinbao-data/upload_meta.json');
    const resp = await fetch(url);
    const meta = await resp.json();
    console.log('Current meta:', JSON.stringify(meta, null, 2));
    
    // Fix garbled filenames by decoding latin1->utf8
    function fixName(name) {
      if (!name) return name;
      try {
        // Try to detect if it's already garbled (latin1 encoded UTF-8)
        const buf = Buffer.from(name, 'latin1');
        const decoded = buf.toString('utf8');
        // Check if decoded looks like valid Chinese
        if (/[\u4e00-\u9fff]/.test(decoded) && !decoded.includes('\ufffd')) {
          console.log(`Fixed: "${name}" -> "${decoded}"`);
          return decoded;
        }
      } catch (e) {}
      return name;
    }
    
    if (meta.sourceFileName) meta.sourceFileName = fixName(meta.sourceFileName);
    if (meta.renwangFileName) meta.renwangFileName = fixName(meta.renwangFileName);
    if (meta.dailyFileName) meta.dailyFileName = fixName(meta.dailyFileName);
    
    console.log('\nFixed meta:', JSON.stringify(meta, null, 2));
    
    // Save back to S3
    await storagePut('yinbao-data/upload_meta.json', JSON.stringify(meta), 'application/json');
    console.log('\nMeta saved to S3 successfully');
  } catch (e) {
    console.error('Error:', e);
  }
}

fixMeta();
