/**
 * zip.js — a minimal, dependency-free ZIP file writer.
 *
 * Used by the batch conversion feature: when the user converts 2+ images
 * at once, bundling them into a single .zip is far better UX than firing
 * off several simultaneous browser downloads (which Chrome throttles and
 * prompts the user to approve after a handful of files).
 *
 * Only the "stored" (uncompressed) method is implemented — no DEFLATE.
 * This is a deliberate, reasonable trade-off: every file going into the
 * zip is already a compressed image format (PNG/JPEG/WEBP), so running
 * DEFLATE over already-compressed bytes would spend CPU time for
 * near-zero size savings. Implementing a DEFLATE encoder from scratch
 * (impossible to pull in as an npm dependency in an unbundled MV3
 * extension) would add real complexity for no practical benefit here.
 *
 * The output is spec-compliant to the classic ZIP format (local file
 * headers + central directory + end-of-central-directory record) and
 * opens correctly in Windows Explorer, macOS Archive Utility, and any
 * standard unzip tool.
 */

// Standard CRC-32 (ISO 3309 / ZIP) implementation.
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** DOS date/time encoding required by the ZIP format (local time, 2-second resolution). */
function toDosDateTime(date) {
  const dosTime =
    (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const dosDate =
    ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosTime, dosDate };
}

function writeUint16(view, offset, value) { view.setUint16(offset, value, true); }
function writeUint32(view, offset, value) { view.setUint32(offset, value, true); }

/**
 * Build a ZIP file (as a Blob) from a list of { name, bytes } entries,
 * where `bytes` is a Uint8Array (or anything a Uint8Array can wrap, e.g.
 * an ArrayBuffer) of the file's raw content.
 */
function createZip(entries) {
  const now = new Date();
  const { dosTime, dosDate } = toDosDateTime(now);

  const localParts = [];
  const centralParts = [];
  let offset = 0;

  entries.forEach(({ name, bytes }) => {
    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const nameBytes = new TextEncoder().encode(name);
    const crc = crc32(data);

    // --- Local file header (30 bytes + name) ---
    const localHeader = new ArrayBuffer(30);
    const lv = new DataView(localHeader);
    writeUint32(lv, 0, 0x04034b50); // local file header signature
    writeUint16(lv, 4, 20);          // version needed to extract
    writeUint16(lv, 6, 0x0800);      // general purpose flag: bit 11 = UTF-8 file names
    writeUint16(lv, 8, 0);           // compression method: 0 = stored
    writeUint16(lv, 10, dosTime);
    writeUint16(lv, 12, dosDate);
    writeUint32(lv, 14, crc);
    writeUint32(lv, 18, data.length); // compressed size == original size (stored)
    writeUint32(lv, 22, data.length); // uncompressed size
    writeUint16(lv, 26, nameBytes.length);
    writeUint16(lv, 28, 0);           // extra field length

    localParts.push(new Uint8Array(localHeader), nameBytes, data);

    // --- Central directory record for this entry (46 bytes + name) ---
    const centralHeader = new ArrayBuffer(46);
    const cv = new DataView(centralHeader);
    writeUint32(cv, 0, 0x02014b50); // central directory signature
    writeUint16(cv, 4, 20);          // version made by
    writeUint16(cv, 6, 20);          // version needed to extract
    writeUint16(cv, 8, 0x0800); // flag: UTF-8 file names
    writeUint16(cv, 10, 0);
    writeUint16(cv, 12, dosTime);
    writeUint16(cv, 14, dosDate);
    writeUint32(cv, 16, crc);
    writeUint32(cv, 20, data.length);
    writeUint32(cv, 24, data.length);
    writeUint16(cv, 28, nameBytes.length);
    writeUint16(cv, 30, 0);  // extra field length
    writeUint16(cv, 32, 0);  // comment length
    writeUint16(cv, 34, 0);  // disk number start
    writeUint16(cv, 36, 0);  // internal file attributes
    writeUint32(cv, 38, 0);  // external file attributes
    writeUint32(cv, 42, offset); // offset of local header

    centralParts.push(new Uint8Array(centralHeader), nameBytes);

    offset += localHeader.byteLength + nameBytes.length + data.length;
  });

  const centralDirSize = centralParts.reduce((sum, p) => sum + p.length, 0);
  const centralDirOffset = offset;

  // --- End of central directory record (22 bytes) ---
  const eocd = new ArrayBuffer(22);
  const ev = new DataView(eocd);
  writeUint32(ev, 0, 0x06054b50); // EOCD signature
  writeUint16(ev, 4, 0);           // this disk number
  writeUint16(ev, 6, 0);           // disk where central directory starts
  writeUint16(ev, 8, entries.length);  // entries on this disk
  writeUint16(ev, 10, entries.length); // total entries
  writeUint32(ev, 12, centralDirSize);
  writeUint32(ev, 16, centralDirOffset);
  writeUint16(ev, 20, 0); // comment length

  return new Blob([...localParts, ...centralParts, new Uint8Array(eocd)], {
    type: "application/zip"
  });
}
