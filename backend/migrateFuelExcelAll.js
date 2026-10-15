const ExcelJS = require('exceljs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { connectDB, getDB, closeDB } = require('./src/db/mongoClient');

const sheetConfigs = [
  { sheet: 'Khammam-1', loc: 'Khammam', endRow: 26, defaultBunk: 'Lakshmi Manikanta Filling Station' },
  { sheet: 'Khammam-2', loc: 'Khammam', endRow: 33, defaultBunk: 'Sri Ramakotaiah Fuel Point' },
  { sheet: 'Jedcherla -1', loc: 'Jadcherla', endRow: 31, defaultBunk: 'Sai Baba Fuel Station' },
  { sheet: 'Jedcherla-2', loc: 'Jadcherla', endRow: 35, defaultBunk: 'Bhavani Filling Station' },
  { sheet: 'YG Gudda ', loc: 'YG Gudda', endRow: 20, defaultBunk: 'Pallavi Petrolium' },
  { sheet: 'Hosadurga', loc: 'Hosadurga', endRow: 12, defaultBunk: 'Merchant Petroliums' },
  { sheet: 'Malebenur(KUWSDB)', loc: 'Malebennur', endRow: 18, defaultBunk: 'Sri Ramanjuneya Service Station' },
  { sheet: 'Kadur', loc: 'Kadur', endRow: 8, defaultBunk: 'Vishal Service Station' },
  { sheet: 'Hiriyur(VJNL)', loc: 'Hiriyur VJNL', endRow: 8, defaultBunk: 'Sri Balaji Agencies' },
  { sheet: 'Chellakere (KUWSDB)', loc: 'Chellakere', endRow: 10, defaultBunk: 'Sri Vishnu Baba Petroleum' },
  { sheet: 'Munavalli(KUWSDB)', loc: 'Munavalli', endRow: 34, defaultBunk: 'Shahapur Petroleum' },
  { sheet: 'Khanapur', loc: 'Khanapur', endRow: 31, defaultBunk: 'J K Makavi' },
  { sheet: 'Ugar,Khagwad,Kudichi', loc: 'Ugar, Kudichi', endRow: 35, defaultBunk: 'Shiri Bhrhmanath Petrolium' },
  { sheet: 'Borgaon', loc: 'Borgaon', endRow: 27, defaultBunk: 'Aadisagar Petrolium' },
  { sheet: 'kumta', loc: 'Kumta', endRow: 34, defaultBunk: 'Krishma fuel station' },
  { sheet: 'Jalgaon', loc: 'Jalgaon', endRow: 15, defaultBunk: 'Sri Sai Petrol Pump' },
  { sheet: 'MKBD', loc: 'MKBD', endRow: 15, defaultBunk: 'Shree Sai Samarth Petroleum' },
  { sheet: 'Haveri', loc: 'Haveri', endRow: 36, defaultBunk: 'Shivalingeshwar Petroleum' },
  { sheet: 'Gajendragada', loc: 'Gajendragada', endRow: 28, defaultBunk: 'Vanasri Petrol Pump' },
  { sheet: 'Ghattaprabha', loc: 'Ghattaprabha', endRow: 35, defaultBunk: 'Vivek Petrol Pump' },
  { sheet: 'Chadchan', loc: 'Chadchan', endRow: 27, defaultBunk: 'Khavekar Petrolium' },
  { sheet: ' Talikote', loc: 'Talikote', endRow: 62, defaultBunk: 'Raykar Oil Agencies' },
  { sheet: 'Srirangapatna', loc: 'Srirangapatna', endRow: 14, defaultBunk: 'Sri Chakra Fuel Station' }
];

const masterLocations = [
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
  { code: 'LOC-0015', name: 'MKBD', opening: 671854.00 },
  { code: 'LOC-0016', name: 'Kadur', opening: 1103495.00 },
  { code: 'LOC-0017', name: 'YG Gudda', opening: 231091.31 },
  { code: 'LOC-0018', name: 'Khanapur', opening: 2671.13 },
  { code: 'LOC-0019', name: 'Borgaon', opening: 519.11 },
  { code: 'LOC-0020', name: 'Srirangapatna', opening: 0.00 },
  { code: 'LOC-0021', name: 'Jadcherla', opening: 1561783.75 },
  { code: 'LOC-0022', name: 'Gajendragada', opening: 18034.63 },
  { code: 'LOC-0023', name: 'Chadchan', opening: 9874.41 }
];

function parseDate(val, fallbackDay = '15') {
  if (!val) return `2025-01-${String(fallbackDay).padStart(2, '0')}`;
  if (val instanceof Date) {
    const yr = val.getFullYear();
    if (yr < 2024 || yr > 2026) {
      return `2025-01-${String(val.getDate()).padStart(2, '0')}`;
    }
    return val.toISOString().slice(0, 10);
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const yr = parseInt(s.slice(0, 4), 10);
    if (yr < 2024 || yr > 2026) {
      return `2025-01-${s.slice(8, 10)}`;
    }
    return s.slice(0, 10);
  }
  const clean = s.replace(/\.+/g, '.');
  const parts = clean.split(/[./-]/);
  if (parts.length >= 3) {
    let d = parseInt(parts[0], 10) || 15;
    let m = parseInt(parts[1], 10) || 1;
    let y = 2025;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return `2025-01-${String(fallbackDay).padStart(2, '0')}`;
}

async function runMigration() {
  await connectDB();
  const db = getDB();
  const excelPath = path.join(__dirname, 'data/Fuel Ledgers\' January25 - All Projects.xlsx');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(excelPath);

  const locsColl = db.collection('project_locations');
  for (const m of masterLocations) {
    await locsColl.updateOne(
      { $or: [{ code: m.code }, { name: m.name }] },
      {
        $set: {
          code: m.code,
          name: m.name,
          opening_balance: m.opening,
          updated_at: new Date()
        }
      },
      { upsert: true }
    );
  }

  const rawRecordsByLoc = {};
  for (const cfg of sheetConfigs) {
    const ws = wb.getWorksheet(cfg.sheet);
    if (!ws) continue;
    const bunkName = (ws.getRow(1).getCell(1).value || ws.getRow(1).getCell(2).value || cfg.defaultBunk).toString().trim();
    if (!rawRecordsByLoc[cfg.loc]) {
      rawRecordsByLoc[cfg.loc] = [];
    }

    for (let rn = 4; rn <= cfg.endRow; rn++) {
      const r = ws.getRow(rn);
      const dLts = Number(r.getCell(5).value) || 0;
      const dPrice = Number(r.getCell(6).value) || 0;
      const dAmt = Number(r.getCell(7).result !== undefined ? r.getCell(7).result : r.getCell(7).value) || (dLts * dPrice);
      const pLts = Number(r.getCell(8).value) || 0;
      const pPrice = Number(r.getCell(9).value) || 0;
      const pAmt = Number(r.getCell(10).result !== undefined ? r.getCell(10).result : r.getCell(10).value) || (pLts * pPrice);
      const cost = Number(r.getCell(11).result !== undefined ? r.getCell(11).result : r.getCell(11).value) || (dAmt + pAmt);
      const paid = Number(r.getCell(12).result !== undefined ? r.getCell(12).result : r.getCell(12).value) || 0;

      const f5 = (r.getCell(5).formula || '').toUpperCase();
      const f11 = (r.getCell(11).formula || '').toUpperCase();
      if (f5.startsWith('SUM(') || f11.startsWith('SUM(')) continue;

      if (dLts > 0 || pLts > 0 || cost > 0 || paid > 0) {
        const rawDate = r.getCell(2).value;
        const grnNo = r.getCell(3).value ? String(r.getCell(3).value).trim() : '';
        const billNo = r.getCell(4).value ? String(r.getCell(4).value).trim() : '';
        const remarks = r.getCell(14).value ? String(r.getCell(14).value).trim() : '';
        const dateStr = parseDate(rawDate, rn - 3);

        rawRecordsByLoc[cfg.loc].push({
          dateStr,
          rn,
          sheet: cfg.sheet,
          bunkName,
          grnNo,
          billNo,
          dLts,
          dPrice,
          dAmt,
          pLts,
          pPrice,
          pAmt,
          cost: Number(cost.toFixed(2)),
          paid: Number(paid.toFixed(2)),
          remarks
        });
      }
    }
  }

  const allFinalRecords = [];
  for (const m of masterLocations) {
    const rawList = rawRecordsByLoc[m.name] || [];
    if (rawList.length === 0) continue;

    rawList.sort((a, b) => a.dateStr.localeCompare(b.dateStr) || a.rn - b.rn);

    let runningBal = m.opening;
    for (const item of rawList) {
      const recOpening = runningBal;
      const recClosing = Number((recOpening + item.cost - item.paid).toFixed(2));
      runningBal = recClosing;

      let fuelType = 'Diesel';
      if (item.dLts > 0 && item.pLts > 0) fuelType = 'Both';
      else if (item.pLts > 0 && item.dLts <= 0) fuelType = 'Petrol';

      const totalLtrs = Number((item.dLts + item.pLts).toFixed(2));
      const avgRate = totalLtrs > 0 ? Number((item.cost / totalLtrs).toFixed(2)) : (item.dPrice || item.pPrice || 0);

      const recordDoc = {
        report_type_id: 'FUEL_PURCHASE',
        department_id: 'PM',
        location_id: m.code,
        location_name: m.name,
        report_date: item.dateStr,
        reporting_year: 2025,
        reporting_month: 1,
        reporting_quarter: 'Q1',
        data: {
          location: m.name,
          location_id: m.name,
          vendor_name: item.bunkName,
          ledger_type: item.bunkName,
          department: 'Plant & Machinery',
          department_beneficiary: 'Plant & Machinery',
          fuel_type: fuelType,
          report_date: item.dateStr,
          grn_no: item.grnNo,
          bill_no: item.billNo,
          quantity: totalLtrs,
          rate: avgRate,
          diesel_quantity: item.dLts,
          diesel_rate: item.dPrice,
          diesel_total_cost: item.dAmt,
          petrol_quantity: item.pLts,
          petrol_rate: item.pPrice,
          petrol_total_cost: item.pAmt,
          total_cost: item.cost,
          paid_amount: item.paid,
          amount: item.paid,
          opening_balance: recOpening,
          balance: recClosing,
          balance_amount: recClosing,
          remarks: item.remarks,
          cash_and_carry: totalLtrs <= 0 && item.paid > 0 ? 'Yes' : 'No'
        },
        paid_amount: item.paid,
        total_cost: item.cost,
        opening_balance: recOpening,
        balance: recClosing,
        balance_amount: recClosing,
        fuel_consumed_litres: totalLtrs,
        vendor_name: item.bunkName,
        ledger_type: item.bunkName,
        remarks: item.remarks,
        status: 'Approved',
        version: 1,
        is_latest: true,
        source: 'excel_import',
        created_by: 'mis@civetprojects.com',
        created_at: new Date(),
        updated_at: new Date()
      };

      allFinalRecords.push(recordDoc);
    }
  }

  const recordsColl = db.collection('monthly_report_records');
  await recordsColl.deleteMany({
    $or: [
      { report_type_id: 'FUEL_PURCHASE' },
      { category: 'Fuel' },
      { department_id: 'FUEL' },
      { 'data.fuel_type': { $exists: true, $ne: '' } }
    ]
  });

  const insertResult = await recordsColl.insertMany(allFinalRecords);
  console.log(`Successfully migrated ${insertResult.insertedCount} fuel records across ${masterLocations.length} cost centers.`);

  const vendorsColl = db.collection('vendors');
  const distinctVendors = Array.from(new Set(allFinalRecords.map(r => r.vendor_name).filter(Boolean)));
  for (const vName of distinctVendors) {
    await vendorsColl.updateOne(
      { name: vName },
      {
        $setOnInsert: {
          code: `VND-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          name: vName,
          category: 'Fuel',
          department_id: 'PM',
          is_active: true,
          created_at: new Date()
        }
      },
      { upsert: true }
    );
  }

  await closeDB();
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
