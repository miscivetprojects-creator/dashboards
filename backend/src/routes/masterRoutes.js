const express = require('express');
const ExcelJS = require('exceljs');
const multer = require('multer');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');
const { getCollection } = require('../db/mongoClient');
const { authService } = require('../services/authService');
const pdfService = require('../services/pdfService');
const router = express.Router();
router.use(authMiddleware);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

const blackBorder = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } }
};

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

function getCollectionCodePrefix(collectionName) {
  const prefixMap = {
    vendors: 'VND',
    project_locations: 'LOC',
    equipment_types: 'EQP',
    assets: 'AST',
    material_items: 'MAT',
    service_types: 'SRV',
    departments: 'DPT',
    fuel_types: 'FUL',
    payment_types: 'PAY'
  };
  return prefixMap[collectionName] || 'REF';
}

function getCollectionDisplayName(collectionName) {
  const map = {
    departments: 'Departments',
    project_locations: 'Project Divisions',
    equipment_types: 'Equipment Types',
    assets: 'Assets & Machinery',
    material_items: 'Material Items',
    vendors: 'Approved Vendors',
    service_types: 'Service Types',
    fuel_types: 'Fuel Types',
    payment_types: 'Payment Types',
    report_schemas: 'Report Schemas'
  };
  return map[collectionName] || collectionName.replace(/_/g, ' ').toUpperCase();
}

