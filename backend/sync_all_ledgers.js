const ExcelJS = require('exceljs');
const path = require('path');
const { connectDB, getCollection } = require('./src/db/mongoClient');
require('dotenv').config({ path: path.join(__dirname, '.env') });

function getVal(c) {
  if (!c) return 0;
  const v = c.value;
  if (!v) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && v.result !== undefined) return Number(v.result) || 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function normalizeCostCenter(tabName) {
  const t = tabName.trim();
  const lower = t.toLowerCase();
  if (lower.includes('ghattaprabha')) return 'Ghattaprabha';
  if (lower.includes('ankalgi') || lower.includes('ankaligi')) return 'Ankalgi';
  if (lower.includes('gokak')) return 'Gokak';
  if (lower.startsWith('khammam')) return 'Khammam';
  if (lower.startsWith('jedcherla') || lower.startsWith('jadcherla') || lower.startsWith('jedcharla') || lower.startsWith('jadcharla')) return 'Jadcherla';
  if (lower.startsWith('yg gudda') || lower.startsWith('yg-gudda')) return 'YG Gudda';
  if (lower.startsWith('hosadurga')) return 'Hosadurga';
  if (lower.startsWith('devarakhadra') || lower.startsWith('devarkhadra')) return 'Devarakhadra';
  if (lower.startsWith('sangareddy') || lower.startsWith('sanga reddy') || lower.startsWith('sangareeddy')) return 'Sangareddy';
  if (lower.startsWith('chellakere')) return 'Chellakere';
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
  if (lower.startsWith('jalgaon') || lower.startsWith('jalgoan')) return 'Jalgaon';
  if (lower.startsWith('mkbd')) return 'MKBD';
  if (lower.startsWith('srirangapatna')) return 'Srirangapatna';
  if (lower.startsWith('dindi')) return 'Dindi';
  if (lower.startsWith('amalapuram')) return 'Amalapuram';
  if (lower.startsWith('madana') || lower.startsWith('madanapalli')) return 'Madanapalli';
  if (lower.startsWith('chennagiri')) return 'Chennagiri';
  if (lower.startsWith('kakinada')) return 'Kakinada';
  if (lower.startsWith('ho(dg)') || lower.startsWith('ho (dg)')) return 'HO(DG)';
  if (lower.startsWith('narayan') || lower.startsWith('narayankhed')) return 'NarayanKhed';
  if (lower.startsWith('hukkere')) return 'Hukkere';
  if (lower.startsWith('shedbal')) return 'Shedbal';
  if (lower.startsWith('yeleshwaram')) return 'Yeleshwaram';
  if (lower.startsWith('pitapuam') || lower.startsWith('pitapram')) return 'Pitapuam';
  if (lower.startsWith('kovvur')) return 'Kovvur';
  if (lower.startsWith('jangareddygudem')) return 'Jangareddygudem';
  return tabName.trim();
}

const yearFiles = [
  {
    year: 2025,
    dir: path.join(__dirname, 'data', '2025'),
    months: [
      { m: 1, file: "Fuel Ledgers' January25 - All Projects.xlsx", sheetName: " jan-25" },
      { m: 2, file: "Fuel Ledgers' Feb25 - All Projects.xlsx", sheetName: "Feb-25" },
      { m: 3, file: "Fuel Ledgers' March25 - All Projects.xlsx", sheetName: "March-25" },
      { m: 4, file: "Fuel Ledgers' April 25 - All Projects.xlsx", sheetName: "April-25" },
      { m: 5, file: "Fuel Ledgers' May 25 - All Projects.xlsx", sheetName: " May -2025 revised" },
      { m: 6, file: "Fuel Ledgers' June 25 - All Projects.xlsx", sheetName: "June-25" },
      { m: 7, file: "Fuel Ledgers' July25 - All Projects.xlsx", sheetName: "July-25" },
      { m: 8, file: "Fuel Ledgers' Agust-25 - All Projects.xlsx", sheetName: " Aug-25 " },
      { m: 9, file: "Fuel Ledgers' Sep-25 - All Projects.xlsx", sheetName: "Sep-25 " },
      { m: 10, file: "Fuel Ledgers' Oct-25 - All Projects.xlsx", sheetName: "Oct-25 " },
      { m: 11, file: "Fuel Ledgers' Nov-25 - All Projects.xlsx", sheetName: "Nov-25 " },
      { m: 12, file: "Fuel Ledgers' Dec-25 - All Projects.xlsx", sheetName: "Dec-25 " }
    ]
  },
  {
    year: 2026,
    dir: path.join(__dirname, 'data', '2026'),
    months: [
      { m: 1, file: "Fuel Ledgers' Jan-26 - All Projects.xlsx", sheetName: "Jan-26" },
      { m: 2, file: "Fuel Ledgers' Feb-26 - All Projects.xlsx", sheetName: "Feb-2026" },
      { m: 3, file: "Fuel Ledgers' March-26 - All Projects.xlsx", sheetName: "March-2026" },
      { m: 4, file: "Fuel Ledgers' April-26 - All Projects.xlsx", sheetName: " April-2026" },
      { m: 5, file: "Fuel Ledgers' May-26 - All Projects.xlsx", sheetName: " May-2026" },
      { m: 6, file: "Fuel Ledgers' June-26 - All Projects.xlsx", sheetName: "June-2026" },
      { m: 7, file: "Fuel Ledgers' July-26 - All Projects.xlsx", sheetName: " July-26" },
      { m: 8, file: "Fuel Ledgers' Aug-26 - All Projects.xlsx", sheetName: " Aug-26" },
      { m: 9, file: "Fuel Ledgers' Sep-26 - All Projects.xlsx", sheetName: " Sep-26" },
      { m: 10, file: "Fuel Ledgers' Oct-26 - All Projects.xlsx", sheetName: "OCT-26" }
    ]
  }
];

