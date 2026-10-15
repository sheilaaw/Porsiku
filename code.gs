// Google Apps Script – penerima jawaban Porsiku (seperti Google Form)
// Cara pasang: lihat penjelasan di chat. Tempel kode ini di Extensions > Apps Script pada Google Sheet baru.
const TOKEN = 'GANTI_TOKEN_RAHASIA'; // samakan dengan CONFIG.TOKEN di script.js

const KOLOM = {
  pengguna:   ['nama','jk','usia','bb','tb','aktivitas','alergi','imt','kategori','bmr','tee'],
  konsultasi: ['nama','jk','usia','bb','tb','aktivitas','alergi','imt','kategori','bmr','tee','keluhan']
};
const JUDUL = ['Waktu','Nama','Jenis kelamin','Usia','BB (kg)','TB (cm)','Aktivitas','Alergi','IMT','Kategori IMT','BMR (kkal)','Total energi (kkal)','Keluhan'];

function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  if (d.token !== TOKEN || !KOLOM[d.tipe]) return ContentService.createTextOutput('ditolak');
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const nama = d.tipe === 'konsultasi' ? 'Konsultasi' : 'Data Pengguna';
  const sh = ss.getSheetByName(nama) || ss.insertSheet(nama);
  const kol = KOLOM[d.tipe];
  if (sh.getLastRow() === 0) {
    sh.appendRow(JUDUL.slice(0, kol.length + 1));
    sh.getRange(1, 1, 1, kol.length + 1).setFontWeight('bold').setBackground('#c9f53a');
    sh.setFrozenRows(1);
  }
  sh.appendRow([new Date(), ...kol.map(k => d[k] === undefined ? '' : d[k])]);
  lock.releaseLock();
  return ContentService.createTextOutput('ok');
}
