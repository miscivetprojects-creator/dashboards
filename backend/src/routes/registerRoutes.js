const express = require('express');
const ExcelJS = require('exceljs');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');
const { getCollection } = require('../db/mongoClient');
const pdfService = require('../services/pdfService');
const router = express.Router();
router.use(authMiddleware);

function buildRegisterQuery(params = {}, user = {}) {
  const query = { is_latest: { $ne: false } };
  const {
    status = 'All',
    reportType = 'All',
    department = 'All',
    location = 'All',
    year = 'All',
    quarter = 'All',
    month = 'All',
    search = ''
  } = params;

  if (status && status !== 'All') {
    query.status = status;
  }

  if (reportType && reportType !== 'All') {
    const rtUpper = String(reportType).trim().toUpperCase();
    const rtMap = {
      'FUEL_PURCHASE': ['FUEL_PURCHASE', 'Fuel Management', 'Fuel Purchase'],
      'FUEL MANAGEMENT': ['FUEL_PURCHASE', 'Fuel Management', 'Fuel Purchase'],
      'STORES_PURCHASE': ['STORES_PURCHASE', 'Material Purchase', 'Stores Purchase', 'Stores & Materials'],
      'MATERIAL PURCHASE': ['STORES_PURCHASE', 'Material Purchase', 'Stores Purchase', 'Stores & Materials'],
      'ACCOUNTS_PAYMENT': ['ACCOUNTS_PAYMENT', 'Ledger Payments', 'Accounts Payment'],
      'LEDGER PAYMENTS': ['ACCOUNTS_PAYMENT', 'Ledger Payments', 'Accounts Payment'],
      'ADMIN_EXPENSE': ['ADMIN_EXPENSE', 'Admin Expenditure', 'Admin Expense'],
      'ADMIN EXPENDITURE': ['ADMIN_EXPENSE', 'Admin Expenditure', 'Admin Expense'],
      'VEHICLE_UTILIZATION': ['VEHICLE_UTILIZATION', 'Vehicle Utilization'],
      'PLANNING_PROGRESS': ['PLANNING_PROGRESS', 'Monthly Project Progress', 'Project Progress']
    };
    const aliases = rtMap[rtUpper] || [reportType, reportType.toUpperCase()];
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { report_type_id: { $in: aliases } },
        { 'data.report_type': { $in: aliases } }
      ]
    });
  }

  let effDept = department;
  if (user && user.role !== 'Director' && user.role !== 'Admin' && user.department && user.department !== 'All') {
    effDept = user.department;
  }
  if (effDept && effDept !== 'All') {
    const dUpper = String(effDept).trim().toUpperCase();
    const pmAliases = ['PM', 'P&M', 'PLANT & MACHINERY', 'PLANT AND MACHINERY', 'DPT-0002', 'FUEL'];
    const storesAliases = ['STORES', 'MMS', 'STORES & INVENTORY', 'STORES AND INVENTORY', 'DPT-0003'];
    const accountsAliases = ['ACCOUNTS', 'FINANCE', 'ACCOUNTS & FINANCE', 'ACCOUNTS AND FINANCE'];
    const adminAliases = ['ADMIN', 'ADMINISTRATION', 'DPT-0004'];
    const itAliases = ['IT', 'MIS', 'IT & MIS', 'IT&MIS', 'DPT-0001'];

    let aliases = [effDept, dUpper];
    if (pmAliases.includes(dUpper)) aliases = ['PM', 'P&M', 'Plant & Machinery', 'Plant and Machinery', 'DPT-0002', 'FUEL'];
    else if (storesAliases.includes(dUpper)) aliases = ['STORES', 'MMS', 'Stores', 'Stores & Inventory', 'Stores and Inventory', 'DPT-0003'];
    else if (accountsAliases.includes(dUpper)) aliases = ['ACCOUNTS', 'Finance', 'Accounts & Finance', 'Accounts and Finance'];
    else if (adminAliases.includes(dUpper)) aliases = ['ADMIN', 'Admin', 'Administration', 'DPT-0004'];
    else if (itAliases.includes(dUpper)) aliases = ['IT', 'MIS', 'IT & MIS', 'IT&MIS', 'DPT-0001'];

    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { department_id: { $in: aliases } },
        { department_name: { $in: aliases } },
        { 'data.department': { $in: aliases } },
        { 'data.department_beneficiary': { $in: aliases } }
      ]
    });
  }

  if (location && location !== 'All') {
    const locClean = String(location).trim();
    const locRegex = new RegExp(`^${locClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { location_id: locClean },
        { location_id: locRegex },
        { location_name: locClean },
        { location_name: locRegex },
        { project_division: locClean },
        { project_division: locRegex },
        { 'data.location': locClean },
        { 'data.project_division': locClean },
        { 'data.location_id': locClean },
        { 'data.location_name': locClean }
      ]
    });
  }

  if (year && year !== 'All') {
    query.reporting_year = Number(year);
  }
  if (quarter && quarter !== 'All') {
    query.reporting_quarter = quarter;
  }
  if (month && month !== 'All') {
    query.reporting_month = Number(month);
  }

  if (search && search.trim() !== '') {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { created_by: searchRegex },
        { location_id: searchRegex },
        { location_name: searchRegex },
        { department_id: searchRegex },
        { department_name: searchRegex },
        { report_type_id: searchRegex },
        { vendor_name: searchRegex },
        { fuel_type: searchRegex },
        { 'data.fuel_type': searchRegex }
      ]
    });
  }

  return query;
}

router.get('/records', async (req, res) => {
  try {
    const recordsColl = getCollection('monthly_report_records');
    const { page = 1, limit = 25 } = req.query;
    const query = buildRegisterQuery(req.query, req.user);
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalCount = await recordsColl.countDocuments(query);
    const records = await recordsColl
      .find(query)
      .sort({ report_date: -1, created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();
    res.json({
      records,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get('/record/:id', async (req, res) => {
  try {
    const recordsColl = getCollection('monthly_report_records');
    const id = req.params.id;
    let query;
    try {
      const { ObjectId } = require('mongodb');
      query = { _id: new ObjectId(id) };
    } catch {
      query = { _id: id };
    }
    let record = await recordsColl.findOne(query);
    if (!record) {
      record = await recordsColl.findOne({ _id: id });
    }
    if (!record) {
      return res.status(404).json({ error: 'Record not found.' });
    }
    const schemasColl = getCollection('report_schemas');
    const schemaDoc = await schemasColl.findOne({
      $or: [{ report_type_id: record.report_type_id }, { reportType: record.report_type_id }]
    });
    res.json({
      record,
      schema: schemaDoc
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.post('/record/:id/revise', async (req, res) => {
  try {
    const recordsColl = getCollection('monthly_report_records');
    const id = req.params.id;
    const { updatedData, changeReason } = req.body;
    if (!changeReason || changeReason.trim().length < 8) {
      return res.status(400).json({
        error: 'Mandatory change reason is required (minimum 8 characters) explaining why this revision is being made.'
      });
    }
    if (!updatedData || typeof updatedData !== 'object') {
      return res.status(400).json({ error: 'Updated record data is required.' });
    }
    let query;
    try {
      const { ObjectId } = require('mongodb');
      query = { _id: new ObjectId(id) };
    } catch {
      query = { _id: id };
    }
    let existing = await recordsColl.findOne(query);
    if (!existing) {
      existing = await recordsColl.findOne({ _id: id });
    }
    if (!existing) {
      return res.status(404).json({ error: 'Record not found.' });
    }
    if (req.user.role !== 'Director' && req.user.role !== 'Admin') {
      if (req.user.department && req.user.department !== 'All' && req.user.department !== existing.department_id) {
        return res.status(403).json({ error: 'You are not authorized to modify records of another department.' });
      }
    }
    const newVersion = (existing.version || 1) + 1;
    const historyEntry = {
      version: newVersion,
      modified_by: req.user.email,
      modified_at: new Date(),
      change_reason: changeReason.trim(),
      previous_data: existing.data,
      new_data: updatedData
    };
    let resolvedLocId = existing.location_id;
    let resolvedLocName = existing.location_name;
    const targetLoc = updatedData.project_division || updatedData.location || updatedData.location_id || updatedData.location_name;
    if (targetLoc) {
      const locColl = getCollection('project_locations');
      const safeLoc = String(targetLoc).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const foundLoc = await locColl.findOne({
        $or: [
          { name: new RegExp('^' + safeLoc + '$', 'i') },
          { code: new RegExp('^' + safeLoc + '$', 'i') },
          { id: new RegExp('^' + safeLoc + '$', 'i') }
        ]
      });
      if (foundLoc) {
        resolvedLocId = foundLoc.code || foundLoc.id;
        resolvedLocName = foundLoc.name;
      } else {
        resolvedLocName = targetLoc;
        resolvedLocId = targetLoc;
      }
    }
    updatedData.project_division = resolvedLocName;
    updatedData.project_division_id = resolvedLocId;
    updatedData.location = resolvedLocName;
    updatedData.location_id = resolvedLocId;
    updatedData.project_name = updatedData.project_name || updatedData.site_name || existing.project_name || existing.site_name || '';
    const isBothFuel = String(updatedData.fuel_type || existing.fuel_type || (existing.data && existing.data.fuel_type) || '').toLowerCase().includes('both');
    let pQ = Number(updatedData.petrol_quantity || (existing.data && existing.data.petrol_quantity) || existing.petrol_quantity || 0);
    let pR = Number(updatedData.petrol_rate || (existing.data && existing.data.petrol_rate) || existing.petrol_rate || 0);
    let dQ = Number(updatedData.diesel_quantity || (existing.data && existing.data.diesel_quantity) || existing.diesel_quantity || 0);
    let dR = Number(updatedData.diesel_rate || (existing.data && existing.data.diesel_rate) || existing.diesel_rate || 0);
    let pCost = Number((pQ * pR).toFixed(2));
    let dCost = Number((dQ * dR).toFixed(2));
    let combinedCost = Number((pCost + dCost).toFixed(2));
    let combinedQty = Number((pQ + dQ).toFixed(2));

    const updatedQty = isBothFuel && combinedQty > 0 ? combinedQty : Number(updatedData.quantity || updatedData.fuel_consumed_litres || existing.fuel_consumed_litres || 0);
    const updatedRate = isBothFuel ? (updatedQty > 0 ? Number((combinedCost / updatedQty).toFixed(2)) : 0) : Number(updatedData.rate || updatedData.unit_cost || 0);
    let updatedPaidAmt = Number(updatedData.paid_amount || updatedData.total_cost || (isBothFuel ? combinedCost : 0) || 0);
    if ((!updatedPaidAmt || updatedPaidAmt === 0) && updatedQty > 0 && updatedRate > 0) {
      updatedPaidAmt = Number((updatedQty * updatedRate).toFixed(2));
      updatedData.paid_amount = updatedPaidAmt;
      updatedData.total_cost = updatedPaidAmt;
    }
    if (isBothFuel) {
      updatedData.petrol_quantity = pQ;
      updatedData.petrol_rate = pR;
      updatedData.petrol_total_cost = pCost;
      updatedData.diesel_quantity = dQ;
      updatedData.diesel_rate = dR;
      updatedData.diesel_total_cost = dCost;
      updatedData.quantity = updatedQty;
      updatedData.paid_amount = updatedPaidAmt;
      updatedData.total_cost = updatedPaidAmt;
    }
    const updatedVendor = updatedData.vendor_name || updatedData.ledger_type || updatedData.vendor || existing.vendor_name || '';
    const finalReviseAmt = updatedPaidAmt > 0 ? updatedPaidAmt : Number(existing.paid_amount || 0);
    const finalReviseQty = updatedQty > 0 ? updatedQty : Number(existing.fuel_consumed_litres || existing.quantity || 0);
    const finalReviseRate = updatedRate > 0 ? updatedRate : Number(existing.rate || (existing.data && existing.data.rate) || 0);
    const isReviseZeroQty = finalReviseAmt > 0 && (finalReviseQty <= 0 || finalReviseRate <= 0);
    let resolvedRevisePType = updatedData.payment_type || existing.payment_type || '';
    if (isReviseZeroQty) {
      resolvedRevisePType = 'Cash & Carry';
      updatedData.payment_type = 'Cash & Carry';
      updatedData.cash_and_carry = finalReviseAmt;
    }

    const updateDoc = {
      $set: {
        data: updatedData,
        fuel_type: updatedData.fuel_type || existing.fuel_type || '',
        payment_type: resolvedRevisePType,
        cash_and_carry: isReviseZeroQty ? finalReviseAmt : (updatedData.cash_and_carry || existing.cash_and_carry || ''),
        petrol_quantity: pQ,
        petrol_rate: pR,
        petrol_total_cost: pCost,
        diesel_quantity: dQ,
        diesel_rate: dR,
        diesel_total_cost: dCost,
        report_date: updatedData.date || updatedData.report_date || existing.report_date,
        location_id: resolvedLocId,
        location_name: resolvedLocName,
        paid_amount: updatedPaidAmt > 0 ? updatedPaidAmt : existing.paid_amount,
        fuel_consumed_litres: updatedQty > 0 ? updatedQty : existing.fuel_consumed_litres,
        vendor_name: updatedVendor || existing.vendor_name,
        ledger_type: updatedVendor || existing.ledger_type,
        version: newVersion,
        updated_at: new Date(),
        last_modified_by: req.user.email
      },
      $push: {
        history: historyEntry
      }
    };
    await recordsColl.updateOne({ _id: existing._id }, updateDoc);
    const updatedRecord = await recordsColl.findOne({ _id: existing._id });
    res.json({
      success: true,
      message: `Record successfully revised to Version ${newVersion}.`,
      record: updatedRecord
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function formatDateDDMMYYYY(val) {
  if (!val) return '';
  if (val instanceof Date) {
    const d = String(val.getDate()).padStart(2, '0');
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const y = val.getFullYear();
    return `${d}/${m}/${y}`;
  }
  const s = String(val).trim();
  const dateMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (dateMatch) {
    const y = dateMatch[1];
    const m = dateMatch[2].padStart(2, '0');
    const d = dateMatch[3].padStart(2, '0');
    return `${d}/${m}/${y}`;
  }
  const dObj = new Date(s);
  if (!isNaN(dObj.getTime())) {
    const d = String(dObj.getDate()).padStart(2, '0');
    const m = String(dObj.getMonth() + 1).padStart(2, '0');
    const y = dObj.getFullYear();
    return `${d}/${m}/${y}`;
  }
  return s;
}

function cleanStr(val) {
  return String(val || '').replace(/[\t\r\n]+/g, ' ').trim();
}

const blackBorder = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } }
};

router.get('/export/excel', async (req, res) => {
  try {
    const recordsColl = getCollection('monthly_report_records');
    const query = buildRegisterQuery(req.query, req.user);

    const records = await recordsColl
      .find(query)
      .sort({ report_date: -1 })
      .limit(3000)
      .toArray();

    const reportTypeRaw = String(req.query.reportType || req.query.report_type || records[0]?.report_type_id || 'FUEL_PURCHASE').trim();
    const reportTypeLabels = {
      'FUEL_PURCHASE': 'Fuel Purchase Log',
      'VEHICLE_UTILIZATION': 'Vehicle & Machinery Utilization Log',
      'STORES_PURCHASE': 'Stores & Materials Purchase Log',
      'ADMIN_EXPENSE': 'Administration Expense Log',
      'ACCOUNTS_PAYMENT': 'Accounts & Financial Disbursements'
    };
    const reportTypeName = reportTypeLabels[reportTypeRaw] || reportTypeRaw;
    const deptName = req.query.department && req.query.department !== 'All' ? req.query.department : 'Plant & Machinery';
    const locName = req.query.location && req.query.location !== 'All' ? req.query.location : 'All Project Divisions';

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('MIS Report');

    worksheet.mergeCells('A1:O1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'CIVET PROJECTS PRIVATE LIMITED — MANAGEMENT MIS REPORT';
    titleCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F2A4A' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 32;

    for (let col = 1; col <= 15; col++) {
      worksheet.getRow(1).getCell(col).border = blackBorder;
    }

    worksheet.mergeCells('A2:O2');
    const headerParaCell = worksheet.getCell('A2');
    headerParaCell.value = `Report Type: ${reportTypeName}   |   Department: ${deptName}   |   Project Division: ${locName}   |   Generated: ${formatDateDDMMYYYY(new Date())}   |   Total Entries: ${records.length}`;
    headerParaCell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF0F2A4A' } };
    headerParaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    headerParaCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(2).height = 24;

    for (let col = 1; col <= 15; col++) {
      worksheet.getRow(2).getCell(col).border = blackBorder;
    }

    const headers = [
      'Date',
      'Department',
      'Project Division',
      'Ledger / Vendor',
      'Opening Bal (Rs.)',
      'Diesel Qty (Ltrs)',
      'Diesel Rate (Rs.)',
      'Diesel Amt (Rs.)',
      'Petrol Qty (Ltrs)',
      'Petrol Rate (Rs.)',
      'Petrol Amt (Rs.)',
      'Total Cost (Rs.)',
      'Amount Paid (Rs.)',
      'Closing Bal (Rs.)',
      'Payment Type'
    ];

    const headerRow = worksheet.getRow(3);
    headerRow.values = headers;
    headerRow.height = 24;
    headerRow.eachCell(c => {
      c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F6FEB' } };
      c.alignment = { vertical: 'middle', horizontal: 'center' };
      c.border = blackBorder;
    });

    let sumOp = 0, sumDQty = 0, sumDAmt = 0, sumPQty = 0, sumPAmt = 0, sumTotalCost = 0, sumPaid = 0, sumClosing = 0;

    records.forEach((rec, idx) => {
      const data = rec.data || {};
      const ledger = cleanStr(data.ledger_type || data.vendor_name || data.vendor || rec.ledger_type || rec.vendor_name || '-');
      const opBal = Number(rec.opening_balance ?? data.opening_balance ?? 0);
      const dQty = Number(rec.diesel_quantity ?? data.diesel_quantity ?? (rec.fuel_type === 'Diesel' ? rec.quantity : 0) ?? 0);
      const dRate = Number(rec.diesel_rate ?? data.diesel_rate ?? 0);
      const dAmt = Number(rec.diesel_total_cost ?? data.diesel_total_cost ?? (dQty > 0 && dRate > 0 ? dQty * dRate : 0) ?? 0);
      const pQty = Number(rec.petrol_quantity ?? data.petrol_quantity ?? (rec.fuel_type === 'Petrol' ? rec.quantity : 0) ?? 0);
      const pRate = Number(rec.petrol_rate ?? data.petrol_rate ?? 0);
      const pAmt = Number(rec.petrol_total_cost ?? data.petrol_total_cost ?? (pQty > 0 && pRate > 0 ? pQty * pRate : 0) ?? 0);
      const totalCost = Number(rec.total_cost ?? data.total_cost ?? (dAmt + pAmt) ?? 0);
      const paid = Number(rec.paid_amount ?? data.paid_amount ?? rec.amount ?? 0);
      const clBal = Number(rec.closing_balance ?? rec.balance ?? data.closing_balance ?? Math.max(0, opBal + totalCost - paid));
      const payType = cleanStr(rec.payment_type || data.payment_type || (paid > 0 && (dQty + pQty) <= 0 ? 'Cash & Carry' : 'Regular'));

      sumOp += opBal;
      sumDQty += dQty;
      sumDAmt += dAmt;
      sumPQty += pQty;
      sumPAmt += pAmt;
      sumTotalCost += totalCost;
      sumPaid += paid;
      sumClosing += clBal;

      const row = worksheet.getRow(idx + 4);
      row.values = [
        formatDateDDMMYYYY(rec.report_date),
        cleanStr(rec.department_name || rec.department_id || 'Plant & Machinery'),
        cleanStr(rec.location_name || rec.location_id),
        ledger,
        opBal,
        dQty,
        dRate > 0 ? dRate : (dQty > 0 && dAmt > 0 ? Number((dAmt / dQty).toFixed(2)) : 0),
        dAmt,
        pQty,
        pRate > 0 ? pRate : (pQty > 0 && pAmt > 0 ? Number((pAmt / pQty).toFixed(2)) : 0),
        pAmt,
        totalCost,
        paid,
        clBal,
        payType
      ];

      row.height = 20;
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF000000' } };
        cell.border = blackBorder;
        if (colNumber === 1 || colNumber === 15) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else if ([5, 6, 7, 8, 9, 10, 11, 12, 13, 14].includes(colNumber)) {
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
          cell.numFmt = '#,##0.00';
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }
      });
    });

    const summaryRow = worksheet.getRow(records.length + 4);
    summaryRow.values = [
      'TOTAL',
      '',
      '',
      '',
      sumOp,
      sumDQty,
      '',
      sumDAmt,
      sumPQty,
      '',
      sumPAmt,
      sumTotalCost,
      sumPaid,
      sumClosing,
      ''
    ];
    summaryRow.height = 22;
    summaryRow.eachCell((cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF0F2A4A' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      cell.border = blackBorder;
      if (colNumber === 1) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if ([5, 6, 8, 9, 11, 12, 13, 14].includes(colNumber)) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '#,##0.00';
      }
    });

    worksheet.columns = [
      { width: 13 },
      { width: 16 },
      { width: 20 },
      { width: 28 },
      { width: 16 },
      { width: 15 },
      { width: 13 },
      { width: 16 },
      { width: 15 },
      { width: 13 },
      { width: 16 },
      { width: 16 },
      { width: 16 },
      { width: 16 },
      { width: 14 }
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Civet_MIS_Report_${new Date().toISOString().split('T')[0]}.xlsx"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/export/pdf', async (req, res) => {
  try {
    const recordsColl = getCollection('monthly_report_records');
    const query = buildRegisterQuery(req.query, req.user);

    const records = await recordsColl
      .find(query)
      .sort({ report_date: -1 })
      .limit(1000)
      .toArray();

    const reportTypeRaw = String(req.query.reportType || req.query.report_type || records[0]?.report_type_id || 'FUEL_PURCHASE').trim();
    const reportTypeLabels = {
      'FUEL_PURCHASE': 'Fuel Purchase Log',
      'VEHICLE_UTILIZATION': 'Vehicle & Machinery Utilization Log',
      'STORES_PURCHASE': 'Stores & Materials Purchase Log',
      'ADMIN_EXPENSE': 'Administration Expense Log',
      'ACCOUNTS_PAYMENT': 'Accounts & Financial Disbursements'
    };
    const reportTypeName = reportTypeLabels[reportTypeRaw] || reportTypeRaw;
    const deptName = req.query.department && req.query.department !== 'All' ? req.query.department : 'Plant & Machinery';
    const locName = req.query.location && req.query.location !== 'All' ? req.query.location : 'All Project Divisions';

    const headers = [
      'Date',
      'Project Division',
      'Ledger / Vendor',
      'Opening Bal',
      'Diesel Qty',
      'Diesel Amt',
      'Petrol Qty',
      'Petrol Amt',
      'Total Cost',
      'Amount Paid',
      'Closing Bal',
      'Payment Type'
    ];

    let sumOp = 0, sumDQty = 0, sumDAmt = 0, sumPQty = 0, sumPAmt = 0, sumTotalCost = 0, sumPaid = 0, sumClosing = 0;

    const rows = records.map(rec => {
      const data = rec.data || {};
      const ledger = cleanStr(data.ledger_type || data.vendor_name || data.vendor || rec.ledger_type || rec.vendor_name || '-');
      const opBal = Number(rec.opening_balance ?? data.opening_balance ?? 0);
      const dQty = Number(rec.diesel_quantity ?? data.diesel_quantity ?? (rec.fuel_type === 'Diesel' ? rec.quantity : 0) ?? 0);
      const dAmt = Number(rec.diesel_total_cost ?? data.diesel_total_cost ?? 0);
      const pQty = Number(rec.petrol_quantity ?? data.petrol_quantity ?? (rec.fuel_type === 'Petrol' ? rec.quantity : 0) ?? 0);
      const pAmt = Number(rec.petrol_total_cost ?? data.petrol_total_cost ?? 0);
      const totalCost = Number(rec.total_cost ?? data.total_cost ?? (dAmt + pAmt) ?? 0);
      const paid = Number(rec.paid_amount ?? data.paid_amount ?? rec.amount ?? 0);
      const clBal = Number(rec.closing_balance ?? rec.balance ?? data.closing_balance ?? Math.max(0, opBal + totalCost - paid));
      const payType = cleanStr(rec.payment_type || data.payment_type || (paid > 0 && (dQty + pQty) <= 0 ? 'Cash & Carry' : 'Regular'));

      sumOp += opBal;
      sumDQty += dQty;
      sumDAmt += dAmt;
      sumPQty += pQty;
      sumPAmt += pAmt;
      sumTotalCost += totalCost;
      sumPaid += paid;
      sumClosing += clBal;

      return [
        formatDateDDMMYYYY(rec.report_date),
        cleanStr(rec.location_name || rec.location_id),
        ledger,
        opBal > 0 ? ('Rs. ' + Math.round(opBal).toLocaleString('en-IN')) : '-',
        dQty > 0 ? Math.round(dQty).toLocaleString('en-IN') : '-',
        dAmt > 0 ? ('Rs. ' + Math.round(dAmt).toLocaleString('en-IN')) : '-',
        pQty > 0 ? Math.round(pQty).toLocaleString('en-IN') : '-',
        pAmt > 0 ? ('Rs. ' + Math.round(pAmt).toLocaleString('en-IN')) : '-',
        totalCost > 0 ? ('Rs. ' + Math.round(totalCost).toLocaleString('en-IN')) : '-',
        paid > 0 ? ('Rs. ' + Math.round(paid).toLocaleString('en-IN')) : '-',
        clBal > 0 ? ('Rs. ' + Math.round(clBal).toLocaleString('en-IN')) : '-',
        payType
      ];
    });

    const summaryRow = [
      'FINAL TOTAL',
      '-',
      '-',
      sumOp > 0 ? ('Rs. ' + Math.round(sumOp).toLocaleString('en-IN')) : '-',
      sumDQty > 0 ? Math.round(sumDQty).toLocaleString('en-IN') : '0',
      sumDAmt > 0 ? ('Rs. ' + Math.round(sumDAmt).toLocaleString('en-IN')) : '0',
      sumPQty > 0 ? Math.round(sumPQty).toLocaleString('en-IN') : '0',
      sumPAmt > 0 ? ('Rs. ' + Math.round(sumPAmt).toLocaleString('en-IN')) : '0',
      'Rs. ' + Math.round(sumTotalCost).toLocaleString('en-IN'),
      'Rs. ' + Math.round(sumPaid).toLocaleString('en-IN'),
      sumClosing > 0 ? ('Rs. ' + Math.round(sumClosing).toLocaleString('en-IN')) : '0',
      '-'
    ];

    const pdfBuffer = await pdfService.generateTablePdf({
      title: 'MANAGEMENT MIS REPORT',
      subtitle: `Report Type: ${reportTypeName}   •   Department: ${deptName}   •   Project Division: ${locName}   •   Generated: ${formatDateDDMMYYYY(new Date())}`,
      headers,
      rows,
      summaryRow,
      totals: {
        qty: sumDQty + sumPQty,
        amount: sumPaid,
        qtyFormatted: Math.round(sumDQty + sumPQty).toLocaleString('en-IN') + ' Ltrs',
        amountFormatted: 'Rs. ' + sumPaid.toLocaleString('en-IN')
      },
      colWidths: [8, 11, 14, 8, 7, 8, 6, 7, 9, 9, 8, 5],
      aligns: ['center', 'left', 'left', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'center'],
      generatedBy: req.user ? req.user.email : 'MIS Admin',
      orientation: 'landscape'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Civet_MIS_Report_${new Date().toISOString().split('T')[0]}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;