async function syncAllLedgers() {
  await connectDB();
  const recordsColl = getCollection('monthly_report_records');
  const locsColl = getCollection('project_locations');
  const vendorsColl = getCollection('vendors');

  await locsColl.updateOne(
    { code: 'LOC-0008' },
    { $set: { name: 'Dharwad(PKG-3)', project_name: 'Ghattaprabha', category: 'Ghattaprabha', updated_at: new Date() } }
  );
  await locsColl.updateOne(
    { code: 'LOC-0026' },
    { $set: { name: 'Dharwad(PKG-3)', project_name: 'Ankalgi', category: 'Ankalgi', updated_at: new Date() } }
  );
  await locsColl.updateOne(
    { code: 'LOC-0030' },
    { $set: { name: 'Dharwad(PKG-3)', project_name: 'Gokak', category: 'Gokak', updated_at: new Date() } }
  );

  const locDocs = await locsColl.find().toArray();
  const locMap = new Map();
  locDocs.forEach(l => {
    locMap.set(l.name.toLowerCase().trim(), l);
    if (l.code) locMap.set(l.code.toLowerCase().trim(), l);
    if (l.id) locMap.set(String(l.id).toLowerCase().trim(), l);
  });

  const allRecords = [];
  const discoveredVendors = new Set();
  const summaryPerYear = {};

  for (const yConfig of yearFiles) {
    const yr = yConfig.year;
    summaryPerYear[yr] = { totalPaid: 0, count: 0, months: {} };

    for (const item of yConfig.months) {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.readFile(path.join(yConfig.dir, item.file));
      let sSheet = wb.getWorksheet(item.sheetName) || wb.worksheets.find(w => w.name.trim().toLowerCase() === item.sheetName.trim().toLowerCase());
      if (!sSheet) {
        throw new Error(`Sheet ${item.sheetName} not found in ${item.file}`);
      }

      let headerRow = 1;
      let locCol = -1, bunkCol = -1;
      let dQtyCol = -1, dAmtCol = -1;
      let pQtyCol = -1, pAmtCol = -1;
      let totalAmtCol = -1, opCol = -1, paidCol = -1, clCol = -1;

      for (let r = 1; r <= 4; r++) {
        const row = sSheet.getRow(r);
        for (let c = 1; c <= 20; c++) {
          const val = String(row.getCell(c).value || '').trim().toLowerCase();
          if ((val.includes('site') || val.includes('location')) && !val.includes('bunk')) locCol = c;
          if (val.includes('bunk') || val.includes('dealer') || val.includes('vendor')) bunkCol = c;
          if (val.includes('diesel') && (val.includes('liter') || val.includes('qty'))) dQtyCol = c;
          if (val.includes('diesel') && val.includes('amount')) dAmtCol = c;
          if (val.includes('petrol') && (val.includes('liter') || val.includes('qty'))) pQtyCol = c;
          if (val.includes('petrol') && val.includes('amount')) pAmtCol = c;
          if (val.includes('total') && (val.includes('amount') || val.includes('cost'))) totalAmtCol = c;
          if (val.includes('opening')) opCol = c;
          if (val.includes('paid') || val.includes('payment')) paidCol = c;
          if (val.includes('closing')) clCol = c;
        }
        if (paidCol !== -1 && clCol !== -1 && locCol !== -1) {
          headerRow = r;
          break;
        }
      }

      let totalRow = -1;
      for (let r = headerRow + 1; r <= sSheet.rowCount; r++) {
        const c1 = String(sSheet.getRow(r).getCell(1).value || '').trim().toLowerCase();
        const c2 = String(sSheet.getRow(r).getCell(locCol).value || '').trim().toLowerCase();
        if (c1.includes('total') || c2.includes('total') || c1.includes('grand') || c2.includes('grand')) {
          totalRow = r;
          break;
        }
      }

      let mPaid = 0;
      let mRecords = 0;
      for (let r = headerRow + 1; r < totalRow; r++) {
        const row = sSheet.getRow(r);
        const siteRaw = String(row.getCell(locCol).value || '').trim();
        const bunkRaw = bunkCol !== -1 ? String(row.getCell(bunkCol).value || '').trim() : '';
        if (!siteRaw) continue;

        const normSite = normalizeCostCenter(siteRaw);
        const lowerNorm = normSite.toLowerCase();
        const isDharwadSite = lowerNorm === 'ghattaprabha' || lowerNorm === 'ankalgi' || lowerNorm === 'gokak' || lowerNorm.includes('dharwad');

        let divisionName = normSite;
        let pName = '-';
        let assignedLocCode = 'LOC-0001';

        if (isDharwadSite) {
          divisionName = 'Dharwad(PKG-3)';
          if (lowerNorm === 'ghattaprabha') {
            pName = 'Ghattaprabha';
            assignedLocCode = 'LOC-0008';
          } else if (lowerNorm === 'ankalgi') {
            pName = 'Ankalgi';
            assignedLocCode = 'LOC-0026';
          } else {
            pName = 'Gokak';
            assignedLocCode = 'LOC-0030';
          }
        } else {
          const matched = locMap.get(normSite.toLowerCase());
          if (matched) {
            divisionName = matched.name;
            assignedLocCode = matched.code || matched.id;
            pName = (matched.project_name && matched.project_name !== 'Project Site') ? matched.project_name : ((matched.category && matched.category !== 'Project Site') ? matched.category : '-');
          }
        }

        const bunkName = bunkRaw || `${normSite} Fuel Bunk`;
        discoveredVendors.add(bunkName);

        const dQty = dQtyCol !== -1 ? getVal(row.getCell(dQtyCol)) : 0;
        const dAmt = dAmtCol !== -1 ? getVal(row.getCell(dAmtCol)) : 0;
        const pQty = pQtyCol !== -1 ? getVal(row.getCell(pQtyCol)) : 0;
        const pAmt = pAmtCol !== -1 ? getVal(row.getCell(pAmtCol)) : 0;
        const totalCost = totalAmtCol !== -1 ? getVal(row.getCell(totalAmtCol)) : (dAmt + pAmt);
        const opBal = opCol !== -1 ? getVal(row.getCell(opCol)) : 0;
        const paid = paidCol !== -1 ? getVal(row.getCell(paidCol)) : 0;
        const clBal = clCol !== -1 ? getVal(row.getCell(clCol)) : (opBal + totalCost - paid);

        mPaid += paid;
        mRecords++;

        const dateStr = `${yr}-${String(item.m).padStart(2, '0')}-15`;
        const q = item.m <= 3 ? 'Q4' : (item.m <= 6 ? 'Q1' : (item.m <= 9 ? 'Q2' : 'Q3'));
        const fuelType = (dQty > 0 && pQty > 0) ? 'Both (Diesel & Petrol)' : (dQty > 0 ? 'Diesel' : (pQty > 0 ? 'Petrol' : 'Diesel'));
        const isCash = (paid > 0 && (dQty + pQty) <= 0);

        const recDoc = {
          report_type_id: 'FUEL_PURCHASE',
          report_type_name: 'Fuel Purchase Log',
          category: 'Fuel',
          department_id: 'PM',
          department_name: 'Plant & Machinery',
          reporting_year: yr,
          reporting_month: item.m,
          reporting_quarter: q,
          report_date: dateStr,
          location_id: assignedLocCode,
          location_code: assignedLocCode,
          location_name: divisionName,
          project_division: divisionName,
          project_name: pName,
          site_name: siteRaw,
          vendor_name: bunkName,
          ledger_type: bunkName,
          opening_balance: Number(opBal.toFixed(2)),
          diesel_quantity: Number(dQty.toFixed(2)),
          diesel_rate: dQty > 0 ? Number((dAmt / dQty).toFixed(2)) : 0,
          diesel_total_cost: Number(dAmt.toFixed(2)),
          petrol_quantity: Number(pQty.toFixed(2)),
          petrol_rate: pQty > 0 ? Number((pAmt / pQty).toFixed(2)) : 0,
          petrol_total_cost: Number(pAmt.toFixed(2)),
          quantity: Number((dQty + pQty).toFixed(2)),
          fuel_consumed_litres: Number((dQty + pQty).toFixed(2)),
          rate: (dQty + pQty) > 0 ? Number((totalCost / (dQty + pQty)).toFixed(2)) : 0,
          total_cost: Number(totalCost.toFixed(2)),
          paid_amount: Number(paid.toFixed(2)),
          amount: Number(paid.toFixed(2)),
          balance: Number(clBal.toFixed(2)),
          balance_amount: Number(clBal.toFixed(2)),
          closing_balance: Number(clBal.toFixed(2)),
          payment_type: isCash ? 'Cash & Carry' : 'Regular',
          cash_and_carry: isCash ? 'Yes' : 'No',
          remarks: `${siteRaw} - ${bunkName}`,
          status: 'Approved',
          version: 1,
          is_latest: true,
          source: 'official_fuel_ledger',
          created_by: 'mis@civetprojects.com',
          created_at: new Date(),
          updated_at: new Date(),
          data: {
            site_name: siteRaw,
            location: divisionName,
            location_id: assignedLocCode,
            location_name: divisionName,
            project_division: divisionName,
            project_name: pName,
            vendor_name: bunkName,
            ledger_type: bunkName,
            department: 'Plant & Machinery',
            department_beneficiary: 'Plant & Machinery',
            fuel_type: fuelType,
            report_date: dateStr,
            quantity: Number((dQty + pQty).toFixed(2)),
            rate: (dQty + pQty) > 0 ? Number((totalCost / (dQty + pQty)).toFixed(2)) : 0,
            diesel_quantity: Number(dQty.toFixed(2)),
            diesel_rate: dQty > 0 ? Number((dAmt / dQty).toFixed(2)) : 0,
            diesel_total_cost: Number(dAmt.toFixed(2)),
            petrol_quantity: Number(pQty.toFixed(2)),
            petrol_rate: pQty > 0 ? Number((pAmt / pQty).toFixed(2)) : 0,
            petrol_total_cost: Number(pAmt.toFixed(2)),
            total_cost: Number(totalCost.toFixed(2)),
            paid_amount: Number(paid.toFixed(2)),
            amount: Number(paid.toFixed(2)),
            opening_balance: Number(opBal.toFixed(2)),
            balance: Number(clBal.toFixed(2)),
            closing_balance: Number(clBal.toFixed(2)),
            balance_amount: Number(clBal.toFixed(2)),
            payment_type: isCash ? 'Cash & Carry' : 'Regular',
            cash_and_carry: isCash ? 'Yes' : 'No',
            remarks: `${siteRaw} - ${bunkName}`
          }
        };

        allRecords.push(recDoc);
      }
      summaryPerYear[yr].totalPaid += mPaid;
      summaryPerYear[yr].count += mRecords;
      summaryPerYear[yr].months[item.m] = { paid: mPaid, records: mRecords };
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

  const batchSize = 100;
  for (let i = 0; i < allRecords.length; i += batchSize) {
    const chunk = allRecords.slice(i, i + batchSize);
    await recordsColl.insertMany(chunk);
  }

  console.log('--- SYNC RESULTS ---');
  for (const yr of [2025, 2026]) {
    const s = summaryPerYear[yr];
    console.log(`Year ${yr}: ${s.count} records, Total Paid: Rs. ${s.totalPaid.toFixed(2)}`);
    for (const [m, mData] of Object.entries(s.months)) {
      console.log(`  M${m}: ${mData.records} records, Paid: Rs. ${Math.round(mData.paid)}`);
    }
  }

  await clientClose();
}

async function clientClose() {
  process.exit(0);
}

syncAllLedgers().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
