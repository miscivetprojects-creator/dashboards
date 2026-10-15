const express = require('express');
const multer = require('multer');
const { authMiddleware } = require('../middleware/authMiddleware');
const { excelService } = require('../services/excelService');
const { getCollection } = require('../db/mongoClient');
const router = express.Router();
router.use(authMiddleware);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.originalname.match(/\.(xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed.'), false);
    }
  }
});
function checkDepartmentAccess(user, deptCode) {
  if (user.role === 'Director' || user.role === 'Admin' || user.role === 'admin') return true;
  if (!deptCode) return true;
  const userDept = (user.department || user.department_id || '').toLowerCase();
  return userDept === 'all' || userDept === deptCode.toLowerCase();
}
async function getNormalizedSchemas() {
  let list = await getCollection('report_types').find({}).toArray();
  if (list.length === 0) {
    list = await getCollection('report_schemas').find({}).toArray();
  }
  return list.map(doc => {
    const rawFields = doc.entry_fields || doc.fields || doc.columns || [];
    const fields = rawFields.map(f => ({
      name: f.key || f.name,
      label: f.label || f.key || f.name,
      type: f.type || 'text',
      required: Boolean(f.required),
      options: f.options || []
    }));
    return {
      _id: doc._id,
      report_type_id: doc.id || doc.report_type_id || doc.reportType,
      reportType: doc.id || doc.report_type_id || doc.reportType,
      report_name: doc.name || doc.report_name || doc.reportName,
      reportName: doc.name || doc.report_name || doc.reportName,
      department_id: (doc.department_id || doc.department || '').toLowerCase(),
      department: (doc.department_id || doc.department || '').toLowerCase(),
      frequency: doc.frequency || 'monthly',
      fields
    };
  });
}
async function findSchema(typeId) {
  const all = await getNormalizedSchemas();
  const search = String(typeId || '').toLowerCase().trim();
  return all.find(s =>
    s.report_type_id.toLowerCase() === search ||
    s.report_name.toLowerCase() === search ||
    (search === 'pm_log' && s.department_id === 'pm')
  );
}
router.get('/schemas', async (req, res) => {
  try {
    let schemas = await getNormalizedSchemas();
    if (req.user.role !== 'Director' && req.user.role !== 'Admin' && req.user.role !== 'admin') {
      const userDept = (req.user.department || req.user.department_id || '').toLowerCase();
      if (userDept && userDept !== 'all') {
        schemas = schemas.filter(s => s.department_id === userDept);
      }
    }
    res.json(schemas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/previous-balance', async (req, res) => {
  try {
    const { location, date, ledger_type, vendor } = req.query;
    if (!location) {
      return res.json({ hasPreviousRecord: false, isFirstEntry: true, closingBalance: 0, previousDate: null });
    }
    const safeLoc = String(location).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const locColl = getCollection('project_locations');
    const locDoc = await locColl.findOne({
      $or: [
        { name: new RegExp('^' + safeLoc + '$', 'i') },
        { code: new RegExp('^' + safeLoc + '$', 'i') },
        { id: new RegExp('^' + safeLoc + '$', 'i') }
      ]
    });
    const locName = locDoc ? locDoc.name : location;
    const locCode = locDoc ? (locDoc.code || locDoc.id) : location;
    const safeLocName = String(locName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const safeLocCode = String(locCode).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const recordsColl = getCollection('monthly_report_records');
    const locOr = [
      { location_name: new RegExp('^' + safeLocName + '$', 'i') },
      { location_id: new RegExp('^' + safeLocCode + '$', 'i') },
      { location: new RegExp('^' + safeLocName + '$', 'i') },
      { 'data.location': new RegExp('^' + safeLocName + '$', 'i') }
    ];

    const targetVendor = String(ledger_type || vendor || '').trim();
    if (targetVendor && targetVendor !== '-' && targetVendor !== 'null' && targetVendor !== 'undefined') {
      const safeVendor = targetVendor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const vendorOr = [
        { vendor_name: new RegExp('^' + safeVendor + '$', 'i') },
        { ledger_type: new RegExp('^' + safeVendor + '$', 'i') },
        { 'data.vendor_name': new RegExp('^' + safeVendor + '$', 'i') },
        { 'data.ledger_type': new RegExp('^' + safeVendor + '$', 'i') }
      ];

      const bunkQuery = {
        $and: [
          { $or: locOr },
          { $or: vendorOr }
        ],
        status: { $ne: 'Rejected' }
      };
      if (date && String(date).trim() !== '') {
        bunkQuery.report_date = { $lte: String(date).trim() };
      }

      const latestBunkRec = await recordsColl.findOne(bunkQuery, { sort: { report_date: -1, reporting_month: -1, created_at: -1, _id: -1 } });
      if (latestBunkRec) {
        const clBal = Number(latestBunkRec.closing_balance ?? latestBunkRec.balance ?? latestBunkRec.balance_amount ?? latestBunkRec.data?.closing_balance ?? 0);
        return res.json({
          hasPreviousRecord: true,
          isFirstEntry: false,
          closingBalance: clBal,
          previousDate: latestBunkRec.report_date,
          costCenter: locName,
          ledgerType: targetVendor
        });
      }

      const overallBunkRec = await recordsColl.findOne({
        $and: [
          { $or: locOr },
          { $or: vendorOr }
        ],
        status: { $ne: 'Rejected' }
      }, { sort: { report_date: -1, reporting_month: -1, created_at: -1, _id: -1 } });

      if (overallBunkRec) {
        const clBal = Number(overallBunkRec.closing_balance ?? overallBunkRec.balance ?? overallBunkRec.balance_amount ?? overallBunkRec.data?.closing_balance ?? 0);
        return res.json({
          hasPreviousRecord: true,
          isFirstEntry: false,
          closingBalance: clBal,
          previousDate: overallBunkRec.report_date,
          costCenter: locName,
          ledgerType: targetVendor
        });
      }

      return res.json({
        hasPreviousRecord: false,
        isFirstEntry: true,
        closingBalance: 0,
        previousDate: null,
        costCenter: locName,
        ledgerType: targetVendor
      });
    }

    const query = {
      $or: locOr,
      status: { $ne: 'Rejected' }
    };
    if (date && String(date).trim() !== '') {
      query.report_date = { $lte: String(date).trim() };
    }

    const latestRec = await recordsColl.findOne(query, { sort: { report_date: -1, reporting_month: -1, created_at: -1, _id: -1 } });
    if (latestRec) {
      const clBal = Number(latestRec.closing_balance ?? latestRec.balance ?? latestRec.balance_amount ?? latestRec.data?.closing_balance ?? 0);
      return res.json({
        hasPreviousRecord: true,
        isFirstEntry: false,
        closingBalance: clBal,
        previousDate: latestRec.report_date,
        costCenter: locName
      });
    }

    const overallLatest = await recordsColl.findOne({
      $or: locOr,
      status: { $ne: 'Rejected' }
    }, { sort: { report_date: -1, reporting_month: -1, created_at: -1, _id: -1 } });

    if (overallLatest) {
      const clBal = Number(overallLatest.closing_balance ?? overallLatest.balance ?? overallLatest.balance_amount ?? overallLatest.data?.closing_balance ?? 0);
      return res.json({
        hasPreviousRecord: true,
        isFirstEntry: false,
        closingBalance: clBal,
        previousDate: overallLatest.report_date,
        costCenter: locName
      });
    }

    const initOp = Number(locDoc?.opening_balance || 0);
    return res.json({
      hasPreviousRecord: false,
      isFirstEntry: true,
      closingBalance: initOp,
      previousDate: null,
      costCenter: locName
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get('/template/:reportType', async (req, res) => {
  try {
    const { reportType } = req.params;
    const { buffer, fileName } = await excelService.generateTemplate(reportType);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router.post('/import/preview', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please select an Excel file to upload.' });
    }
    const { reportType } = req.body;
    if (!reportType) {
      return res.status(400).json({ error: 'Report type is required.' });
    }
    const preview = await excelService.parseAndValidate(req.file.buffer, reportType, req.user);
    res.json(preview);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router.post('/import/confirm', async (req, res) => {
  try {
    const { batchId } = req.body;
    if (!batchId) {
      return res.status(400).json({ error: 'Batch ID is required.' });
    }
    const result = await excelService.confirmImport(batchId, req.user);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router.get('/import/error-report/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    const { buffer, fileName } = await excelService.generateErrorReport(batchId);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router.post('/manual-entry', async (req, res) => {
  try {
    const { reportType, data } = req.body;
    if (!reportType || !data) {
      return res.status(400).json({ error: 'Report type and data are required.' });
    }
    const schemaDoc = await findSchema(reportType);
    if (!schemaDoc) {
      return res.status(400).json({ error: `Unknown report type: ${reportType}` });
    }
    const deptId = schemaDoc.department_id;
    if (!checkDepartmentAccess(req.user, deptId)) {
      return res.status(403).json({ error: 'You are not authorized to submit records for this department.' });
    }
    const isFuelPurchase = String(reportType || '').toLowerCase() === 'fuel_purchase';
    const isPaymentCashAndCarry = String(data.payment_type || '').toLowerCase().includes('cash') ||
      (data.cash_and_carry !== undefined && data.cash_and_carry !== null && String(data.cash_and_carry).trim() !== '' && !isNaN(Number(data.cash_and_carry)));
    const hasCashAndCarry = isFuelPurchase && isPaymentCashAndCarry;
    const isBothFuel = isFuelPurchase && String(data.fuel_type || '').toLowerCase().trim().includes('both');
    let pQ = Number(data.petrol_quantity || 0);
    let pR = Number(data.petrol_rate || 0);
    let dQ = Number(data.diesel_quantity || 0);
    let dR = Number(data.diesel_rate || 0);
    let pCost = Number(data.petrol_total_cost || (pQ * pR).toFixed(2));
    let dCost = Number(data.diesel_total_cost || (dQ * dR).toFixed(2));
    let combinedCost = Number((pCost + dCost).toFixed(2));
    let combinedQty = Number((pQ + dQ).toFixed(2));

    if (isBothFuel) {
      data.petrol_quantity = pQ;
      data.petrol_rate = pR;
      data.petrol_total_cost = pCost;
      data.diesel_quantity = dQ;
      data.diesel_rate = dR;
      data.diesel_total_cost = dCost;
      if (combinedQty > 0 || (data.quantity === undefined || data.quantity === null || data.quantity === '')) {
        data.quantity = combinedQty;
        data.fuel_consumed_litres = combinedQty;
      }
      if (combinedCost > 0 || !hasCashAndCarry) {
        if (combinedCost > 0 || data.total_cost === undefined || data.total_cost === null || String(data.total_cost).trim() === '') {
          data.total_cost = combinedCost > 0 ? combinedCost : (data.total_cost || 0);
          data.paid_amount = combinedCost > 0 ? combinedCost : (data.paid_amount || 0);
        }
      }
    }

    if (hasCashAndCarry) {
      const cncVal = Number(data.cash_and_carry);
      if (data.paid_amount === undefined || data.paid_amount === null || String(data.paid_amount).trim() === '') {
        data.paid_amount = cncVal;
      }
      if (data.total_cost === undefined || data.total_cost === null || String(data.total_cost).trim() === '') {
        data.total_cost = cncVal;
      }
    }

    if (!isBothFuel && (data.quantity !== undefined && data.quantity !== null && String(data.quantity).trim() !== '') &&
        (data.rate !== undefined || data.unit_cost !== undefined) &&
        (String(data.rate ?? data.unit_cost).trim() !== '')) {
      const q = Number(data.quantity);
      const r = Number(data.rate ?? data.unit_cost);
      if (!isNaN(q) && !isNaN(r) && q > 0 && r > 0) {
        const calculated = Number((q * r).toFixed(2));
        if (data.total_cost === undefined || data.total_cost === null || String(data.total_cost).trim() === '' || !hasCashAndCarry) {
          data.total_cost = calculated;
        }
      }
    }

    const totalCostVal = Number(data.total_cost || (isBothFuel ? combinedCost : 0));
    let paidAmountVal = (data.paid_amount !== undefined && data.paid_amount !== null && String(data.paid_amount).trim() !== '' && !isNaN(Number(data.paid_amount)))
      ? Number(data.paid_amount)
      : totalCostVal;
    let balanceVal = (data.balance !== undefined && data.balance !== null && String(data.balance).trim() !== '' && !isNaN(Number(data.balance)))
      ? Number(data.balance)
      : Math.max(0, Number((totalCostVal - paidAmountVal).toFixed(2)));

    data.total_cost = totalCostVal;
    data.paid_amount = paidAmountVal;
    data.balance = balanceVal;
    data.balance_amount = balanceVal;

    if (data.ledger_type && !data.vendor_name) data.vendor_name = data.ledger_type;
    if (data.vendor_name && !data.ledger_type) data.ledger_type = data.vendor_name;

    if (isFuelPurchase) {
      if (!data.department) data.department = 'Plant & Machinery';
      if (!data.department_beneficiary) data.department_beneficiary = 'Plant & Machinery';
      if (!data.ledger_type && !data.vendor_name) {
        data.ledger_type = '-';
        data.vendor_name = '-';
      }
      if (!data.fuel_type) data.fuel_type = 'Diesel';
      if (!data.payment_type) data.payment_type = 'Regular';
    }

    const fields = schemaDoc.fields;
    const errors = [];
    fields.forEach(f => {
      const val = data[f.name];
      if (f.required && !isFuelPurchase && (val === undefined || val === null || String(val).trim() === '')) {
        errors.push(`${f.label} is required.`);
      }
      if (val !== undefined && val !== null && String(val).trim() !== '' && (f.type === 'number' || f.type === 'currency' || f.type === 'decimal')) {
        const num = Number(val);
        if (isNaN(num)) {
          errors.push(`${f.label} must be a valid number.`);
        } else if (num < 0) {
          errors.push(`${f.label} cannot be negative.`);
        }
      }
    });
    if (data.cash_and_carry !== undefined && data.cash_and_carry !== null && String(data.cash_and_carry).trim() !== '') {
      const cnc = Number(data.cash_and_carry);
      if (isNaN(cnc)) {
        errors.push('Cash and Carry must be a valid number.');
      } else if (cnc < 0) {
        errors.push('Cash and Carry cannot be negative.');
      }
    }
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(' ') });
    }
    const working = Number(data.working_hours || 0);
    const breakdown = Number(data.breakdown_hours || 0);
    const idle = Number(data.idle_hours || 0);
    if (working + breakdown + idle > 744) {
      return res.status(400).json({ error: 'Total monthly hours cannot exceed 744 hours.' });
    }
    const reportDate = data.date || data.report_date || new Date().toISOString().split('T')[0];
    const dObj = new Date(reportDate);
    const reporting_year = !isNaN(dObj.getFullYear()) ? dObj.getFullYear() : 2025;
    const reporting_month = !isNaN(dObj.getMonth()) ? dObj.getMonth() + 1 : 4;
    const m = reporting_month;
    const reporting_quarter = m <= 3 ? 'Q1' : m <= 6 ? 'Q2' : m <= 9 ? 'Q3' : 'Q4';
    let location_id = data.location || data.location_id || '';
    let location_name = data.location || data.location_id || '';
    const vName = String(data.vendor_name || data.ledger_type || data.vendor || '').toLowerCase();
    if (vName.includes('sai baba') && (!location_name || String(location_name).toLowerCase().includes('khammam'))) {
      location_name = 'Jadcherla';
      data.location = 'Jadcherla';
      data.location_id = 'Jadcherla';
      data.cost_center = 'Jadcherla';
    }
    const finalAmt = Number(data.paid_amount || data.total_cost || data.cash_and_carry || 0);
    const enteredQty = Number(data.quantity || (isBothFuel ? combinedQty : 0) || 0);
    const enteredRate = Number(data.rate ?? data.unit_cost ?? 0);
    if (vName.includes('merchant') || (finalAmt > 0 && (enteredQty <= 0 || enteredRate <= 0))) {
      if (!data.payment_type) data.payment_type = 'Cash & Carry';
      data.cash_and_carry = finalAmt;
      if (!data.paid_amount && finalAmt > 0) data.paid_amount = finalAmt;
      if (!data.total_cost && finalAmt > 0) data.total_cost = finalAmt;
    }
    if (location_name) {
      const locColl = getCollection('project_locations');
      const safeLoc = String(location_name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const foundLoc = await locColl.findOne({
        $or: [
          { name: new RegExp('^' + safeLoc + '$', 'i') },
          { code: new RegExp('^' + safeLoc + '$', 'i') },
          { id: new RegExp('^' + safeLoc + '$', 'i') }
        ]
      });
      if (foundLoc) {
        location_id = foundLoc.code || foundLoc.id;
        location_name = foundLoc.name;
      }
    }
    if (!location_id) {
      const firstLoc = await getCollection('project_locations').findOne({ status: { $ne: 'inactive' }, active: { $ne: false } });
      if (firstLoc) {
        location_id = firstLoc.code || firstLoc.id;
        location_name = firstLoc.name;
      } else {
        location_id = 'SITE_01';
        location_name = 'Cost Center';
      }
    }
    const recordsColl = getCollection('monthly_report_records');
    let rowOpeningBalance = 0;
    if (data.opening_balance !== undefined && data.opening_balance !== null && String(data.opening_balance).trim() !== '' && !isNaN(Number(data.opening_balance))) {
      rowOpeningBalance = Number(data.opening_balance);
      balanceVal = Number((rowOpeningBalance + totalCostVal - paidAmountVal).toFixed(2));
      data.opening_balance = rowOpeningBalance;
      data.balance = balanceVal;
      data.balance_amount = balanceVal;
      data.closing_balance = balanceVal;
    } else if (schemaDoc.report_type_id === 'FUEL_PURCHASE' || deptId.toLowerCase() === 'pm' || deptId.toLowerCase() === 'fuel') {
      const safeLocSearch = String(location_name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const vendorSearch = String(data.vendor_name || data.ledger_type || '').trim();
      const queryLatest = {
        location_name: new RegExp('^' + safeLocSearch + '$', 'i'),
        status: { $ne: 'Rejected' }
      };
      if (vendorSearch && vendorSearch !== '-') {
        const safeV = vendorSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        queryLatest.$or = [
          { vendor_name: new RegExp('^' + safeV + '$', 'i') },
          { ledger_type: new RegExp('^' + safeV + '$', 'i') }
        ];
      }
      const latestRec = await recordsColl.findOne(
        queryLatest,
        { sort: { report_date: -1, reporting_month: -1, created_at: -1 } }
      );
      if (latestRec && (latestRec.balance !== undefined || latestRec.balance_amount !== undefined)) {
        rowOpeningBalance = Number(latestRec.balance ?? latestRec.balance_amount);
      } else {
        const locColl = getCollection('project_locations');
        const locDoc = await locColl.findOne({
          $or: [
            { name: new RegExp('^' + safeLocSearch + '$', 'i') },
            { code: new RegExp('^' + safeLocSearch + '$', 'i') },
            { id: new RegExp('^' + safeLocSearch + '$', 'i') }
          ]
        });
        rowOpeningBalance = Number(locDoc?.opening_balance ?? 0);
      }
      balanceVal = Number((rowOpeningBalance + totalCostVal - paidAmountVal).toFixed(2));
      data.opening_balance = rowOpeningBalance;
      data.balance = balanceVal;
      data.balance_amount = balanceVal;
      data.closing_balance = balanceVal;
    }

    const newRecord = {
      report_type_id: schemaDoc.report_type_id,
      department_id: deptId.toUpperCase(),
      location_id,
      location_name,
      report_date: reportDate,
      reporting_year,
      reporting_month,
      reporting_quarter,
      data,
      fuel_type: data.fuel_type || '',
      payment_type: data.payment_type || (hasCashAndCarry ? 'Cash & Carry' : ''),
      petrol_quantity: pQ,
      petrol_rate: pR,
      petrol_total_cost: pCost,
      diesel_quantity: dQ,
      diesel_rate: dR,
      diesel_total_cost: dCost,
      opening_balance: rowOpeningBalance,
      total_cost: totalCostVal,
      paid_amount: paidAmountVal,
      closing_balance: balanceVal,
      balance: balanceVal,
      balance_amount: balanceVal,
      working_hours: Number(data.working_hours || 0),
      idle_hours: Number(data.idle_hours || 0),
      breakdown_hours: Number(data.breakdown_hours || 0),
      available_hours: Number(data.available_hours || (Number(data.working_hours || 0) + Number(data.idle_hours || 0) + Number(data.breakdown_hours || 0))),
      fuel_consumed_litres: Number(data.fuel_consumed_litres || data.quantity || (isBothFuel ? combinedQty : 0)),
      cash_and_carry: (data.cash_and_carry !== undefined && data.cash_and_carry !== null && String(data.cash_and_carry).trim() !== '' && !isNaN(Number(data.cash_and_carry))) ? Number(data.cash_and_carry) : (data.cash_and_carry ? String(data.cash_and_carry).trim() : ''),
      vendor_name: data.ledger_type || data.vendor_name || data.vendor || '',
      ledger_type: data.ledger_type || data.vendor_name || data.vendor || '',
      service_type_id: data.service_type || data.service_type_id || '',
      status: 'Approved',
      version: 1,
      is_latest: true,
      source: 'manual_entry',
      created_by: req.user.email,
      created_at: new Date(),
      updated_at: new Date(),
      history: [{
        version: 1,
        modified_by: req.user.email,
        modified_at: new Date(),
        change_reason: 'Initial entry created manually',
        data
      }]
    };
    const result = await recordsColl.insertOne(newRecord);
    res.json({
      success: true,
      recordId: result.insertedId,
      message: 'Record successfully saved.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get('/recent', async (req, res) => {
  try {
    const recordsColl = getCollection('monthly_report_records');
    const query = { status: { $ne: 'Rejected' } };
    if (req.user.role !== 'Director' && req.user.role !== 'Admin' && req.user.role !== 'admin') {
      const userDept = (req.user.department || req.user.department_id || '').toLowerCase();
      if (userDept && userDept !== 'all') {
        query.department_id = userDept;
      }
    }
    const records = await recordsColl
      .find(query)
      .sort({ created_at: -1 })
      .limit(20)
      .toArray();
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;