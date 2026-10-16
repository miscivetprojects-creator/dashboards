const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const aggregationService = require('../services/aggregationService');
const pdfService = require('../services/pdfService');
const router = express.Router();
router.use(authMiddleware);
function parseFilters(query) {
  return {
    year: query.year || query.financialYear || 'All',
    quarter: query.quarter || 'All',
    month: query.month || 'All',
    from_date: query.from_date || query.fromDate || query.from || '',
    to_date: query.to_date || query.toDate || query.to || '',
    department: query.department || 'All',
    location: query.location || 'All',
    service_type: query.service_type || 'All',
    report_type: query.report_type || 'All',
    vendor: query.vendor || 'All',
    category: query.category || 'All',
    equipment_type: query.equipment_type || 'All',
    viewBy: query.viewBy || 'monthly'
  };
}
router.get('/main', async (req, res) => {
  try {
    const filters = parseFilters(req.query);
    const data = await aggregationService.getMainDashboard(filters);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get('/pm', async (req, res) => {
  try {
    const filters = parseFilters(req.query);
    const data = await aggregationService.getPMDashboard(filters);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get('/stores', async (req, res) => {
  try {
    const filters = parseFilters(req.query);
    const data = await aggregationService.getStoresDashboard(filters);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get('/fuel', async (req, res) => {
  try {
    const filters = parseFilters(req.query);
    const data = await aggregationService.getFuelDashboard(filters);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get('/mms', async (req, res) => {
  try {
    const filters = parseFilters(req.query);
    const data = await aggregationService.getStoresDashboard(filters);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get('/accounts', async (req, res) => {
  try {
    const filters = parseFilters(req.query);
    const data = await aggregationService.getAccountsDashboard(filters);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get('/admin', async (req, res) => {
  try {
    const filters = parseFilters(req.query);
    const data = await aggregationService.getAdminDashboard(filters);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get('/planning', async (req, res) => {
  try {
    const filters = parseFilters(req.query);
    const data = await aggregationService.getPlanningDashboard(filters);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get('/department/:deptCode', async (req, res) => {
  try {
    const filters = parseFilters(req.query);
    const deptCode = decodeURIComponent(req.params.deptCode);
    const data = await aggregationService.getDepartmentDashboard(deptCode, filters);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get('/it', async (req, res) => {
  try {
    const filters = parseFilters(req.query);
    const data = await aggregationService.getDepartmentDashboard('IT & MIS', filters);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get('/mis', async (req, res) => {
  try {
    const filters = parseFilters(req.query);
    const data = await aggregationService.getDepartmentDashboard('IT & MIS', filters);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get('/location/:locationName', async (req, res) => {
  try {
    const filters = parseFilters(req.query);
    const locationName = decodeURIComponent(req.params.locationName);
    const data = await aggregationService.getLocationDashboard(locationName, filters);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.post('/export-pdf', async (req, res) => {
  try {
    let { title, subtitle, dateRange, kpis, tables, charts, filters } = req.body;
    if (!tables || tables.length === 0) {
      const mainData = await aggregationService.getMainDashboard(filters || {});
      if (!kpis || kpis.length === 0) {
        const k = mainData.kpis || {};
        kpis = [
          { label: 'Total Payments', value: k.totalPayments?.formatted || 'Rs. 0' },
          { label: 'Materials & Fuel (MMS) Spend', value: k.storesExp?.formatted || 'Rs. 0' },
          { label: 'Accounts & Operations Spend', value: k.accountsExp?.formatted || 'Rs. 0' },
          { label: k.fuelVolume?.label || 'Operational Volume', value: k.fuelVolume?.formatted || '0' }
        ];
      }

      const deptOverview = mainData.departmentOverview || [];
      const deptRows = deptOverview.map(d => [
        d.department_name || d.id,
        d.paidFormatted || 'Rs. 0',
        String(d.recordsCount ?? 0),
        d.indicator || 'Operational',
        d.isReporting || d.paid > 0 ? 'Active' : 'Pending'
      ]);

      const locSpending = mainData.charts?.locationWiseSpending || [];
      const locRows = locSpending.map(l => [
        l.name || l.location,
        l.amountFormatted || ('Rs. ' + Number(l.amount || 0).toLocaleString('en-IN')),
        `${l.percentage || 0}%`,
        l.amount > 0 ? 'Active Spend' : 'No Spend'
      ]);

      const coverageMatrix = mainData.coverageMatrix || [];
      const covRows = coverageMatrix.map(c => [
        c.location_name || c.location_id,
        c.departments?.PM?.status || 'Missing',
        c.departments?.MMS?.status || c.departments?.STORES?.status || 'Missing',
        c.departments?.ACCOUNTS?.status || 'Missing',
        c.departments?.ADMIN?.status || 'Missing',
        c.departments?.PLANNING?.status || 'Missing',
        `${c.coveragePercent || 0}%`
      ]);

      tables = [
        {
          title: 'Department Overview & Operational Spending',
          subtitle: 'Summary of verified payments, valid logs and key metrics across divisions',
          headers: ['Department', 'Disbursements', 'Records', 'Operational Key Metric', 'Status'],
          colWidths: [28, 22, 12, 26, 12],
          aligns: ['left', 'right', 'center', 'left', 'center'],
          rows: deptRows
        },
        {
          title: 'Project Division (Site) Spending Distribution',
          subtitle: 'Consolidated disbursements mapped to active construction project locations',
          headers: ['Project Division', 'Total Recorded Spend', 'Share %', 'Operational Status'],
          colWidths: [40, 26, 16, 18],
          aligns: ['left', 'right', 'center', 'center'],
          rows: locRows
        },
        {
          title: 'Submission Compliance Matrix',
          subtitle: 'Monthly expectation adherence across operational divisions and project divisions',
          headers: ['Project Division', 'P&M', 'MMS', 'Accounts', 'Admin', 'Planning', 'Coverage'],
          colWidths: [26, 12, 12, 14, 12, 12, 12],
          aligns: ['left', 'center', 'center', 'center', 'center', 'center', 'center'],
          rows: covRows
        }
      ];
      charts = req.body.charts || mainData.charts;
    } else {
      charts = req.body.charts || null;
    }

    const pdfBuffer = await pdfService.generateDashboardPdf({
      title: title || 'CIVET Management MIS Executive Report',
      subtitle: subtitle || 'CIVET PROJECTS PRIVATE LIMITED — Executive MIS Overview',
      dateRange: dateRange || 'Current Financial Period',
      kpis: kpis || [],
      tables: tables || [],
      charts: charts || null,
      generatedBy: req.user ? req.user.email : 'Executive Management'
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Civet_Report_${Date.now()}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate PDF: ' + err.message });
  }
});
module.exports = router;