async function generateNextSeriesCode(coll, prefix) {
  const allDocs = await coll.find().toArray();
  let maxSeq = 0;
  const regex = new RegExp(`^${prefix}-(\\d+)$`, 'i');

  for (const doc of allDocs) {
    const raw = doc.code || doc.asset_code || doc.item_code || doc.id || '';
    const match = String(raw).match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  const nextNum = (maxSeq > 0 ? maxSeq : allDocs.length) + 1;
  return `${prefix}-${String(nextNum).padStart(4, '0')}`;
}

function createMasterCrudRoutes(collectionName) {
  const subRouter = express.Router();

  subRouter.get('/export/excel', async (req, res) => {
    try {
      const coll = getCollection(collectionName);
      const items = await coll.find({ status: { $ne: 'inactive' } }).sort({ code: 1, name: 1 }).toArray();
      const prefix = getCollectionCodePrefix(collectionName);
      const label = getCollectionDisplayName(collectionName);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(label.substring(0, 31));

      worksheet.mergeCells('A1:E1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = `CIVET PROJECTS PRIVATE LIMITED — MASTER DATA: ${label.toUpperCase()}`;
      titleCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F2A4A' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(1).height = 30;

      for (let col = 1; col <= 5; col++) {
        worksheet.getRow(1).getCell(col).border = blackBorder;
      }

      const isLoc = collectionName === 'project_locations';
      const headers = isLoc 
        ? ['Code', 'Project Division', 'Project Name', 'Unit / Type', 'Created Date']
        : ['Code', 'Name / Description', 'Category / Details', 'Unit / Type', 'Created Date'];
      const headerRow = worksheet.getRow(2);
      headerRow.values = headers;
      headerRow.height = 22;
      headerRow.eachCell(c => {
        c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F6FEB' } };
        c.alignment = { vertical: 'middle', horizontal: 'center' };
        c.border = blackBorder;
      });

      items.forEach((item, idx) => {
        let code = item.code || item.asset_code || item.item_code || item.id;
        if (!code || /^[0-9a-fA-F]{24}$/.test(String(code))) {
          code = `${prefix}-${String(idx + 1).padStart(4, '0')}`;
        }
        const row = worksheet.getRow(idx + 3);
        row.values = [
          code,
          item.name || item.full_name || item.report_name || item.item_name || '',
          isLoc ? (item.project_name || item.category || '') : (item.category || item.department_id || item.state || ''),
          item.unit || item.type || '',
          formatDateDDMMYYYY(item.created_at || new Date())
        ];
        row.height = 18;
        row.eachCell((c, colNum) => {
          c.font = { name: 'Calibri', size: 10, color: { argb: 'FF000000' } };
          c.border = blackBorder;
          if (colNum === 1 || colNum === 4 || colNum === 5) {
            c.alignment = { vertical: 'middle', horizontal: 'center' };
          } else {
            c.alignment = { vertical: 'middle', horizontal: 'left' };
          }
        });
      });

      worksheet.columns = [
        { width: 18 },
        { width: 36 },
        { width: 26 },
        { width: 16 },
        { width: 16 }
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="Civet_Master_${collectionName}_${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.send(buffer);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  subRouter.get('/export/pdf', async (req, res) => {
    try {
      const coll = getCollection(collectionName);
      const items = await coll.find({ status: { $ne: 'inactive' } }).sort({ code: 1, name: 1 }).toArray();
      const prefix = getCollectionCodePrefix(collectionName);
      const label = getCollectionDisplayName(collectionName);

      const isLoc = collectionName === 'project_locations';
      const headers = isLoc 
        ? ['Code', 'Project Division', 'Project Name', 'Unit / Type', 'Created Date']
        : ['Code', 'Name / Description', 'Category / Details', 'Unit / Type', 'Created Date'];
      const rows = items.map((item, idx) => {
        let code = item.code || item.asset_code || item.item_code || item.id;
        if (!code || /^[0-9a-fA-F]{24}$/.test(String(code))) {
          code = `${prefix}-${String(idx + 1).padStart(4, '0')}`;
        }
        return [
          code,
          item.name || item.full_name || item.report_name || item.item_name || '',
          isLoc ? (item.project_name || item.category || '-') : (item.category || item.department_id || item.state || '-'),
          item.unit || item.type || '-',
          formatDateDDMMYYYY(item.created_at || new Date())
        ];
      });

      const pdfBuffer = await pdfService.generateTablePdf({
        title: `MASTER DATA: ${label.toUpperCase()}`,
        subtitle: 'Configured master database entities for system wide attribution',
        headers,
        rows,
        colWidths: [18, 40, 22, 12, 14],
        aligns: ['center', 'left', 'left', 'center', 'center'],
        generatedBy: req.user ? req.user.email : 'Administrator',
        orientation: 'portrait'
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Civet_Master_${collectionName}_${new Date().toISOString().split('T')[0]}.pdf"`);
      res.send(pdfBuffer);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  subRouter.get('/template', async (req, res) => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Import Template');
      const prefix = getCollectionCodePrefix(collectionName);
      const label = getCollectionDisplayName(collectionName);

      worksheet.mergeCells('A1:D1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = `CIVET PROJECTS — ${label.toUpperCase()} IMPORT TEMPLATE`;
      titleCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F2A4A' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(1).height = 28;

      const isLoc = collectionName === 'project_locations';
      const headerRow = worksheet.getRow(2);
      headerRow.values = isLoc
        ? ['Code (Optional)', 'Project Division * (Required)', 'Project Name (Optional)', 'Opening Balance (Optional)']
        : ['Code (Optional)', 'Name * (Required)', 'Category (Optional)', 'Unit / Type (Optional)'];
      headerRow.height = 22;
      headerRow.eachCell(c => {
        c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F6FEB' } };
        c.alignment = { vertical: 'middle', horizontal: 'center' };
        c.border = blackBorder;
      });

      const sampleRows = isLoc ? [
        [`${prefix}-0001`, 'Khammam', 'Khammam Water Supply Project', '0'],
        [`${prefix}-0002`, 'Jadcherla', 'Jadcherla Highway Project', '0']
      ] : [
        [`${prefix}-0001`, `Sample ${label} 1`, 'General', 'Nos'],
        [`${prefix}-0002`, `Sample ${label} 2`, 'Primary', 'MT']
      ];

      sampleRows.forEach((r, idx) => {
        const row = worksheet.getRow(idx + 3);
        row.values = r;
        row.height = 18;
        row.eachCell(c => {
          c.font = { name: 'Calibri', size: 10, color: { argb: 'FF000000' } };
          c.border = blackBorder;
        });
      });

      worksheet.columns = [
        { width: 22 },
        { width: 32 },
        { width: 24 },
        { width: 20 }
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="Civet_${collectionName}_template.xlsx"`);
      res.send(buffer);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  subRouter.post('/bulk-import', requireRole(['Director', 'Admin']), upload.single('file'), async (req, res) => {
    try {
      const coll = getCollection(collectionName);
      const prefix = getCollectionCodePrefix(collectionName);
      let itemsToProcess = [];

      if (req.file) {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer);
        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
          return res.status(400).json({ error: 'Uploaded Excel file is empty.' });
        }
        let headers = [];
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1 || rowNumber === 2) {
            const vals = [];
            row.eachCell(c => vals.push(String(c.value || '').trim()));
            if (vals.some(v => v.toLowerCase().includes('name') || v.toLowerCase().includes('code'))) {
              headers = vals.map(v => v.toLowerCase());
              return;
            }
          }
          if (headers.length === 0) return;
          const rowData = {};
          row.eachCell((cell, colNumber) => {
            const h = headers[colNumber - 1];
            if (h) rowData[h] = cell.value;
          });
          itemsToProcess.push(rowData);
        });
      } else if (Array.isArray(req.body.items)) {
        itemsToProcess = req.body.items;
      }

      if (itemsToProcess.length === 0) {
        return res.status(400).json({ error: 'No data rows found to import.' });
      }

      let insertedCount = 0;
      let skippedCount = 0;

      for (let i = 0; i < itemsToProcess.length; i++) {
        const row = itemsToProcess[i];
        let name = '';
        let code = '';
        let category = '';
        let unit = '';

        for (const [k, v] of Object.entries(row)) {
          const lk = k.toLowerCase();
          const sv = typeof v === 'object' && v?.text ? String(v.text).trim() : String(v || '').trim();
          if (lk.includes('name') || lk.includes('description') || lk.includes('item')) {
            if (!name) name = sv;
          } else if (lk.includes('code') || lk.includes('identifier')) {
            if (!code) code = sv;
          } else if (lk.includes('category') || lk.includes('type') || lk.includes('short')) {
            if (!category) category = sv;
          } else if (lk.includes('unit') || lk.includes('uom')) {
            if (!unit) unit = sv;
          }
        }

        if (!name) {
          skippedCount++;
          continue;
        }

        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const existingName = await coll.findOne({
          status: { $ne: 'inactive' },
          $or: [
            { name: { $regex: new RegExp(`^${escapedName}$`, 'i') } },
            { full_name: { $regex: new RegExp(`^${escapedName}$`, 'i') } },
            { report_name: { $regex: new RegExp(`^${escapedName}$`, 'i') } }
          ]
        });

        if (existingName) {
          skippedCount++;
          continue;
        }

        if (!code || /^[0-9a-fA-F]{24}$/.test(String(code))) {
          code = await generateNextSeriesCode(coll, prefix);
        } else {
          const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const existingCode = await coll.findOne({
            status: { $ne: 'inactive' },
            $or: [
              { code: { $regex: new RegExp(`^${escapedCode}$`, 'i') } },
              { id: { $regex: new RegExp(`^${escapedCode}$`, 'i') } }
            ]
          });
          if (existingCode) {
            code = await generateNextSeriesCode(coll, prefix);
          }
        }

        const newDoc = {
          name,
          full_name: name,
          code,
          id: code,
          category: category || '',
          project_name: collectionName === 'project_locations' ? (category || '') : undefined,
          unit: unit || '',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
          created_by: req.user ? req.user.email : 'bulk_import'
        };

        await coll.insertOne(newDoc);
        insertedCount++;
      }

      res.json({
        success: true,
        message: `Bulk import completed: ${insertedCount} items inserted, ${skippedCount} items skipped.`,
        insertedCount,
        skippedCount
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  subRouter.get('/next-code', async (req, res) => {
    try {
      const coll = getCollection(collectionName);
      const prefix = getCollectionCodePrefix(collectionName);
      const nextCode = await generateNextSeriesCode(coll, prefix);
      res.json({ code: nextCode });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  subRouter.get('/', async (req, res) => {
    try {
      const coll = getCollection(collectionName);
      const query = req.query.all === 'true' ? {} : { status: { $ne: 'inactive' } };
      const items = await coll.find(query).toArray();
      const prefix = getCollectionCodePrefix(collectionName);
      const sanitized = items.map((item, idx) => {
        let code = item.code || item.asset_code || item.item_code || item.report_type_id || item.id;
        if (!code || /^[0-9a-fA-F]{24}$/.test(String(code))) {
          code = `${prefix}-${String(idx + 1).padStart(4, '0')}`;
        }
        return {
          ...item,
          code
        };
      });

      const seenCodes = new Set();
      const seenNames = new Set();
      const deduplicated = [];
      for (const item of sanitized) {
        const cKey = (item.code || '').trim().toLowerCase();
        const pKey = (item.project_name || item.category || '').trim().toLowerCase();
        const nKey = (item.name || item.full_name || item.report_name || item.item_name || '').trim().toLowerCase();
        if (cKey && seenCodes.has(cKey)) continue;
        if (collectionName === 'project_locations') {
          const comboKey = `${nKey}:::${pKey}`;
          if (comboKey && seenNames.has(comboKey)) continue;
          if (comboKey) seenNames.add(comboKey);
        } else {
          if (nKey && seenNames.has(nKey)) continue;
          if (nKey) seenNames.add(nKey);
        }
        if (cKey) seenCodes.add(cKey);
        deduplicated.push(item);
      }

      res.json(deduplicated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  subRouter.post('/', requireRole(['Director', 'Admin']), async (req, res) => {
    try {
      const coll = getCollection(collectionName);
      const name = (req.body.name || req.body.full_name || req.body.report_name || '').trim();

      if (collectionName === 'project_locations') {
        const pVal = (req.body.project_name !== undefined ? req.body.project_name : req.body.category || '').trim();
        if (name && pVal && pVal !== '-' && pVal !== 'Project Site') {
          const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const escapedPVal = pVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const existingCombo = await coll.findOne({
            status: { $ne: 'inactive' },
            name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
            $or: [
              { project_name: { $regex: new RegExp(`^${escapedPVal}$`, 'i') } },
              { category: { $regex: new RegExp(`^${escapedPVal}$`, 'i') } }
            ]
          });
          if (existingCombo) {
            return res.status(409).json({ error: `An item with project division "${name}" and project name "${pVal}" already exists.` });
          }
        }
      } else if (name) {
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const existingName = await coll.findOne({
          status: { $ne: 'inactive' },
          $or: [
            { name: { $regex: new RegExp(`^${escapedName}$`, 'i') } },
            { full_name: { $regex: new RegExp(`^${escapedName}$`, 'i') } },
            { report_name: { $regex: new RegExp(`^${escapedName}$`, 'i') } }
          ]
        });

        if (existingName) {
          return res.status(409).json({ error: `An item with the name "${name}" already exists.` });
        }
      }

      const prefix = getCollectionCodePrefix(collectionName);
      let code = (req.body.code || req.body.asset_code || req.body.item_code || '').trim();

      if (!code || /^[0-9a-fA-F]{24}$/.test(String(code))) {
        code = await generateNextSeriesCode(coll, prefix);
      } else {
        const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const existingCode = await coll.findOne({
          status: { $ne: 'inactive' },
          $or: [
            { code: { $regex: new RegExp(`^${escapedCode}$`, 'i') } },
            { id: { $regex: new RegExp(`^${escapedCode}$`, 'i') } },
            { asset_code: { $regex: new RegExp(`^${escapedCode}$`, 'i') } },
            { item_code: { $regex: new RegExp(`^${escapedCode}$`, 'i') } }
          ]
        });

        if (existingCode) {
          return res.status(409).json({ error: `An item with the code "${code}" already exists.` });
        }
      }

      const doc = {
        ...req.body,
        code,
        id: req.body.id || code,
        status: req.body.status || 'active',
        created_at: new Date(),
        updated_at: new Date(),
        created_by: req.user ? req.user.email : 'system'
      };
      if (collectionName === 'project_locations') {
        const pVal = req.body.project_name !== undefined ? req.body.project_name : req.body.category;
        if (pVal !== undefined) {
          doc.category = pVal;
          doc.project_name = pVal;
        }
      }
      delete doc._id;

      const result = await coll.insertOne(doc);
      res.json({ success: true, insertedId: result.insertedId, code });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  subRouter.put('/:id', requireRole(['Director', 'Admin']), async (req, res) => {
    try {
      const coll = getCollection(collectionName);
      const id = req.params.id;
      let query;
      let objectId = null;
      try {
        const { ObjectId } = require('mongodb');
        objectId = new ObjectId(id);
        query = { _id: objectId };
      } catch {
        query = { _id: id };
      }

      const current = await coll.findOne(query) || (objectId ? await coll.findOne({ _id: id }) : null);
      if (!current) {
        return res.status(404).json({ error: 'Item not found' });
      }

      const name = (req.body.name || req.body.full_name || req.body.report_name || '').trim();
      const currentName = (current.name || current.full_name || current.report_name || '').trim();
      if (collectionName === 'project_locations') {
        const pVal = (req.body.project_name !== undefined ? req.body.project_name : req.body.category || '').trim();
        const currentPVal = (current.project_name !== undefined ? current.project_name : current.category || '').trim();
        if ((name && name.toLowerCase() !== currentName.toLowerCase()) || (pVal && pVal.toLowerCase() !== currentPVal.toLowerCase())) {
          if (name && pVal && pVal !== '-' && pVal !== 'Project Site') {
            const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const escapedPVal = pVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const excludeIds = [current._id, id, objectId].filter(Boolean);
            const existingCombo = await coll.findOne({
              _id: { $nin: excludeIds },
              status: { $ne: 'inactive' },
              name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
              $or: [
                { project_name: { $regex: new RegExp(`^${escapedPVal}$`, 'i') } },
                { category: { $regex: new RegExp(`^${escapedPVal}$`, 'i') } }
              ]
            });
            if (existingCombo) {
              return res.status(409).json({ error: `Another item with project division "${name}" and project name "${pVal}" already exists.` });
            }
          }
        }
      } else if (name && name.toLowerCase() !== currentName.toLowerCase()) {
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const excludeIds = [current._id, id, objectId].filter(Boolean);
        const existingName = await coll.findOne({
          _id: { $nin: excludeIds },
          status: { $ne: 'inactive' },
          $or: [
            { name: { $regex: new RegExp(`^${escapedName}$`, 'i') } },
            { full_name: { $regex: new RegExp(`^${escapedName}$`, 'i') } },
            { report_name: { $regex: new RegExp(`^${escapedName}$`, 'i') } }
          ]
        });

        if (existingName) {
          return res.status(409).json({ error: `Another item with the name "${name}" already exists.` });
        }
      }

      const code = (req.body.code || req.body.asset_code || req.body.item_code || '').trim();
      const currentCode = (current.code || current.asset_code || current.item_code || current.id || '').trim();
      if (code && code.toLowerCase() !== currentCode.toLowerCase()) {
        const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const excludeIds = [current._id, id, objectId].filter(Boolean);
        const existingCode = await coll.findOne({
          _id: { $nin: excludeIds },
          status: { $ne: 'inactive' },
          $or: [
            { code: { $regex: new RegExp(`^${escapedCode}$`, 'i') } },
            { id: { $regex: new RegExp(`^${escapedCode}$`, 'i') } },
            { asset_code: { $regex: new RegExp(`^${escapedCode}$`, 'i') } },
            { item_code: { $regex: new RegExp(`^${escapedCode}$`, 'i') } }
          ]
        });

        if (existingCode) {
          return res.status(409).json({ error: `Another item with the code "${code}" already exists.` });
        }
      }

      const updateData = { ...req.body, updated_at: new Date(), updated_by: req.user ? req.user.email : 'system' };
      if (collectionName === 'project_locations') {
        const pVal = req.body.project_name !== undefined ? req.body.project_name : req.body.category;
        if (pVal !== undefined) {
          updateData.category = pVal;
          updateData.project_name = pVal;
        }
      }
      delete updateData._id;
      await coll.updateOne({ _id: current._id }, { $set: updateData });
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  subRouter.delete('/:id', requireRole(['Director', 'Admin']), async (req, res) => {
    try {
      const coll = getCollection(collectionName);
      const id = req.params.id;
      let query;
      try {
        const { ObjectId } = require('mongodb');
        query = { _id: new ObjectId(id) };
      } catch {
        query = { _id: id };
      }
      await coll.updateOne(query, { $set: { status: 'inactive', deleted_at: new Date() } });
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  return subRouter;
}

router.use('/departments', createMasterCrudRoutes('departments'));
router.use('/locations', createMasterCrudRoutes('project_locations'));
router.use('/equipment-types', createMasterCrudRoutes('equipment_types'));
router.use('/assets', createMasterCrudRoutes('assets'));
router.use('/materials', createMasterCrudRoutes('material_items'));
router.use('/vendors', createMasterCrudRoutes('vendors'));
router.use('/service-types', createMasterCrudRoutes('service_types'));
router.use('/services', createMasterCrudRoutes('service_types'));
router.use('/report-schemas', createMasterCrudRoutes('report_schemas'));
router.use('/fuel-types', createMasterCrudRoutes('fuel_types'));
router.use('/payment-types', createMasterCrudRoutes('payment_types'));

router.get('/users', requireRole(['Director', 'Admin']), async (req, res) => {
  try {
    const usersColl = getCollection('users');
    const users = await usersColl.find({}, { projection: { password_hash: 0, passwordHash: 0 } }).toArray();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users', requireRole(['Director', 'Admin']), async (req, res) => {
  try {
    const usersColl = getCollection('users');
    const { email, password, fullName, role, department, location } = req.body;
    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ error: 'Email, password, full name and role are required.' });
    }
    const existing = await usersColl.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'User with this email already exists.' });
    }
    const passwordHash = await authService.hashPassword(password);
    const userDoc = {
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      full_name: fullName.trim(),
      role,
      department_id: department || 'All',
      location_id: location || 'All',
      status: 'active',
      isActive: true,
      created_at: new Date(),
      updated_at: new Date()
    };
    const result = await usersColl.insertOne(userDoc);
    res.json({ success: true, userId: result.insertedId });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/users/:id/status', requireRole(['Director', 'Admin']), async (req, res) => {
  try {
    const usersColl = getCollection('users');
    const id = req.params.id;
    let query;
    try {
      const { ObjectId } = require('mongodb');
      query = { _id: new ObjectId(id) };
    } catch {
      query = { _id: id };
    }
    const { status, isActive } = req.body;
    const finalStatus = status || (isActive ? 'active' : 'inactive');
    await usersColl.updateOne(query, { $set: { status: finalStatus, isActive: finalStatus === 'active', updated_at: new Date() } });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/users/:id/reset-password', requireRole(['Director', 'Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    await authService.resetPasswordByAdmin(id, newPassword);
    res.json({ success: true, message: 'Password has been reset.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/users/export/excel', requireRole(['Director', 'Admin']), async (req, res) => {
  try {
    const usersColl = getCollection('users');
    const users = await usersColl.find({}).sort({ email: 1 }).toArray();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('User Accounts');

    worksheet.mergeCells('A1:G1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'CIVET PROJECTS PRIVATE LIMITED — MASTER DATA: USER ACCOUNTS & ROLES';
    titleCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F2A4A' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 30;

    for (let col = 1; col <= 7; col++) {
      worksheet.getRow(1).getCell(col).border = blackBorder;
    }

    const headers = ['Email Address', 'Full Name', 'Role', 'Department', 'Location / Site', 'Status', 'Created Date'];
    const headerRow = worksheet.getRow(2);
    headerRow.values = headers;
    headerRow.height = 22;
    headerRow.eachCell(c => {
      c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F6FEB' } };
      c.alignment = { vertical: 'middle', horizontal: 'center' };
      c.border = blackBorder;
    });

    users.forEach((u, idx) => {
      const row = worksheet.getRow(idx + 3);
      row.values = [
        u.email,
        u.full_name || u.fullName || '',
        u.role || 'Executive',
        u.department_id || u.department || 'All',
        u.location_id || u.location || 'All',
        u.status || (u.isActive ? 'active' : 'inactive'),
        formatDateDDMMYYYY(u.created_at || new Date())
      ];
      row.height = 18;
      row.eachCell((c, colNum) => {
        c.font = { name: 'Calibri', size: 10, color: { argb: 'FF000000' } };
        c.border = blackBorder;
        if (colNum === 3 || colNum === 6 || colNum === 7) {
          c.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
          c.alignment = { vertical: 'middle', horizontal: 'left' };
        }
      });
    });

    worksheet.columns = [
      { width: 28 },
      { width: 24 },
      { width: 16 },
      { width: 20 },
      { width: 20 },
      { width: 14 },
      { width: 16 }
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Civet_Master_Users_${new Date().toISOString().split('T')[0]}.xlsx"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users/export/pdf', requireRole(['Director', 'Admin']), async (req, res) => {
  try {
    const usersColl = getCollection('users');
    const users = await usersColl.find({}).sort({ email: 1 }).toArray();

    const headers = ['Email Address', 'Full Name', 'Role', 'Department', 'Location', 'Status', 'Created Date'];
    const rows = users.map(u => [
      u.email,
      u.full_name || u.fullName || '',
      u.role || 'Executive',
      u.department_id || u.department || 'All',
      u.location_id || u.location || 'All',
      u.status || (u.isActive ? 'Active' : 'Inactive'),
      formatDateDDMMYYYY(u.created_at || new Date())
    ]);

    const pdfBuffer = await pdfService.generateTablePdf({
      title: 'MASTER DATA: USER ACCOUNTS & ROLES',
      subtitle: 'System authorized operator accounts and role-based permissions matrix',
      headers,
      rows,
      colWidths: [26, 20, 12, 14, 14, 10, 10],
      aligns: ['left', 'left', 'center', 'left', 'left', 'center', 'center'],
      generatedBy: req.user ? req.user.email : 'Administrator',
      orientation: 'landscape'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Civet_Master_Users_${new Date().toISOString().split('T')[0]}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users/template', requireRole(['Director', 'Admin']), async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('User Template');

    worksheet.mergeCells('A1:F1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'CIVET PROJECTS — USER ACCOUNTS BULK IMPORT TEMPLATE';
    titleCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F2A4A' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 28;

    const headerRow = worksheet.getRow(2);
    headerRow.values = ['Email * (Required)', 'Full Name * (Required)', 'Role (Director/Admin/HOD/Site Incharge/Executive)', 'Department (Optional)', 'Location (Optional)', 'Password (Optional - default Civet@123)'];
    headerRow.height = 22;
    headerRow.eachCell(c => {
      c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F6FEB' } };
      c.alignment = { vertical: 'middle', horizontal: 'center' };
      c.border = blackBorder;
    });

    const sampleRows = [
      ['user1@civetprojects.com', 'Rajesh Sharma', 'Site Incharge', 'Plant & Machinery', 'Khammam', 'Civet@123'],
      ['user2@civetprojects.com', 'Suresh Kumar', 'Executive', 'Stores & Inventory', 'Sangareddy', 'Civet@123']
    ];

    sampleRows.forEach((r, idx) => {
      const row = worksheet.getRow(idx + 3);
      row.values = r;
      row.height = 18;
      row.eachCell(c => {
        c.font = { name: 'Calibri', size: 10, color: { argb: 'FF000000' } };
        c.border = blackBorder;
      });
    });

    worksheet.columns = [
      { width: 30 },
      { width: 26 },
      { width: 24 },
      { width: 22 },
      { width: 20 },
      { width: 24 }
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Civet_users_template.xlsx"');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users/bulk-import', requireRole(['Director', 'Admin']), upload.single('file'), async (req, res) => {
  try {
    const usersColl = getCollection('users');
    let itemsToProcess = [];

    if (req.file) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        return res.status(400).json({ error: 'Uploaded file is empty.' });
      }
      let headers = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1 || rowNumber === 2) {
          const vals = [];
          row.eachCell(c => vals.push(String(c.value || '').trim()));
          if (vals.some(v => v.toLowerCase().includes('email') || v.toLowerCase().includes('name'))) {
            headers = vals.map(v => v.toLowerCase());
            return;
          }
        }
        if (headers.length === 0) return;
        const rowData = {};
        row.eachCell((cell, colNumber) => {
          const h = headers[colNumber - 1];
          if (h) rowData[h] = cell.value;
        });
        itemsToProcess.push(rowData);
      });
    } else if (Array.isArray(req.body.items)) {
      itemsToProcess = req.body.items;
    }

    if (itemsToProcess.length === 0) {
      return res.status(400).json({ error: 'No user records found to import.' });
    }

    let insertedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < itemsToProcess.length; i++) {
      const row = itemsToProcess[i];
      let email = '';
      let fullName = '';
      let role = 'Executive';
      let department = 'All';
      let location = 'All';
      let password = 'Civet@123';

      for (const [k, v] of Object.entries(row)) {
        const lk = k.toLowerCase();
        const sv = typeof v === 'object' && v?.text ? String(v.text).trim() : String(v || '').trim();
        if (lk.includes('email')) {
          email = sv.toLowerCase();
        } else if (lk.includes('name')) {
          fullName = sv;
        } else if (lk.includes('role')) {
          if (sv) role = sv;
        } else if (lk.includes('dept') || lk.includes('department')) {
          if (sv) department = sv;
        } else if (lk.includes('loc') || lk.includes('site') || lk.includes('location')) {
          if (sv) location = sv;
        } else if (lk.includes('password') || lk.includes('pwd')) {
          if (sv && sv.length >= 6) password = sv;
        }
      }

      if (!email || !fullName) {
        skippedCount++;
        continue;
      }

      const existing = await usersColl.findOne({ email });
      if (existing) {
        skippedCount++;
        continue;
      }

      const passwordHash = await authService.hashPassword(password);
      const userDoc = {
        email,
        password_hash: passwordHash,
        full_name: fullName,
        role,
        department_id: department,
        location_id: location,
        status: 'active',
        isActive: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      await usersColl.insertOne(userDoc);
      insertedCount++;
    }

    res.json({
      success: true,
      message: `Bulk import completed: ${insertedCount} users created, ${skippedCount} users skipped.`,
      insertedCount,
      skippedCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;