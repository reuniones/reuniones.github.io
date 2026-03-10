/**
 * Maneja solicitudes GET genéricas.
 * @example ?action=getData&sheet=NombreDeHoja&ssId=ID_DE_HOJA
 */
function doGet(e) {
  const action = e.parameter.action;
  const sheetName = e.parameter.sheet;
  const ssId = e.parameter.ssId;
  
  try {
    const ss = ssId ? SpreadsheetApp.openById(ssId) : SpreadsheetApp.getActiveSpreadsheet();
    if (action === 'getData') {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) return createResponse({ error: 'Hoja no encontrada: ' + sheetName });
      return createResponse(getSheetData(sheet));
    }
    return createResponse({ error: 'Acción GET no válida' });
  } catch (err) {
    return createResponse({ error: err.message });
  }
}

/**
 * Maneja solicitudes POST genéricas.
 */
function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    const sheetName = postData.sheet;
    const ssId = postData.ssId;
    const ss = ssId ? SpreadsheetApp.openById(ssId) : SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === 'saveData') {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) return createResponse({ error: 'Hoja no encontrada: ' + sheetName });
      updateOrInsert(sheet, postData.payload);
      return createResponse({ success: true });
    } 
    
    if (action === 'initSheet') {
      let sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        sheet.appendRow(postData.headers);
      } else if (!postData.preserveExisting) {
        sheet.clearContents(); // Clear only contents, not formatting
        sheet.getRange(1, 1, 1, postData.headers.length).setValues([postData.headers]).setFontWeight('bold').setBackground('#f3f3f3');
      } else { // If preserveExisting is true and sheet exists, ensure headers are present if sheet is empty
        if (sheet.getLastRow() === 0) {
          sheet.getRange(1, 1, 1, postData.headers.length).setValues([postData.headers]).setFontWeight('bold').setBackground('#f3f3f3');
        }
      }
      return createResponse({ success: true, message: 'Hoja inicializada' });
    }

    if (action === 'clearSheet') {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) return createResponse({ error: 'Hoja no encontrada' });
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues();
      sheet.clearContents();
      if (headers.length > 0 && headers[0][0]) sheet.appendRow(headers[0]);
      return createResponse({ success: true });
    }

    if (action === 'deleteSheet') {
      const sheet = ss.getSheetByName(sheetName);
      if (sheet) ss.deleteSheet(sheet);
      return createResponse({ success: true });
    }
    
    return createResponse({ error: 'Acción POST no válida' });
  } catch (err) {
    return createResponse({ error: err.message });
  }
}

// --- Utilidades de Hoja de Cálculo ---

function getSheetData(sheet) {
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  return rows.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => {
      // Intentar parsear JSON si parece una lista (ej. habilidades o asignaciones)
      try {
        if (typeof row[i] === 'string' && (row[i].startsWith('[') || row[i].startsWith('{'))) {
          obj[h] = JSON.parse(row[i]);
        } else {
          obj[h] = row[i];
        }
      } catch (e) {
        obj[h] = row[i];
      }
    });
    return obj;
  });
}

function updateOrInsert(sheet, item) {
  if (!sheet) return;
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const idIndex = headers.indexOf('id');
  
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idIndex] == item.id) {
      rowIndex = i + 1;
      break;
    }
  }
  
  const values = headers.map(h => {
    const val = item[h];
    return (typeof val === 'object') ? JSON.stringify(val) : val;
  });
  
  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, values.length).setValues([values]);
  } else {
    sheet.appendRow(values);
  }
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ================================================================= //
// XXTEA Core Implementation (Copiado de xxtea.gs)
// ================================================================= //

var DELTA = 0x9E3779B9;

function XXTEA_ENCRYPT(data, key) {
  if (!data || !key) return '';
  try { return encryptToBase64(String(data), String(key)); } catch (e) { return 'ERROR: ' + e.message; }
}

function XXTEA_DECRYPT(data, key) {
  if (!data || !key) return '';
  try {
    var decrypted = decryptFromBase64(String(data), String(key));
    return decrypted === null ? '' : decrypted;
  } catch (e) { return ''; }
}

function toUint32Array(bytes, includeLength) {
    var length = bytes.length;
    var n = length >> 2;
    if ((length & 3) !== 0) { ++n; }
    var v = [];
    for (var i = 0; i < n; i++) { v[i] = 0; }
    if (includeLength) { v[n] = length; }
    for (var i = 0; i < length; ++i) { v[i >> 2] |= (bytes[i] & 0xFF) << ((i & 3) << 3); }
    return v;
}

function toByteArray(v, includeLength) {
    var length = v.length;
    var n = length << 2;
    if (includeLength) {
        var m = v[length - 1];
        n -= 4;
        if ((m < n - 3) || (m > n)) { return null; }
        n = m;
    }
    var bytes = [];
    for (var i = 0; i < n; ++i) { bytes.push((v[i >> 2] >>> ((i & 3) << 3)) & 0xFF); }
    return bytes;
}

function int32(i) { return i & 0xFFFFFFFF; }

function mx(sum, y, z, p, e, k) {
    return ((z >>> 5 ^ y << 2) + (y >>> 3 ^ z << 4)) ^ ((sum ^ y) + (k[p & 3 ^ e] ^ z));
}

function fixk(k) {
    while (k.length < 4) { k.push(0); }
    return k;
}

function encryptUint32Array(v, k) {
    var length = v.length;
    var n = length - 1;
    var y, z, sum, e, p, q;
    z = v[n];
    sum = 0;
    for (q = Math.floor(6 + 52 / length) | 0; q > 0; --q) {
        sum = int32(sum + DELTA);
        e = sum >>> 2 & 3;
        for (p = 0; p < n; ++p) {
            y = v[p + 1];
            z = v[p] = int32(v[p] + mx(sum, y, z, p, e, k));
        }
        y = v[0];
        z = v[n] = int32(v[n] + mx(sum, y, z, n, e, k));
    }
    return v;
}

function decryptUint32Array(v, k) {
    var length = v.length;
    var n = length - 1;
    var y, z, sum, e, p, q;
    y = v[0];
    q = Math.floor(6 + 52 / length);
    for (sum = int32(q * DELTA); sum !== 0; sum = int32(sum - DELTA)) {
        e = sum >>> 2 & 3;
        for (p = n; p > 0; --p) {
            z = v[p - 1];
            y = v[p] = int32(v[p] - mx(sum, y, z, p, e, k));
        }
        z = v[n];
        y = v[0] = int32(v[0] - mx(sum, y, z, 0, e, k));
    }
    return v;
}

function encryptToBase64(data, key) {
    var dataBytes = Utilities.newBlob(data).getBytes();
    var keyBytes = Utilities.newBlob(key).getBytes();
    var v = toUint32Array(dataBytes, true);
    var k = toUint32Array(keyBytes, false);
    var encryptedV = encryptUint32Array(v, fixk(k));
    var encryptedBytes = toByteArray(encryptedV, false);
    return Utilities.base64Encode(encryptedBytes);
}

function decryptFromBase64(data, key) {
    var dataBytes = Utilities.base64Decode(data);
    var keyBytes = Utilities.newBlob(key).getBytes();
    var v = toUint32Array(dataBytes, false);
    var k = toUint32Array(keyBytes, false);
    var decryptedV = decryptUint32Array(v, fixk(k));
    var decryptedBytes = toByteArray(decryptedV, true);
    if (decryptedBytes === null) { return null; }
    return Utilities.newBlob(decryptedBytes).getDataAsString();
}
