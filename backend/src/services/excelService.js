const ExcelJS = require('exceljs');
const crypto = require('crypto');
const { getCollection } = require('../db/mongoClient');

const activeImportBatches = new Map();

function normalizeColHeader(str) {
  return String(str || '')
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

const excelService = {
  async generateTemplate(reportType) {
    const schemasCollection = getCollection('report_types');
    let schemaDocument = await schemasCollection.findOne({ 
      $or: [{ id: reportType }, { report_type_id: reportType }, { reportType: reportType }] 
    });
    if (!schemaDocument) {
      schemaDocument = await getCollection('report_schemas').findOne({
        $or: [{ id: reportType }, { report_type_id: reportType }, { reportType: reportType }]
      });
    }

    let reportName = schemaDocument ? (schemaDocument.name || schemaDocument.report_name || schemaDocument.reportName || reportType) : reportType;
    let fields = [];

    const isFuel = String(reportType).toUpperCase() === 'FUEL_PURCHASE';

    if (isFuel) {
      reportName = 'Fuel Management';
      fields = [
        { name: 'report_date', label: 'Date', type: 'date', required: false, sample: '2026-01-15' },
        { name: 'location', label: 'Project Division', type: 'text', required: true, sample: 'Khammam' },
        { name: 'project_name', label: 'Project Name', type: 'text', required: false, sample: 'Khammam Site 1' },
        { name: 'department', label: 'Department', type: 'text', required: false, sample: 'Plant & Machinery' },
        { name: 'ledger_type', label: 'Ledger / Vendor', type: 'text', required: false, sample: 'Sri Sai Enterprises' },
        { name: 'fuel_type', label: 'Fuel Type', type: 'select', required: false, options: ['Diesel', 'Petrol', 'Both', 'Diesel (HSD)', 'Engine Oil', 'Hydraulic Oil', 'Lubricants / Grease'], sample: 'Diesel' },
        { name: 'payment_type', label: 'Payment Type', type: 'select', required: false, options: ['Card Payment', 'Cash and Carry', 'Bank Transfer / NEFT', 'Cheque'], sample: 'Card Payment' },
        { name: 'opening_balance', label: 'Opening Bal (Rs.)', type: 'number', required: false, sample: 7625976.94 },
        { name: 'petrol_quantity', label: 'Petrol Qty', type: 'number', required: false, sample: 0 },
        { name: 'petrol_rate', label: 'Petrol Price', type: 'number', required: false, sample: 0 },
        { name: 'diesel_quantity', label: 'Diesel Qty', type: 'number', required: false, sample: 5000 },
        { name: 'diesel_rate', label: 'Diesel Price', type: 'number', required: false, sample: 95 },
        { name: 'quantity', label: 'Fuel Qty (Ltrs)', type: 'number', required: false, sample: 5000 },
        { name: 'rate', label: 'Rate (Rs. / Ltr)', type: 'number', required: false, sample: 95 },
        { name: 'total_cost', label: 'Total Cost (Rs.)', type: 'number', required: false, sample: 475000 },
        { name: 'paid_amount', label: 'Amount Paid (Rs.)', type: 'number', required: false, sample: 450000 },
        { name: 'closing_balance', label: 'Closing Bal (Rs.)', type: 'number', required: false, sample: 7650976.94 },
        { name: 'cash_and_carry', label: 'Cash and Carry (Rs.)', type: 'number', required: false, sample: 0 }
      ];
    } else {
      const rawFields = schemaDocument ? (schemaDocument.entry_fields || schemaDocument.fields || schemaDocument.columns || []) : [];
      const extracted = rawFields.map(f => ({
        name: f.key || f.name,
        label: f.label || f.key || f.name,
        type: f.type || 'text',
        required: Boolean(f.required),
        options: f.options || []
      }));

      const hasLoc = extracted.some(f => ['location', 'location_id', 'cost_center', 'site', 'project_division'].includes(String(f.name).toLowerCase()));
      const hasDate = extracted.some(f => ['report_date', 'date', 'entry_date'].includes(String(f.name).toLowerCase()));

      if (!hasLoc) {
        fields.push({ name: 'location', label: 'Project Division', type: 'text', required: true, sample: 'YG Gudda' });
      }
      if (!hasDate) {
        fields.push({ name: 'report_date', label: 'Date', type: 'date', required: true, sample: '2025-10-10' });
      }
      fields.push(...extracted);
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CIVET PROJECTS PRIVATE LIMITED';
    workbook.lastModifiedBy = 'CIVET Dashboards System';
    workbook.created = new Date();
    workbook.modified = new Date();

    const worksheet = workbook.addWorksheet(reportName.substring(0, 31));
    const headerLabels = fields.map(f => f.label + (f.required ? ' *' : ''));

    worksheet.mergeCells('A1', `${String.fromCharCode(64 + Math.max(headerLabels.length, 1))}1`);
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `CIVET MANAGEMENT MIS — ${reportName.toUpperCase()} DATA TEMPLATE`;
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F2A4A' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 30;

    worksheet.mergeCells('A2', `${String.fromCharCode(64 + Math.max(headerLabels.length, 1))}2`);
    const noteCell = worksheet.getCell('A2');
    noteCell.value = 'Fill out all required columns marked with (*). Do not modify column names. Dates should be in YYYY-MM-DD format.';
    noteCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF555555' } };
    noteCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F6F9' } };
    noteCell.alignment = { vertical: 'middle', horizontal: 'left' };
    worksheet.getRow(2).height = 20;

    const headerRow = worksheet.getRow(3);
    headerLabels.forEach((label, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = label;
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F6FEB' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD9DEE5' } },
        left: { style: 'thin', color: { argb: 'FFD9DEE5' } },
        bottom: { style: 'thin', color: { argb: 'FFD9DEE5' } },
        right: { style: 'thin', color: { argb: 'FFD9DEE5' } }
      };
    });
    headerRow.height = 26;

    const sampleRow = worksheet.getRow(4);
    fields.forEach((field, index) => {
      const cell = sampleRow.getCell(index + 1);
      if (field.sample !== undefined) {
        cell.value = field.sample;
      } else if (field.type === 'date') {
        cell.value = '2025-10-10';
      } else if (field.type === 'number' || field.type === 'currency' || field.type === 'decimal') {
        cell.value = 1000;
      } else if (field.options && field.options.length > 0) {
        cell.value = field.options[0];
      } else {
        cell.value = `Sample ${field.label}`;
      }

      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF777777' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
      };
    });
    sampleRow.height = 22;

    fields.forEach((field, index) => {
      const col = worksheet.getColumn(index + 1);
      col.width = Math.max(field.label.length + 8, 16);
    });

    const fileBuffer = await workbook.xlsx.writeBuffer();
    return {
      buffer: fileBuffer,
      fileName: `Civet_Template_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`
    };
  },

  async parseAndValidate(buffer, reportType, user) {
    const isFuel = String(reportType).toUpperCase() === 'FUEL_PURCHASE';

    const schemasCollection = getCollection('report_types');
    let schemaDocument = await schemasCollection.findOne({
      $or: [{ id: reportType }, { report_type_id: reportType }, { reportType: reportType }]
    });
    if (!schemaDocument) {
      schemaDocument = await getCollection('report_schemas').findOne({
        $or: [{ id: reportType }, { report_type_id: reportType }, { reportType: reportType }]
      });
    }

    let fields = [];
    if (isFuel) {
      fields = [
        { name: 'location', label: 'Project Division', type: 'text', required: true, aliases: ['projectdivision', 'division', 'location', 'locationid', 'costcenter', 'site', 'projectlocation'] },
        { name: 'project_name', label: 'Project Name', type: 'text', required: false, aliases: ['projectname', 'project', 'sitename', 'sitename1'] },
        { name: 'ledger_type', label: 'Ledger Type', type: 'text', required: false, aliases: ['ledgertype', 'vendor', 'vendorname', 'supplier', 'ledger'] },
        { name: 'department', label: 'Department', type: 'text', required: false, aliases: ['department', 'departmentbeneficiary', 'targetdepartment', 'dept'] },
        { name: 'fuel_type', label: 'Fuel Type', type: 'select', required: false, aliases: ['fueltype', 'fuel'] },
        { name: 'payment_type', label: 'Payment Type', type: 'select', required: false, aliases: ['paymenttype', 'payment_type', 'paymentmode', 'paymode'] },
        { name: 'report_date', label: 'Date', type: 'date', required: false, aliases: ['date', 'reportdate', 'entrydate'] },
        { name: 'opening_balance', label: 'Opening Bal', type: 'number', required: false, aliases: ['openingbalance', 'opening_balance', 'opbal', 'openingbal', 'opening'] },
        { name: 'petrol_quantity', label: 'Petrol Qty', type: 'number', required: false, aliases: ['petrolquantity', 'petrolqty', 'petrol_quantity', 'petrol_qty', 'petrol'] },
        { name: 'petrol_rate', label: 'Petrol Price', type: 'number', required: false, aliases: ['petrolrate', 'petrolprice', 'petrol_rate', 'petrol_price', 'petrolrateperliter'] },
        { name: 'diesel_quantity', label: 'Diesel Qty', type: 'number', required: false, aliases: ['dieselquantity', 'dieselqty', 'diesel_quantity', 'diesel_qty', 'diesel'] },
        { name: 'diesel_rate', label: 'Diesel Price', type: 'number', required: false, aliases: ['dieselrate', 'dieselprice', 'diesel_rate', 'diesel_price', 'dieselrateperliter'] },
        { name: 'quantity', label: 'Qty', type: 'number', required: false, aliases: ['quantity', 'qty', 'fuelquantity', 'fuelconsumedlitres', 'liters', 'litres'] },
        { name: 'rate', label: 'Rate', type: 'number', required: false, aliases: ['rate', 'unitrate', 'rateperliter', 'rateperltr'] },
        { name: 'total_cost', label: 'Total Cost', type: 'number', required: false, aliases: ['totalcost', 'paidamount', 'cost', 'amount'] },
        { name: 'paid_amount', label: 'Amount Paid', type: 'number', required: false, aliases: ['paidamount', 'paid_amount', 'amountpaid', 'paid'] },
        { name: 'closing_balance', label: 'Closing Bal', type: 'number', required: false, aliases: ['closingbalance', 'closing_balance', 'clbal', 'closingbal', 'closing'] },
        { name: 'cash_and_carry', label: 'Cash and Carry', type: 'text', required: false, aliases: ['cashandcarry', 'cashcarry', 'cashncarry', 'cash'] }
      ];
    } else {
      const rawFields = schemaDocument ? (schemaDocument.entry_fields || schemaDocument.fields || schemaDocument.columns || []) : [];
      const extracted = rawFields.map(f => ({
        name: f.key || f.name,
        label: f.label || f.key || f.name,
        type: f.type || 'text',
        required: Boolean(f.required),
        options: f.options || [],
        aliases: [normalizeColHeader(f.key || f.name), normalizeColHeader(f.label || '')]
      }));

      const hasLoc = extracted.some(f => ['location', 'location_id', 'cost_center', 'site', 'project_division'].includes(String(f.name).toLowerCase()));
      const hasDate = extracted.some(f => ['report_date', 'date', 'entry_date'].includes(String(f.name).toLowerCase()));

      if (!hasLoc) {
        fields.push({ name: 'location', label: 'Project Division', type: 'text', required: true, aliases: ['projectdivision', 'division', 'location', 'locationid', 'costcenter', 'site', 'projectlocation'] });
      }
      if (!hasDate) {
        fields.push({ name: 'report_date', label: 'Date', type: 'date', required: true, aliases: ['date', 'reportdate', 'entrydate'] });
      }
      fields.push(...extracted);
    }

    const deptId = isFuel ? 'PM' : ((schemaDocument && (schemaDocument.department_id || schemaDocument.department)) || 'PM').toUpperCase();
    const reportName = isFuel ? 'Fuel Management' : ((schemaDocument && (schemaDocument.name || schemaDocument.report_name || schemaDocument.reportName)) || reportType);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('Workbook is empty or contains no valid worksheets.');
    }

    let headerRowIdx = 3;
    for (let r = 1; r <= 5; r++) {
      const row = worksheet.getRow(r);
      const rowHeaders = [];
      row.eachCell({ includeEmpty: false }, (cell) => {
        rowHeaders.push(normalizeColHeader(cell.value));
      });
      const matches = fields.filter(f => {
        const fAliases = f.aliases || [normalizeColHeader(f.name), normalizeColHeader(f.label)];
        return rowHeaders.some(rh => fAliases.some(al => rh.includes(al) || al.includes(rh)));
      });
      if (matches.length >= Math.min(2, fields.length)) {
        headerRowIdx = r;
        break;
      }
    }

    const columnIndexMap = new Map();
    const headerRow = worksheet.getRow(headerRowIdx);
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const headerNorm = normalizeColHeader(cell.value);
      const matchedField = fields.find(f => {
        const fAliases = f.aliases || [normalizeColHeader(f.name), normalizeColHeader(f.label)];
        return fAliases.some(al => headerNorm === al || headerNorm.startsWith(al) || al.startsWith(headerNorm));
      });
      if (matchedField) {
        columnIndexMap.set(colNumber, matchedField);
      }
    });

    const parsedRows = [];
    let validCount = 0;
    let errorCount = 0;
    let warningCount = 0;

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber <= headerRowIdx) return;

      const rowData = {};
      const rowErrors = [];
      const rowWarnings = [];
      let isSample = false;

      columnIndexMap.forEach((field, colNumber) => {
        const cell = row.getCell(colNumber);
        let val = cell.value;
        if (val && typeof val === 'object' && val.text) {
          val = val.text;
        }
        if (typeof val === 'string' && val.startsWith('Sample ')) {
          isSample = true;
        }
        rowData[field.name] = val !== undefined && val !== null ? val : null;
      });

      if (isSample) return;

      const hasAnyValue = Object.values(rowData).some(v => v !== null && v !== undefined && String(v).trim() !== '');
      if (!hasAnyValue) return;

      if (isFuel) {
        const isBoth = String(rowData.fuel_type || '').toLowerCase().includes('both');
        const pQ = Number(rowData.petrol_quantity || 0);
        const pR = Number(rowData.petrol_rate || 0);
        const dQ = Number(rowData.diesel_quantity || 0);
        const dR = Number(rowData.diesel_rate || 0);
        if (isBoth) {
          const pCost = Number((pQ * pR).toFixed(2));
          const dCost = Number((dQ * dR).toFixed(2));
          rowData.petrol_quantity = pQ;
          rowData.petrol_rate = pR;
          rowData.petrol_total_cost = pCost;
          rowData.diesel_quantity = dQ;
          rowData.diesel_rate = dR;
          rowData.diesel_total_cost = dCost;
          if (pQ + dQ > 0) {
            rowData.quantity = Number((pQ + dQ).toFixed(2));
          }
          if (pCost + dCost > 0) {
            rowData.total_cost = Number((pCost + dCost).toFixed(2));
            rowData.paid_amount = Number((pCost + dCost).toFixed(2));
          }
        } else {
          const q = Number(rowData.quantity);
          const r = Number(rowData.rate);
          if (!isNaN(q) && !isNaN(r) && q >= 0 && r >= 0) {
            if (!rowData.total_cost || isNaN(Number(rowData.total_cost))) {
              rowData.total_cost = Number((q * r).toFixed(2));
            }
            if (!rowData.paid_amount || isNaN(Number(rowData.paid_amount))) {
              rowData.paid_amount = Number((q * r).toFixed(2));
            }
          }
        }
      }

      fields.forEach(field => {
        let val = rowData[field.name];
        const isFuelOptional = isFuel && field.name !== 'location';

        if (field.required && !isFuelOptional && (val === null || val === undefined || String(val).trim() === '')) {
          rowErrors.push({ field: field.name, message: `${field.label} is required.` });
        }

        if (val !== null && val !== undefined && String(val).trim() !== '') {
          if (field.type === 'number' || field.type === 'currency' || field.type === 'decimal') {
            const num = Number(val);
            if (isNaN(num)) {
              rowErrors.push({ field: field.name, message: `${field.label} must be a valid number.` });
            } else if (num < 0) {
              rowErrors.push({ field: field.name, message: `${field.label} cannot be negative.` });
            } else {
              rowData[field.name] = num;
            }
          } else if (field.type === 'date') {
            let parsedDate;
            if (val instanceof Date) {
              parsedDate = val;
            } else {
              parsedDate = new Date(val);
            }
            if (isNaN(parsedDate.getTime())) {
              rowErrors.push({ field: field.name, message: `${field.label} has invalid date format.` });
            } else {
              rowData[field.name] = parsedDate.toISOString().split('T')[0];
            }
          }
        }
      });

      const isValid = rowErrors.length === 0;
      if (isValid) validCount++;
      else errorCount++;
      if (rowWarnings.length > 0) warningCount++;

      parsedRows.push({
        rowNumber,
        data: rowData,
        isValid,
        errors: rowErrors,
        warnings: rowWarnings
      });
    });

    const batchId = crypto.randomBytes(16).toString('hex');
    const batchSummary = {
      batchId,
      reportType,
      department: deptId,
      reportName,
      totalRows: parsedRows.length,
      validCount,
      errorCount,
      warningCount,
      rows: parsedRows,
      uploadedAt: new Date(),
      uploadedBy: user.email
    };

    activeImportBatches.set(batchId, batchSummary);

    return {
      batchId,
      reportType,
      reportName,
      totalRows: parsedRows.length,
      validCount,
      errorCount,
      warningCount,
      previewRows: parsedRows.slice(0, 20)
    };
  },

  async confirmImport(batchId, user) {
    const batch = activeImportBatches.get(batchId);
    if (!batch) {
      throw new Error('Import batch expired or not found. Please upload again.');
    }

    const recordsColl = getCollection('monthly_report_records');
    const locsColl = getCollection('project_locations');
    const projectLocations = await locsColl.find({ status: { $ne: 'inactive' }, active: { $ne: false } }).toArray();

    const validRows = batch.rows.filter(r => r.isValid);
    if (validRows.length === 0) {
      throw new Error('No valid rows found in this batch to import.');
    }

    const isFuel = String(batch.reportType).toUpperCase() === 'FUEL_PURCHASE';

    const recordsToInsert = validRows.map(r => {
      const recordData = { ...r.data };
      const reportDate = recordData.report_date || recordData.date || new Date().toISOString().split('T')[0];
      const dObj = new Date(reportDate);
      const reporting_year = !isNaN(dObj.getFullYear()) ? dObj.getFullYear() : 2025;
      const reporting_month = !isNaN(dObj.getMonth()) ? dObj.getMonth() + 1 : 10;
      const m = reporting_month;
      const reporting_quarter = m <= 3 ? 'Q1' : m <= 6 ? 'Q2' : m <= 9 ? 'Q3' : 'Q4';

      let rawLoc = String(recordData.location || recordData.location_id || 'Sangareddy').trim();
      const vNameExcel = String(recordData.ledger_type || recordData.vendor_name || recordData.vendor || '').toLowerCase();
      if (vNameExcel.includes('sai baba') && (rawLoc.toLowerCase().includes('khammam') || !recordData.location)) {
        rawLoc = 'Jadcherla';
      }
      const rawLocLower = rawLoc.toLowerCase();
      const matchedLoc = projectLocations.find(l => {
        const lId = String(l.id || '').toLowerCase();
        const lName = String(l.name || '').toLowerCase();
        const lAlias = String(l.alias || '').toLowerCase();
        const lCode = String(l.code || '').toLowerCase();
        const normLName = lName.replace(/[^a-z0-9]/g, '');
        const normRaw = rawLocLower.replace(/[^a-z0-9]/g, '');
        return lId === rawLocLower || lName === rawLocLower || lAlias === rawLocLower || lCode === rawLocLower ||
          (normRaw && normLName === normRaw) || (normRaw && normLName.startsWith(normRaw));
      });

      const location_id = matchedLoc ? (matchedLoc.code || matchedLoc.id) : rawLoc.toUpperCase().replace(/\s+/g, '_');
      const location_name = matchedLoc ? (matchedLoc.alias || matchedLoc.name) : rawLoc;

      const department_id = isFuel ? 'PM' : (batch.department || recordData.department_id || 'PM').toUpperCase();
      const isBoth = isFuel && String(recordData.fuel_type || '').toLowerCase().includes('both');
      const pQ = Number(recordData.petrol_quantity || 0);
      const pR = Number(recordData.petrol_rate || 0);
      const dQ = Number(recordData.diesel_quantity || 0);
      const dR = Number(recordData.diesel_rate || 0);
      const pCost = Number(recordData.petrol_total_cost || (pQ * pR).toFixed(2));
      const dCost = Number(recordData.diesel_total_cost || (dQ * dR).toFixed(2));
      const combinedCost = Number((pCost + dCost).toFixed(2));
      const combinedLiters = Number((pQ + dQ).toFixed(2));

      const calcCost = isBoth ? combinedCost : (Number(recordData.quantity || 0) * Number(recordData.rate || 0));
      let totalCostVal = Number(recordData.total_cost !== undefined && recordData.total_cost !== null && !isNaN(Number(recordData.total_cost)) && Number(recordData.total_cost) > 0 ? recordData.total_cost : (calcCost > 0 ? calcCost : (recordData.paid_amount || 0)));
      let paidAmount = Number(recordData.paid_amount !== undefined && recordData.paid_amount !== null && !isNaN(Number(recordData.paid_amount)) ? recordData.paid_amount : totalCostVal);
      let opBalVal = Number(recordData.opening_balance || 0);
      let clBalVal = Number(recordData.closing_balance ?? recordData.balance ?? Number((opBalVal + totalCostVal - paidAmount).toFixed(2)));
      let fuelLiters = Number((isBoth && combinedLiters > 0) ? combinedLiters : (recordData.quantity || recordData.fuel_consumed_litres || 0));

      recordData.location = location_name;
      recordData.location_id = location_id;
      recordData.project_division = location_name;
      recordData.project_division_id = location_id;
      recordData.project_name = recordData.project_name || recordData.site_name || '';
      recordData.report_date = reportDate;
      recordData.total_cost = totalCostVal;
      recordData.paid_amount = paidAmount;
      recordData.opening_balance = opBalVal;
      recordData.closing_balance = clBalVal;
      recordData.balance = clBalVal;
      if (isFuel) {
        recordData.category = 'Fuel';
        recordData.department = recordData.department || recordData.department_beneficiary || 'Plant & Machinery';
        recordData.department_beneficiary = recordData.department;
        let rawVName = recordData.ledger_type || recordData.vendor_name || '';
        if (['na', 'n/a', '-', 'none', 'null', 'undefined'].includes(String(rawVName).trim().toLowerCase())) {
          rawVName = '';
        }
        if (!rawVName && location_name.toLowerCase().includes('chennagiri')) {
          rawVName = 'Chennagiri Fuel Bunk';
        }
        recordData.vendor_name = rawVName;
        recordData.ledger_type = rawVName;
        recordData.petrol_quantity = pQ;
        recordData.petrol_rate = pR;
        recordData.petrol_total_cost = pCost;
        recordData.diesel_quantity = dQ;
        recordData.diesel_rate = dR;
        recordData.diesel_total_cost = dCost;
        const isZeroQtyOrRate = paidAmount > 0 && (fuelLiters <= 0 || Number(recordData.rate || 0) <= 0);
        if (isZeroQtyOrRate) {
          recordData.payment_type = recordData.payment_type || 'Cash & Carry';
          recordData.cash_and_carry = recordData.cash_and_carry || paidAmount;
        } else {
          recordData.payment_type = recordData.payment_type || '';
        }
        if (recordData.cash_and_carry !== undefined && recordData.cash_and_carry !== null) {
          recordData.cash_and_carry = String(recordData.cash_and_carry).trim();
        }
      }

      return {
        report_type_id: batch.reportType,
        department_id,
        location_id,
        location_name,
        project_division: location_name,
        project_division_id: location_id,
        project_name: recordData.project_name || recordData.site_name || '',
        report_date: reportDate,
        reporting_year,
        reporting_month,
        reporting_quarter,
        data: recordData,
        fuel_type: recordData.fuel_type || '',
        payment_type: recordData.payment_type || '',
        petrol_quantity: pQ,
        petrol_rate: pR,
        petrol_total_cost: pCost,
        diesel_quantity: dQ,
        diesel_rate: dR,
        diesel_total_cost: dCost,
        paid_amount: paidAmount,
        total_cost: totalCostVal,
        opening_balance: opBalVal,
        closing_balance: clBalVal,
        balance: clBalVal,
        working_hours: Number(recordData.working_hours || 0),
        idle_hours: Number(recordData.idle_hours || 0),
        breakdown_hours: Number(recordData.breakdown_hours || 0),
        available_hours: Number(recordData.available_hours || (Number(recordData.working_hours || 0) + Number(recordData.idle_hours || 0) + Number(recordData.breakdown_hours || 0))),
        fuel_consumed_litres: fuelLiters,
        cash_and_carry: recordData.cash_and_carry || '',
        category: isFuel ? 'Fuel' : (recordData.category || ''),
        vendor_name: recordData.ledger_type || recordData.vendor_name || recordData.vendor || '',
        ledger_type: recordData.ledger_type || recordData.vendor_name || recordData.vendor || '',
        service_type_id: recordData.service_type || recordData.service_type_id || '',
        status: 'Approved',
        version: 1,
        is_latest: true,
        source: 'excel_import',
        batch_id: batch.batchId,
        created_by: user.email,
        created_at: new Date(),
        updated_at: new Date(),
        history: [{
          version: 1,
          modified_by: user.email,
          modified_at: new Date(),
          change_reason: `Bulk imported via Excel batch #${batch.batchId.substring(0, 8)}`,
          data: recordData
        }]
      };
    });

    await recordsColl.insertMany(recordsToInsert);
    activeImportBatches.delete(batchId);

    return {
      success: true,
      importedCount: recordsToInsert.length,
      batchId
    };
  },

  async generateErrorReport(batchId) {
    const batch = activeImportBatches.get(batchId);
    if (!batch) {
      throw new Error('Batch not found or expired.');
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Import Errors');
    const errorRows = batch.rows.filter(r => !r.isValid);

    worksheet.mergeCells('A1:D1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `CIVET MANAGEMENT MIS — IMPORT ERROR REPORT (Batch #${batchId.substring(0, 8)})`;
    titleCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8423A' } };

    const headerRow = worksheet.getRow(2);
    headerRow.values = ['Excel Row #', 'Field in Error', 'Error Description', 'Row Data Details'];
    headerRow.eachCell(c => {
      c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F2A4A' } };
    });

    let currentExcelRow = 3;
    errorRows.forEach(r => {
      r.errors.forEach(err => {
        const row = worksheet.getRow(currentExcelRow++);
        row.values = [
          r.rowNumber,
          err.field,
          err.message,
          JSON.stringify(r.data)
        ];
        row.getCell(2).font = { bold: true, color: { argb: 'FFC8423A' } };
      });
    });

    worksheet.columns = [
      { width: 14 },
      { width: 22 },
      { width: 45 },
      { width: 50 }
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    return {
      buffer,
      fileName: `Civet_Import_Errors_${batchId.substring(0, 8)}.xlsx`
    };
  }
};

module.exports = { excelService };
