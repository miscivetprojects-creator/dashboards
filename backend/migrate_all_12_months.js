const ExcelJS = require('exceljs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { connectDB, getCollection } = require('./src/db/mongoClient');

const masterLocationsList = [
  { code: 'LOC-0001', name: 'Khammam', opening: 1491570.83 },
  { code: 'LOC-0002', name: 'Haveri', opening: 0.00 },
  { code: 'LOC-0003', name: 'Hiriyur VJNL', opening: 7285.60 },
  { code: 'LOC-0004', name: 'Hiriyur Urban', opening: 0.00 },
  { code: 'LOC-0005', name: 'Hosadurga', opening: 0.00 },
  { code: 'LOC-0006', name: 'Malebennur', opening: 0.00 },
  { code: 'LOC-0007', name: 'Kakinada', opening: 0.00 },
  { code: 'LOC-0008', name: 'Ghattaprabha', opening: 278314.00 },
  { code: 'LOC-0009', name: 'Talikote', opening: 0.00 },
  { code: 'LOC-0010', name: 'Munavalli', opening: 55164.18 },
  { code: 'LOC-0011', name: 'Kumta', opening: 0.00 },
  { code: 'LOC-0012', name: 'Ugar, Kudichi', opening: 245446.58 },
  { code: 'LOC-0013', name: 'Chellakere', opening: 0.00 },
  { code: 'LOC-0014', name: 'Jalgaon', opening: 17828.00 },
  { code: 'LOC-0015', name: 'MKBD', opening: 671854.67 },
  { code: 'LOC-0016', name: 'Kadur', opening: 1103495.00 },
  { code: 'LOC-0017', name: 'YG Gudda', opening: 231091.31 },
  { code: 'LOC-0018', name: 'Khanapur', opening: 2671.13 },
  { code: 'LOC-0019', name: 'Borgaon', opening: 519.11 },
  { code: 'LOC-0020', name: 'Srirangapatna', opening: 0.00 },
  { code: 'LOC-0021', name: 'Jadcherla', opening: 1561783.75 },
  { code: 'LOC-0022', name: 'Gajendragada', opening: 18034.63 },
  { code: 'LOC-0023', name: 'Chadchan', opening: 9874.41 },
  { code: 'LOC-0024', name: 'Almela', opening: 0.00 },
  { code: 'LOC-0025', name: 'Amalapuram', opening: 0.00 },
  { code: 'LOC-0026', name: 'Ankalgi', opening: 0.00 },
  { code: 'LOC-0027', name: 'Chennagiri', opening: 0.00 },
  { code: 'LOC-0028', name: 'Devarakhadra', opening: 0.00 },
  { code: 'LOC-0029', name: 'Dindi', opening: 0.00 },
  { code: 'LOC-0030', name: 'Gokak', opening: 0.00 },
  { code: 'LOC-0031', name: 'Guttal', opening: 0.00 },
  { code: 'LOC-0032', name: 'Kabbur', opening: 0.00 },
  { code: 'LOC-0033', name: 'Madanapalli', opening: 0.00 },
  { code: 'LOC-0034', name: 'Molakamuru', opening: 0.00 },
  { code: 'LOC-0035', name: 'Muddebihal', opening: 0.00 },
  { code: 'LOC-0036', name: 'Nalatwad', opening: 0.00 },
  { code: 'LOC-0037', name: 'Rattihali', opening: 0.00 },
  { code: 'LOC-0038', name: 'Sangareddy', opening: 0.00 },
  { code: 'LOC-0039', name: 'Shankeshwar', opening: 0.00 },
  { code: 'LOC-0040', name: 'Sindagi', opening: 0.00 },
  { code: 'LOC-0041', name: 'HO(DG)', opening: 0.00 }
];

const monthFiles = [
  { m: 1, file: "Fuel Ledgers' January25 - All Projects.xlsx" },
  { m: 2, file: "Fuel Ledgers' Feb25 - All Projects.xlsx" },
  { m: 3, file: "Fuel Ledgers' March25 - All Projects.xlsx" },
  { m: 4, file: "Fuel Ledgers' April 25 - All Projects.xlsx" },
  { m: 5, file: "Fuel Ledgers' May 25 - All Projects.xlsx" },
  { m: 6, file: "Fuel Ledgers' June 25 - All Projects.xlsx" },
  { m: 7, file: "Fuel Ledgers' July25 - All Projects.xlsx" },
  { m: 8, file: "Fuel Ledgers' Agust-25 - All Projects.xlsx" },
  { m: 9, file: "Fuel Ledgers' Sep-25 - All Projects.xlsx" },
  { m: 10, file: "Fuel Ledgers' Oct-25 - All Projects.xlsx" },
  { m: 11, file: "Fuel Ledgers' Nov-25 - All Projects.xlsx" },
  { m: 12, file: "Fuel Ledgers' Dec-25 - All Projects.xlsx" }
];

function normalizeCostCenter(tabName) {
  const t = tabName.trim();
  const lower = t.toLowerCase();
  if (lower.startsWith('khammam')) return 'Khammam';
  if (lower.startsWith('jedcherla') || lower.startsWith('jadcherla') || lower.startsWith('jedcharla') || lower.startsWith('jadcharla')) return 'Jadcherla';
  if (lower.startsWith('yg gudda') || lower.startsWith('yg-gudda')) return 'YG Gudda';
  if (lower.startsWith('hosadurga')) return 'Hosadurga';
  if (lower.startsWith('devarakhadra') || lower.startsWith('devarkhadra')) return 'Devarakhadra';
  if (lower.startsWith('sangareddy')) return 'Sangareddy';
  if (lower.startsWith('chellakere')) return 'Chellakere';
  if (lower.startsWith('ghattaprabha')) return 'Ghattaprabha';
  if (lower.startsWith('gokak')) return 'Gokak';
  if (lower.startsWith('haveri')) return 'Haveri';
  if (lower.startsWith('rattihali')) return 'Rattihali';
  if (lower.startsWith('muddebihal') || lower.startsWith('muddebhihal')) return 'Muddebihal';
  if (lower.startsWith('munavalli') || lower.startsWith('munavali')) return 'Munavalli';
  if (lower.startsWith('ugar')) return 'Ugar, Kudichi';
  if (lower.startsWith('talikote')) return 'Talikote';
  if (lower.startsWith('chadchan')) return 'Chadchan';
  if (lower.startsWith('almela') || lower.startsWith('alemela')) return 'Almela';
  if (lower.startsWith('sindagi')) return 'Sindagi';
  if (lower.startsWith('nalatwad')) return 'Nalatwad';
  if (lower.startsWith('kabbur')) return 'Kabbur';
  if (lower.startsWith('ankalgi') || lower.startsWith('ankaligi')) return 'Ankalgi';
  if (lower.startsWith('shankeshwar')) return 'Shankeshwar';
  if (lower.startsWith('kumta')) return 'Kumta';
  if (lower.startsWith('borgaon')) return 'Borgaon';
  if (lower.startsWith('khanapur')) return 'Khanapur';
  if (lower.startsWith('malebenur') || lower.startsWith('malebennur')) return 'Malebennur';
  if (lower.startsWith('molakamuru') || lower.startsWith('molakalmuru')) return 'Molakamuru';
  if (lower.startsWith('kadur')) return 'Kadur';
  if (lower.startsWith('hiriyur')) return 'Hiriyur VJNL';
  if (lower.startsWith('guttal')) return 'Guttal';
  if (lower.startsWith('gajendragada')) return 'Gajendragada';
  if (lower.startsWith('jalgaon')) return 'Jalgaon';
  if (lower.startsWith('mkbd')) return 'MKBD';
  if (lower.startsWith('srirangapatna')) return 'Srirangapatna';
  if (lower.startsWith('dindi')) return 'Dindi';
  if (lower.startsWith('amalapuram')) return 'Amalapuram';
  if (lower.startsWith('madana') || lower.startsWith('madanapalli')) return 'Madanapalli';
  if (lower.startsWith('chennagiri')) return 'Chennagiri';
  if (lower.startsWith('ho(dg)') || lower.startsWith('ho (dg)')) return 'HO(DG)';
  return tabName.trim();
}

function isSummaryOrCardTab(name) {
  const lower = name.toLowerCase().trim();
  if (lower.startsWith('jan') || lower.startsWith('feb') || lower.startsWith('mar') || 
      lower.startsWith('apr') || lower.startsWith('may') || lower.startsWith('jun') || 
      lower.startsWith('jul') || lower.startsWith('aug') || lower.startsWith('sep') || 
      lower.startsWith('oct') || lower.startsWith('nov') || lower.startsWith('dec')) return true;
  if (lower.includes('sheet1') || lower.includes('sheet2') || lower.includes('store & fuel') || 
      lower.includes('copy') || lower.includes('revised') || lower.includes('analysis')) return true;
  if (lower.startsWith('bpcl') || lower.startsWith('hpcl') || lower.startsWith('iocl')) return true;
  return false;
}

function isTotalRow(r) {
  for (let c = 1; c <= 15; c++) {
    const cell = r.getCell(c);
    const val = String(cell.value || '').trim().toLowerCase();
    if (val === 'total' || val.includes('grand total')) return true;
    const f = String(cell.formula || '').trim().toUpperCase();
    if (f.startsWith('SUM(')) return true;
  }
  return false;
}

function detectColumns(ws) {
  let headerRow = 2;
  for (let r = 1; r <= 4; r++) {
    const text = (ws.getRow(r).values || []).join(' ').toLowerCase();
    if (text.includes('diesel') || text.includes('total amount') || text.includes('amount paid')) {
      headerRow = r;
      break;
    }
  }

  const map = {
    headerRow,
    date: 2,
    grn: -1,
    billNo: -1,
    dLts: -1,
    dPrice: -1,
    dAmt: -1,
    pLts: -1,
    pPrice: -1,
    pAmt: -1,
    totalCost: -1,
    paid: -1,
    closing: -1,
    remarks: -1
  };

  const row = ws.getRow(headerRow);
  for (let c = 1; c <= 25; c++) {
    const h = String(row.getCell(c).value || '').toLowerCase().trim();
    if (!h) continue;

    if (h.includes('date') && !h.includes('as on') && !h.includes('payment') && map.date === 2) map.date = c;
    else if (h.includes('grn')) map.grn = c;
    else if (h.includes('bill') || h.includes('ind no') || h.includes('indno')) map.billNo = c;
    else if (h.includes('diesel') && (h.includes('lt') || h.includes('liter') || h.includes('qty'))) map.dLts = c;
    else if (h.includes('petrol') && (h.includes('lt') || h.includes('liter') || h.includes('qty'))) map.pLts = c;
    else if (h.includes('total') && (h.includes('amount') || h.includes('cost'))) map.totalCost = c;
    else if (h.includes('paid') || h.includes('recharge') || h.includes('payment amount')) map.paid = c;
    else if (h.includes('as on') || h.includes('closing') || h.includes('balance')) map.closing = c;
    else if (h.includes('remark')) map.remarks = c;
  }

  if (map.dLts !== -1) {
    if (map.dPrice === -1) map.dPrice = map.dLts + 1;
    if (map.dAmt === -1) map.dAmt = map.dLts + 2;
  }
  if (map.pLts !== -1) {
    if (map.pPrice === -1) map.pPrice = map.pLts + 1;
    if (map.pAmt === -1) map.pAmt = map.pLts + 2;
  }

  if (map.dLts === -1) map.dLts = 5;
  if (map.dPrice === -1) map.dPrice = 6;
  if (map.dAmt === -1) map.dAmt = 7;
  if (map.pLts === -1) map.pLts = 8;
  if (map.pPrice === -1) map.pPrice = 9;
  if (map.pAmt === -1) map.pAmt = 10;
  if (map.totalCost === -1) map.totalCost = 11;
  if (map.paid === -1) map.paid = 12;
  if (map.closing === -1) map.closing = 13;

  return map;
}

function getOpening(ws, headerRow) {
  let opBal = 0;
  for (let r = 1; r <= 4; r++) {
    const row = ws.getRow(r);
    const text = (row.values || []).join(' ').toLowerCase();
    if (text.includes('opening balance') || text.includes('opening')) {
      for (let c = 10; c <= 16; c++) {
        const v = Number(row.getCell(c).result !== undefined ? row.getCell(c).result : row.getCell(c).value) || 0;
        if (v !== 0) {
          opBal = v;
          break;
        }
      }
      break;
    }
  }
  return opBal;
}

function parseDate(val, year, month, fallbackDay = '15') {
  if (!val) {
    return `${year}-${String(month).padStart(2, '0')}-${String(fallbackDay).padStart(2, '0')}`;
  }
  if (val instanceof Date) {
    const d = String(val.getDate()).padStart(2, '0');
    return `${year}-${String(month).padStart(2, '0')}-${d}`;
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = s.slice(8, 10);
    return `${year}-${String(month).padStart(2, '0')}-${d}`;
  }
  const clean = s.replace(/\.+/g, '.');
  const parts = clean.split(/[./-]/);
  if (parts.length >= 2) {
    let d = parseInt(parts[0], 10) || 15;
    if (d > 31) d = 15;
    return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(fallbackDay).padStart(2, '0')}`;
}

async function migrateAll() {
  await connectDB();
  const locsColl = getCollection('project_locations');
  const vendorsColl = getCollection('vendors');
  const recordsColl = getCollection('monthly_report_records');
  const dataDir = path.join(__dirname, 'data');

  for (const m of masterLocationsList) {
    await locsColl.updateOne(
      { $or: [{ code: m.code }, { name: m.name }] },
      {
        $set: {
          id: m.code,
          code: m.code,
          name: m.name,
          category: 'Project Site',
          status: 'active',
          opening_balance: m.opening,
          updated_at: new Date()
        },
        $setOnInsert: {
          created_at: new Date(),
          created_by: 'mis@civetprojects.com'
        }
      },
      { upsert: true }
    );
  }

  const existingLocDocs = await locsColl.find({}).toArray();
  const locMap = {};
  existingLocDocs.forEach(l => {
    locMap[l.name.toLowerCase().trim()] = l;
  });

  const discoveredVendors = new Set();
  const allRecords = [];

  for (const mf of monthFiles) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path.join(dataDir, mf.file));
    const year = 2025;
    const month = mf.m;
    const quarter = month <= 3 ? 'Q1' : month <= 6 ? 'Q2' : month <= 9 ? 'Q3' : 'Q4';

    for (const ws of wb.worksheets) {
      if (isSummaryOrCardTab(ws.name)) continue;

      const tabName = ws.name.trim();
      const costCenterName = normalizeCostCenter(tabName);
      const locDoc = locMap[costCenterName.toLowerCase()] || { id: 'LOC-UNKNOWN', name: costCenterName };

      let bunkName = '';
      for (let c = 1; c <= 10; c++) {
        const val = ws.getRow(1).getCell(c).value;
        if (val && typeof val === 'string' && val.trim().length > 2) {
          bunkName = val.trim();
          break;
        }
      }
      if (!bunkName) bunkName = `${costCenterName} Fuel Point`;
      discoveredVendors.add(bunkName);

      const map = detectColumns(ws);
      const tabOpBal = getOpening(ws, map.headerRow);
      let runningBal = tabOpBal;

      let fallbackCounter = 1;
      for (let rn = map.headerRow + 2; rn <= ws.rowCount; rn++) {
        const r = ws.getRow(rn);
        if (isTotalRow(r)) break;

        const dLts = Number(r.getCell(map.dLts).value) || 0;
        const dPrice = Number(r.getCell(map.dPrice).value) || 0;
        const dAmt = Number(r.getCell(map.dAmt).result !== undefined ? r.getCell(map.dAmt).result : r.getCell(map.dAmt).value) || (dLts * dPrice);

        const pLts = Number(r.getCell(map.pLts).value) || 0;
        const pPrice = Number(r.getCell(map.pPrice).value) || 0;
        const pAmt = Number(r.getCell(map.pAmt).result !== undefined ? r.getCell(map.pAmt).result : r.getCell(map.pAmt).value) || (pLts * pPrice);

        const cost = Number(r.getCell(map.totalCost).result !== undefined ? r.getCell(map.totalCost).result : r.getCell(map.totalCost).value) || (dAmt + pAmt);
        const paid = Number(r.getCell(map.paid).result !== undefined ? r.getCell(map.paid).result : r.getCell(map.paid).value) || 0;

        if (dLts > 0 || pLts > 0 || cost > 0 || paid > 0) {
          const rawDate = map.date !== -1 ? r.getCell(map.date).value : null;
          const grnNo = map.grn !== -1 && r.getCell(map.grn).value ? String(r.getCell(map.grn).value).trim() : '';
          const billNo = map.billNo !== -1 && r.getCell(map.billNo).value ? String(r.getCell(map.billNo).value).trim() : '';
          const remarks = map.remarks !== -1 && r.getCell(map.remarks).value ? String(r.getCell(map.remarks).value).trim() : '';

          const dateStr = parseDate(rawDate, year, month, Math.min(fallbackCounter, 28));
          fallbackCounter++;

          const rowOpening = runningBal;
          const rowClosing = Number((rowOpening + cost - paid).toFixed(2));
          runningBal = rowClosing;

          const isCash = bunkName.toLowerCase().includes('merchant') || costCenterName.toLowerCase().includes('merchant') || (paid > 0 && dLts <= 0 && pLts <= 0);
          const fuelType = (dLts > 0 && pLts > 0) ? 'Both' : (dLts > 0 ? 'Diesel' : 'Petrol');
          const rateVal = dLts > 0 ? dPrice : pPrice;

          allRecords.push({
            report_type_id: 'FUEL_PURCHASE',
            department_id: 'PM',
            location_id: locDoc.id,
            location_name: locDoc.name,
            report_date: dateStr,
            reporting_year: year,
            reporting_month: month,
            reporting_quarter: quarter,
            vendor_name: bunkName,
            ledger_type: bunkName,
            paid_amount: Number(paid.toFixed(2)),
            total_cost: Number(cost.toFixed(2)),
            opening_balance: Number(rowOpening.toFixed(2)),
            balance: Number(rowClosing.toFixed(2)),
            balance_amount: Number(rowClosing.toFixed(2)),
            fuel_consumed_litres: Number((dLts + pLts).toFixed(2)),
            remarks: remarks,
            status: 'Approved',
            version: 1,
            is_latest: true,
            source: 'excel_import',
            created_by: 'mis@civetprojects.com',
            created_at: new Date(),
            updated_at: new Date(),
            data: {
              location: locDoc.name,
              location_id: locDoc.id,
              location_name: locDoc.name,
              vendor_name: bunkName,
              ledger_type: bunkName,
              tab_name: tabName,
              department: 'Plant & Machinery',
              department_beneficiary: 'Plant & Machinery',
              fuel_type: fuelType,
              report_date: dateStr,
              grn_no: grnNo,
              bill_no: billNo,
              quantity: Number((dLts + pLts).toFixed(2)),
              rate: Number(rateVal.toFixed(2)),
              diesel_quantity: Number(dLts.toFixed(2)),
              diesel_rate: Number(dPrice.toFixed(2)),
              diesel_total_cost: Number(dAmt.toFixed(2)),
              petrol_quantity: Number(pLts.toFixed(2)),
              petrol_rate: Number(pPrice.toFixed(2)),
              petrol_total_cost: Number(pAmt.toFixed(2)),
              total_cost: Number(cost.toFixed(2)),
              paid_amount: Number(paid.toFixed(2)),
              amount: Number(paid.toFixed(2)),
              opening_balance: Number(rowOpening.toFixed(2)),
              balance: Number(rowClosing.toFixed(2)),
              balance_amount: Number(rowClosing.toFixed(2)),
              remarks: remarks,
              cash_and_carry: isCash ? 'Yes' : 'No'
            }
          });
        }
      }
    }
  }

  const sortedVendors = Array.from(discoveredVendors).sort();
  for (let i = 0; i < sortedVendors.length; i++) {
    const vName = sortedVendors[i].trim();
    const vCode = 'VND-' + String(i + 1).padStart(4, '0');
    await vendorsColl.updateOne(
      { name: vName },
      {
        $set: {
          id: vCode,
          code: vCode,
          name: vName,
          status: 'active',
          updated_at: new Date()
        },
        $setOnInsert: {
          created_at: new Date(),
          created_by: 'mis@civetprojects.com'
        }
      },
      { upsert: true }
    );
  }

  await recordsColl.deleteMany({ report_type_id: 'FUEL_PURCHASE' });

  const batchSize = 1000;
  for (let i = 0; i < allRecords.length; i += batchSize) {
    const chunk = allRecords.slice(i, i + batchSize);
    await recordsColl.insertMany(chunk);
  }

  console.log(`MIGRATION COMPLETE: Inserted ${allRecords.length} records across all 12 months.`);
  console.log(`Cost Centers: ${masterLocationsList.length} registered.`);
  console.log(`Vendors: ${sortedVendors.length} registered.`);
  process.exit(0);
}

migrateAll().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
