const { getCollection } = require('../db/mongoClient');
const { getQuarter, getMonthName } = require('../models/schemas');
const { formatIndianCurrency, formatIndianNumber } = require('../utils/formatters');
class AggregationService {
  buildFilter(params = {}) {
    const filter = {
      status: { $ne: 'Rejected' },
      is_latest: { $ne: false }
    };
    const andConditions = [];

    const fromDate = String(params.from_date || params.fromDate || params.from || '').trim();
    const toDate = String(params.to_date || params.toDate || params.to || '').trim();

    if (fromDate || toDate) {
      const dateCondStr = {};
      const dateCondObj = {};
      if (fromDate) {
        dateCondStr.$gte = fromDate;
        dateCondObj.$gte = new Date(fromDate);
      }
      if (toDate) {
        dateCondStr.$lte = toDate;
        dateCondObj.$lte = new Date(toDate + 'T23:59:59.999Z');
      }
      andConditions.push({
        $or: [
          { report_date: dateCondStr },
          { report_date: dateCondObj },
          { 'data.report_date': dateCondStr },
          { 'data.report_date': dateCondObj },
          { 'data.date': dateCondStr },
          { 'data.date': dateCondObj }
        ]
      });
    } else {
      if (params.year && String(params.year).toUpperCase() !== 'ALL') {
        filter.reporting_year = Number(params.year);
      }
      if (params.quarter && String(params.quarter).toUpperCase() !== 'ALL') {
        filter.reporting_quarter = params.quarter;
      }
      if (params.month && String(params.month).toUpperCase() !== 'ALL') {
        filter.reporting_month = Number(params.month);
      }
    }

    if (params.location && params.location !== 'All' && String(params.location).toLowerCase() !== 'all') {
      const locClean = String(params.location).trim();
      const locRegex = new RegExp('^' + locClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');
      andConditions.push({
        $or: [
          { location_id: locClean },
          { location_id: locRegex },
          { location_name: locClean },
          { location_name: locRegex },
          { project_division: locClean },
          { project_division: locRegex },
          { project_division_id: locClean },
          { 'data.location': locClean },
          { 'data.location_id': locClean },
          { 'data.location_name': locClean },
          { 'data.project_division': locClean }
        ]
      });
    }

    if (params.department && params.department !== 'All' && String(params.department).toLowerCase() !== 'all') {
      const dUpper = String(params.department).trim().toUpperCase();
      const pmAliases = ['PM', 'P&M', 'PLANT & MACHINERY', 'PLANT AND MACHINERY', 'DPT-0002', 'FUEL'];
      const storesAliases = ['STORES', 'MMS', 'STORES & INVENTORY', 'STORES AND INVENTORY', 'DPT-0003'];
      const accountsAliases = ['ACCOUNTS', 'FINANCE', 'ACCOUNTS & FINANCE', 'ACCOUNTS AND FINANCE'];
      const adminAliases = ['ADMIN', 'ADMINISTRATION', 'DPT-0004'];
      const itAliases = ['IT', 'MIS', 'IT & MIS', 'IT&MIS', 'DPT-0001'];

      let aliases = [params.department, dUpper];
      if (pmAliases.includes(dUpper)) aliases = ['PM', 'P&M', 'Plant & Machinery', 'Plant and Machinery', 'DPT-0002', 'FUEL'];
      else if (storesAliases.includes(dUpper)) aliases = ['STORES', 'MMS', 'Stores', 'Stores & Inventory', 'Stores and Inventory', 'DPT-0003'];
      else if (accountsAliases.includes(dUpper)) aliases = ['ACCOUNTS', 'Finance', 'Accounts & Finance', 'Accounts and Finance'];
      else if (adminAliases.includes(dUpper)) aliases = ['ADMIN', 'Admin', 'Administration', 'DPT-0004'];
      else if (itAliases.includes(dUpper)) aliases = ['IT', 'MIS', 'IT & MIS', 'IT&MIS', 'DPT-0001'];

      if (pmAliases.includes(dUpper)) {
        andConditions.push({
          $or: [
            { department_id: { $in: aliases } },
            { department_name: { $in: aliases } },
            { report_type_id: 'FUEL_PURCHASE' },
            { report_type_id: 'VEHICLE_UTILIZATION' },
            { category: 'Fuel' },
            { 'data.fuel_type': { $exists: true, $ne: '' } },
            { 'data.department': { $in: aliases } },
            { 'data.department_beneficiary': { $in: aliases } }
          ]
        });
      } else if (storesAliases.includes(dUpper)) {
        andConditions.push({
          $or: [
            { department_id: { $in: aliases } },
            { department_name: { $in: aliases } },
            { report_type_id: 'STORES_PURCHASE' },
            { 'data.department': { $in: aliases } },
            { 'data.department_beneficiary': { $in: aliases } }
          ]
        });
      } else {
        andConditions.push({
          $or: [
            { department_id: { $in: aliases } },
            { department_name: { $in: aliases } },
            { 'data.department': { $in: aliases } },
            { 'data.department_beneficiary': { $in: aliases } }
          ]
        });
      }
    }

    if (params.service_type && params.service_type !== 'All') {
      filter.service_type_id = params.service_type;
    }

    if (params.report_type && params.report_type !== 'All' && String(params.report_type).toLowerCase() !== 'all') {
      const rtUpper = String(params.report_type).trim().toUpperCase();
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
      const aliases = rtMap[rtUpper] || [params.report_type, params.report_type.toUpperCase()];
      andConditions.push({
        $or: [
          { report_type_id: { $in: aliases } },
          { 'data.report_type': { $in: aliases } }
        ]
      });
    }

    if (params.vendor && params.vendor !== 'All') {
      andConditions.push({
        $or: [
          { vendor_id: params.vendor },
          { vendor_name: params.vendor },
          { 'data.vendor': params.vendor },
          { 'data.vendor_name': params.vendor },
          { 'data.ledger_type': params.vendor }
        ]
      });
    }

    if (params.category && params.category !== 'All') {
      filter.category = params.category;
    }
    if (params.equipment_type && params.equipment_type !== 'All') {
      filter.equipment_type = params.equipment_type;
    }

    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    return filter;
  }
  async getDec2025ClosingForLocation(locIdentifier = 'All') {
    const recordsColl = getCollection('monthly_report_records');
    const decRecs = await recordsColl.find({
      reporting_year: 2025,
      reporting_month: 12,
      status: { $ne: 'Rejected' },
      is_latest: { $ne: false }
    }).toArray();

    if (!locIdentifier || locIdentifier === 'All' || String(locIdentifier).toLowerCase() === 'all') {
      return Number(decRecs.reduce((sum, r) => sum + Number(r.closing_balance ?? r.balance ?? r.data?.closing_balance ?? 0), 0).toFixed(2));
    }

    const clean = String(locIdentifier).trim().toLowerCase();
    const cleanNoSpecial = clean.replace(/[^a-z0-9]/g, '');
    const matching = decRecs.filter(r => {
      const lName = String(r.location_name || r.data?.location_name || '').trim().toLowerCase();
      const lId = String(r.location_id || r.data?.location_id || '').trim().toLowerCase();
      const lCode = String(r.location_code || r.data?.location_code || '').trim().toLowerCase();
      const lNameNoSpecial = lName.replace(/[^a-z0-9]/g, '');
      return lName === clean || lId === clean || lCode === clean ||
             (cleanNoSpecial && (lNameNoSpecial === cleanNoSpecial || lNameNoSpecial.includes(cleanNoSpecial) || cleanNoSpecial.includes(lNameNoSpecial)));
    });

    return Number(matching.reduce((sum, r) => sum + Number(r.closing_balance ?? r.balance ?? r.data?.closing_balance ?? 0), 0).toFixed(2));
  }
  async getMainDashboard(params = {}) {
    const recordsColl = getCollection('monthly_report_records');
    const locsColl = getCollection('project_locations');
    const deptsColl = getCollection('departments');
    const expsColl = getCollection('reporting_expectations');
    const filter = this.buildFilter(params);
    const records = await recordsColl.find(filter).toArray();
    const getRecPaid = r => {
      if (r.paid_amount !== undefined && r.paid_amount !== null && !isNaN(Number(r.paid_amount))) {
        return Number(r.paid_amount);
      }
      if (r.data && r.data.paid_amount !== undefined && r.data.paid_amount !== null && !isNaN(Number(r.data.paid_amount))) {
        return Number(r.data.paid_amount);
      }
      const isBoth = String(r.data?.fuel_type || r.fuel_type || '').toLowerCase().includes('both');
      const pCost = Number(r.data?.petrol_total_cost || r.petrol_total_cost || (Number(r.data?.petrol_quantity || r.petrol_quantity || 0) * Number(r.data?.petrol_rate || r.petrol_rate || 0)) || 0);
      const dCost = Number(r.data?.diesel_total_cost || r.diesel_total_cost || (Number(r.data?.diesel_quantity || r.diesel_quantity || 0) * Number(r.data?.diesel_rate || r.diesel_rate || 0)) || 0);
      const bothCost = (isBoth && (pCost > 0 || dCost > 0)) ? (pCost + dCost) : 0;
      return Number(r.total_cost || (r.data && r.data.total_cost) || bothCost || r.cash_and_carry || 0);
    };
    const getRecTotalCost = r => {
      if (r.total_cost !== undefined && r.total_cost !== null && !isNaN(Number(r.total_cost))) {
        return Number(r.total_cost);
      }
      if (r.data && r.data.total_cost !== undefined && r.data.total_cost !== null && !isNaN(Number(r.data.total_cost))) {
        return Number(r.data.total_cost);
      }
      const isBoth = String(r.data?.fuel_type || r.fuel_type || '').toLowerCase().includes('both');
      const pCost = Number(r.data?.petrol_total_cost || r.petrol_total_cost || (Number(r.data?.petrol_quantity || r.petrol_quantity || 0) * Number(r.data?.petrol_rate || r.petrol_rate || 0)) || 0);
      const dCost = Number(r.data?.diesel_total_cost || r.diesel_total_cost || (Number(r.data?.diesel_quantity || r.diesel_quantity || 0) * Number(r.data?.diesel_rate || r.diesel_rate || 0)) || 0);
      const bothCost = (isBoth && (pCost > 0 || dCost > 0)) ? (pCost + dCost) : 0;
      return bothCost > 0 ? bothCost : getRecPaid(r);
    };
    const getRecBalance = r => {
      const total = getRecTotalCost(r);
      const paid = getRecPaid(r);
      return Math.max(0, Number((total - paid).toFixed(2)));
    };
    const totalPayments = records.reduce((sum, r) => sum + getRecPaid(r), 0);
    const totalCost = records.reduce((sum, r) => sum + getRecTotalCost(r), 0);
    const paymentRecords = records.filter(r => getRecPaid(r) > 0);
    const vendorSet = new Set();
    paymentRecords.forEach(r => {
      const v = r.vendor_name || (r.data && (r.data.ledger_type || r.data.vendor_name || r.data.vendor)) || r.vendor_id;
      if (v) vendorSet.add(v);
    });
    const totalVendorCount = vendorSet.size;
    let activeLocations = await locsColl.find({ status: { $ne: 'inactive' }, active: { $ne: false } }).toArray();
    if (activeLocations.length === 0) {
      activeLocations = await locsColl.find({}).toArray();
    }
    const reportingLocSet = new Set();
    records.forEach(r => {
      const lid = r.location_id || (r.data && (r.data.location_id || r.data.location));
      if (lid) {
        const matched = activeLocations.find(l => 
          String(l.id).toLowerCase() === String(lid).toLowerCase() ||
          String(l.name).toLowerCase() === String(lid).toLowerCase() ||
          (l.code && String(l.code).toLowerCase() === String(lid).toLowerCase())
        );
        reportingLocSet.add(matched ? matched.id : lid);
      }
    });
    const totalLocationsConfigured = activeLocations.length;
    const locationsReportingCount = reportingLocSet.size;
    let activeDepts = await deptsColl.find({ status: { $ne: 'inactive' }, active: { $ne: false } }).toArray();
    if (activeDepts.length === 0) {
      activeDepts = await deptsColl.find({}).toArray();
    }
    activeDepts = activeDepts.filter(d => !String(d.name || d.code || d.id || '').toUpperCase().includes('ACCOUNT'));
    const standardDepts = [
      { id: 'PLANNING', code: 'PLANNING', name: 'Project Planning' }
    ];
    for (const std of standardDepts) {
      if (!activeDepts.some(d => String(d.name || d.code || d.id || '').toUpperCase().includes(std.code))) {
        activeDepts.push(std);
      }
    }
    const reportingDeptsSet = new Set();
    records.forEach(r => {
      let did = r.department_id;
      if (did === 'FUEL' || r.report_type_id === 'FUEL_PURCHASE' || r.category === 'Fuel') did = 'PM';
      else if (did === 'STORES' || r.report_type_id === 'STORES_PURCHASE') did = 'MMS';
      if (did) {
        const matched = activeDepts.find(d => String(d.id).toUpperCase() === String(did).toUpperCase());
        reportingDeptsSet.add(matched ? matched.id : did);
      }
    });
    const deptsReportingCount = reportingDeptsSet.size;
    const totalDeptsConfigured = activeDepts.length;
    const serviceSet = new Set(records.map(r => r.service_type_name || r.service_type_id).filter(Boolean));
    const serviceTypesCount = serviceSet.size;
    const monthlyRecordsCount = records.length;
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const effectiveYear = (() => {
      if (params.from_date) {
        const m = String(params.from_date).match(/\b(20\d\d)\b/);
        if (m) return Number(m[1]);
      }
      if (params.to_date) {
        const m = String(params.to_date).match(/\b(20\d\d)\b/);
        if (m) return Number(m[1]);
      }
      if (params.year) {
        if (String(params.year).toUpperCase() === 'ALL') return 'All';
        const y = Number(params.year);
        if (!isNaN(y) && y > 2000) return y;
      }
      const recWithYr = records.find(r => r.reporting_year);
      if (recWithYr) return Number(recWithYr.reporting_year);
      return 2025;
    })();

    let totalMasterOpening = 0;
    if (effectiveYear === 2026) {
      totalMasterOpening = await this.getDec2025ClosingForLocation(params.location || 'All');
    } else {
      totalMasterOpening = activeLocations.reduce((sum, l) => sum + Number(l.opening_balance || 0), 0);
    }

    const locSpendSummary = {};
    records.forEach(r => {
      const divName = r.project_division || r.location_name || (r.data && (r.data.project_division || r.data.location_name || r.data.location)) || r.location_id || 'Unknown';
      if (divName && divName !== 'Unknown') {
        locSpendSummary[divName] = (locSpendSummary[divName] || 0) + getRecPaid(r);
      }
    });
    const topDivisions = Object.entries(locSpendSummary)
      .filter(([name, amt]) => amt > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    let periods = [];
    if (effectiveYear === 'All') {
      const distinctYears = [...new Set(records.map(r => Number(r.reporting_year)).filter(y => y > 2000))].sort((a, b) => a - b);
      if (distinctYears.length === 0) distinctYears.push(2025);
      distinctYears.forEach(yr => {
        months.forEach(m => {
          periods.push({ year: yr, monthNum: m });
        });
      });
    } else {
      months.forEach(m => {
        periods.push({ year: effectiveYear, monthNum: m });
      });
    }

    const enteredMonths = months.filter(m => records.some(r => {
      const rMonth = Number(r.reporting_month) || (r.report_date ? new Date(r.report_date).getMonth() + 1 : 0);
      return rMonth === m;
    }));
    const lastEnteredMonth = enteredMonths.length > 0 ? Math.max(...enteredMonths) : 0;
    let runningMainBalance = totalMasterOpening;

    const spendingTrend = periods.map(p => {
      const m = p.monthNum;
      const yr = p.year;
      const mRecs = records.filter(r => {
        const rMonth = Number(r.reporting_month) || (r.report_date ? new Date(r.report_date).getMonth() + 1 : 0);
        const rYear = Number(r.reporting_year) || (r.report_date ? new Date(r.report_date).getFullYear() : 0);
        return rMonth === m && (effectiveYear === 'All' ? rYear === yr : true);
      });
      const isEntered = mRecs.length > 0;
      const isImmediateNext = (!isEntered && lastEnteredMonth > 0 && m === lastEnteredMonth + 1) || (effectiveYear === 2026 && !isEntered && lastEnteredMonth === 0 && m === 1);
      const sumPaid = mRecs.reduce((acc, r) => acc + getRecPaid(r), 0);
      const sumTotalCost = mRecs.reduce((acc, r) => acc + getRecTotalCost(r), 0);
      let mOpBal = 0;
      let mClBal = 0;
      if (isEntered) {
        mOpBal = runningMainBalance;
        mClBal = Number((mOpBal + sumTotalCost - sumPaid).toFixed(2));
        runningMainBalance = mClBal;
      } else if (isImmediateNext) {
        mOpBal = runningMainBalance;
        mClBal = mOpBal;
      }
      const sumQty = mRecs.reduce((acc, r) => acc + (Number(r.quantity || (r.data && r.data.quantity)) || 0), 0);
      const cashCarryPaid = mRecs.filter(r => {
        const payType = String(r.payment_type || (r.data && r.data.payment_type) || '').toLowerCase();
        const vendor = String(r.vendor_name || r.vendor_id || (r.data && (r.data.vendor || r.data.vendor_name)) || '').toLowerCase();
        const hasCC = (Number(r.cash_and_carry || (r.data && r.data.cash_and_carry)) || 0) > 0;
        const pQ = Number((r.data && r.data.petrol_quantity) || r.petrol_quantity || 0);
        const dQ = Number((r.data && r.data.diesel_quantity) || r.diesel_quantity || 0);
        const q = (pQ + dQ) > 0 ? (pQ + dQ) : Number(r.quantity || (r.data && r.data.quantity) || r.fuel_consumed_litres || 0);
        const rPaid = getRecPaid(r);
        return payType.includes('cash') || vendor.includes('merchant') || hasCC || (rPaid > 0 && q <= 0);
      }).reduce((acc, r) => acc + getRecPaid(r), 0);
      const regularPaid = Math.max(0, sumPaid - cashCarryPaid);

      const divBreakdown = {};
      topDivisions.forEach(divName => {
        const divRecs = mRecs.filter(r => {
          const rDiv = r.project_division || r.location_name || (r.data && (r.data.project_division || r.data.location_name || r.data.location)) || r.location_id;
          return String(rDiv).trim().toLowerCase() === String(divName).trim().toLowerCase();
        });
        divBreakdown[divName] = Number(divRecs.reduce((acc, r) => acc + getRecPaid(r), 0).toFixed(2));
      });

      return {
        monthNum: m,
        month: getMonthName(m),
        year: yr,
        label: effectiveYear === 'All' ? `${getMonthName(m)} ${yr}` : getMonthName(m),
        periodLabel: `${getMonthName(m)} ${yr}`,
        totalPaid: Number(sumPaid.toFixed(2)),
        amount: Number(sumPaid.toFixed(2)),
        paidAmount: Number(sumPaid.toFixed(2)),
        totalCost: Number(sumTotalCost.toFixed(2)),
        openingBalance: Number(mOpBal.toFixed(2)),
        closingBalance: Number(mClBal.toFixed(2)),
        balance: Number(mClBal.toFixed(2)),
        isEntered,
        isImmediateNext,
        quantity: Number(sumQty.toFixed(2)),
        cashAndCarryAmount: Number(cashCarryPaid.toFixed(2)),
        regularAmount: Number(regularPaid.toFixed(2)),
        amountFormatted: formatIndianCurrency(sumPaid),
        totalCostFormatted: formatIndianCurrency(sumTotalCost),
        openingBalanceFormatted: formatIndianCurrency(mOpBal),
        closingBalanceFormatted: formatIndianCurrency(mClBal),
        balanceFormatted: formatIndianCurrency(mClBal),
        ...divBreakdown
      };
    });
    const deptSpendMap = {};
    activeDepts.forEach(d => {
      deptSpendMap[d.id] = { id: d.id, name: d.name, amount: 0 };
    });
    records.forEach(r => {
      let dId = r.department_id;
      if (dId === 'FUEL' || r.report_type_id === 'FUEL_PURCHASE' || r.category === 'Fuel') {
        dId = 'PM';
      } else if (dId === 'STORES' || r.report_type_id === 'STORES_PURCHASE') {
        dId = 'MMS';
      }
      const recPaid = getRecPaid(r);
      const matched = activeDepts.find(d => {
        const c = String(d.code || d.id || '').trim().toUpperCase();
        const n = String(d.name || '').trim().toUpperCase();
        const tid = String(dId || '').trim().toUpperCase();
        if (tid === 'PM') return c === 'PM' || c === 'DPT-0002' || n.includes('PLANT') || n.includes('MACHINERY');
        if (tid === 'MMS' || tid === 'STORES') return c === 'MMS' || c === 'STORES' || c === 'DPT-0003' || n.includes('STORE');
        if (tid === 'ADMIN') return c === 'ADMIN' || c === 'DPT-0004' || n.includes('ADMIN');
        if (tid === 'PLANNING') return c === 'PLANNING' || n.includes('PLAN');
        if (tid === 'IT' || tid === 'MIS') return c === 'IT' || c === 'DPT-0001' || n.includes('IT');
        return c === tid || n === tid || String(d.id).toUpperCase() === tid;
      });
      const targetKey = matched ? matched.id : dId;
      if (targetKey) {
        if (!deptSpendMap[targetKey]) {
          deptSpendMap[targetKey] = { id: targetKey, name: matched ? matched.name : (r.department_name || targetKey), amount: 0 };
        }
        deptSpendMap[targetKey].amount += recPaid;
      }
    });
    const departmentWiseSpending = Object.values(deptSpendMap)
      .map(d => ({
        ...d,
        department: d.name,
        percentage: totalPayments > 0 ? Number(((d.amount / totalPayments) * 100).toFixed(1)) : 0,
        amountFormatted: formatIndianCurrency(d.amount)
      }))
      .sort((a, b) => b.amount - a.amount);
    const locSpendMap = {};
    activeLocations.forEach(l => {
      locSpendMap[l.id] = { id: l.id, name: l.name, amount: 0 };
    });
    records.forEach(r => {
      const recPaid = getRecPaid(r);
      const lId = r.location_id || (r.data && (r.data.location_id || r.data.location));
      if (lId) {
        const lIdLower = String(lId).toLowerCase();
        const matchedLoc = activeLocations.find(l => 
          String(l.id).toLowerCase() === lIdLower || 
          String(l.name).toLowerCase() === lIdLower || 
          (l.code && String(l.code).toLowerCase() === lIdLower)
        );
        const targetKey = matchedLoc ? matchedLoc.id : lId;
        if (!locSpendMap[targetKey]) {
          locSpendMap[targetKey] = { id: targetKey, name: r.location_name || lId, amount: 0 };
        }
        locSpendMap[targetKey].amount += recPaid;
      }
    });
    const locationWiseSpending = await Promise.all(Object.values(locSpendMap)
      .map(async l => {
        let locOp = 0;
        if (effectiveYear === 2026) {
          locOp = await this.getDec2025ClosingForLocation(l.name);
        }
        const locCl = Math.max(0, Number((locOp - l.amount).toFixed(2)));
        return {
          ...l,
          location: l.name,
          openingBalance: locOp,
          closingBalance: locCl,
          percentage: totalPayments > 0 ? Number(((l.amount / totalPayments) * 100).toFixed(1)) : 0,
          amountFormatted: formatIndianCurrency(l.amount)
        };
      }));
    locationWiseSpending.sort((a, b) => {
      if (b.amount !== a.amount) return b.amount - a.amount;
      return (b.closingBalance || 0) - (a.closingBalance || 0);
    });
    const serviceSpendMap = {};
    records.forEach(r => {
      const sName = (r.data && (r.data.fuel_type || r.data.payment_type)) || r.fuel_type || r.payment_type || r.service_type_name || 'Diesel';
      serviceSpendMap[sName] = (serviceSpendMap[sName] || 0) + getRecPaid(r);
    });
    const serviceTypeExpenditure = Object.entries(serviceSpendMap).map(([service, amount]) => ({
      service,
      amount,
      percentage: totalPayments > 0 ? Number(((amount / totalPayments) * 100).toFixed(1)) : 0,
      amountFormatted: formatIndianCurrency(amount)
    })).sort((a, b) => b.amount - a.amount);
    const isDeptRecord = (r, d) => {
      const rd = String(r.department_id || r.department_name || '').trim().toUpperCase();
      const dCode = String(d.code || d.id || '').trim().toUpperCase();
      const dName = String(d.name || '').trim().toUpperCase();

      const isPM = dCode === 'PM' || dCode === 'DPT-0002' || dName.includes('PLANT') || dName.includes('MACHINERY');
      const isStores = dCode === 'STORES' || dCode === 'MMS' || dCode === 'DPT-0003' || dName.includes('STORE');
      const isAdmin = dCode === 'ADMIN' || dCode === 'DPT-0004' || dName.includes('ADMIN');
      const isIT = dCode === 'IT' || dCode === 'MIS' || dCode === 'DPT-0001' || dName.includes('IT');

      if (isPM) return rd === 'PM' || rd === 'FUEL' || rd === 'DPT-0002' || r.report_type_id === 'FUEL_PURCHASE' || r.category === 'Fuel';
      if (isStores) return (rd === 'STORES' || rd === 'MMS' || rd === 'DPT-0003' || r.report_type_id === 'STORES_PURCHASE') && r.report_type_id !== 'FUEL_PURCHASE';
      if (isAdmin) return rd === 'ADMIN' || rd === 'DPT-0004' || r.report_type_id === 'ADMIN_EXPENSE';
      if (isIT) return rd === 'IT' || rd === 'MIS' || rd === 'DPT-0001';
      return rd === dCode || rd === dName;
    };
    const departmentOverview = activeDepts.map(d => {
      const dRecs = records.filter(r => isDeptRecord(r, d));
      const paidAmt = dRecs.reduce((acc, r) => acc + getRecPaid(r), 0);
      let indicator = 'n/a';
      const dCode = String(d.code || d.id || '').trim().toUpperCase();
      const dName = String(d.name || '').trim().toUpperCase();
      const isPM = dCode === 'PM' || dCode === 'DPT-0002' || dName.includes('PLANT') || dName.includes('MACHINERY');
      const isStores = dCode === 'STORES' || dCode === 'MMS' || dCode === 'DPT-0003' || dName.includes('STORE');
      const isAdmin = dCode === 'ADMIN' || dCode === 'DPT-0004' || dName.includes('ADMIN');

      if (isPM) {
        const totalWorkHours = dRecs.reduce((acc, r) => acc + (Number(r.working_hours || (r.data && r.data.working_hours)) || 0), 0);
        const fuelRecs = dRecs.filter(r => r.category === 'Fuel' || r.report_type_id === 'FUEL_PURCHASE' || (r.data && (r.data.fuel_type || r.data.fuel_expense)));
        const fuelAmt = fuelRecs.reduce((acc, r) => acc + getRecPaid(r), 0);
        if (totalWorkHours > 0 && fuelAmt > 0) {
          indicator = `${formatIndianNumber(totalWorkHours)} hrs / Fuel ${formatIndianCurrency(fuelAmt)}`;
        } else if (fuelAmt > 0) {
          indicator = `Fuel ${formatIndianCurrency(fuelAmt)} (${fuelRecs.length} logs)`;
        } else if (totalWorkHours > 0) {
          indicator = `${formatIndianNumber(totalWorkHours)} working hrs`;
        } else if (dRecs.length > 0) {
          indicator = `${dRecs.length} P&M logs`;
        }
      } else if (dCode === 'ACCOUNTS' || dName.includes('ACCOUNT')) {
        const vCount = new Set(dRecs.map(r => r.vendor_name || (r.data && (r.data.ledger_type || r.data.vendor_name || r.data.vendor))).filter(Boolean)).size;
        indicator = dRecs.length > 0 ? `${vCount} payees, ${dRecs.length} entries` : 'n/a';
      } else if (isStores) {
        const matAmt = dRecs.reduce((acc, r) => acc + getRecPaid(r), 0);
        indicator = matAmt > 0 ? `Material ${formatIndianCurrency(matAmt)} (${dRecs.length} logs)` : (dRecs.length > 0 ? `${dRecs.length} stores logs` : 'n/a');
      } else if (isAdmin) {
        indicator = dRecs.length > 0 ? `${dRecs.length} admin entries` : 'n/a';
      } else {
        indicator = dRecs.length > 0 ? `${dRecs.length} entries` : 'n/a';
      }
      return {
        department_id: d.id,
        department_name: d.name,
        paid: paidAmt,
        paidFormatted: formatIndianCurrency(paidAmt),
        recordsCount: dRecs.length,
        isReporting: dRecs.length > 0 || paidAmt > 0,
        indicator
      };
    });
    const expectations = await expsColl.find().toArray();
    const coverageMatrix = [];
    for (const loc of activeLocations) {
      const locIdLower = String(loc.id || '').toLowerCase();
      const locNameLower = String(loc.name || '').toLowerCase();
      const locCodeLower = String(loc.code || '').toLowerCase();
      const row = {
        location_id: loc.id,
        location_name: loc.name,
        departments: {}
      };
      let expectedCount = 0;
      let submittedCount = 0;
      for (const dept of activeDepts) {
        const deptIdUpper = String(dept.id || '').toUpperCase();
        const exp = expectations.find(e => {
          const eLocLower = String(e.location_id || '').toLowerCase();
          const locMatch = eLocLower === locIdLower || eLocLower === locNameLower || eLocLower === locCodeLower;
          const eDeptUpper = String(e.department_id || '').toUpperCase();
          const deptMatch = eDeptUpper === deptIdUpper || (deptIdUpper === 'MMS' && eDeptUpper === 'STORES') || (deptIdUpper === 'STORES' && eDeptUpper === 'MMS');
          return locMatch && deptMatch;
        });
        const isExpected = exp ? exp.expected : true;
        if (isExpected) expectedCount++;

        if (!isExpected) {
          row.departments[dept.id] = { status: 'Not expected', label: 'Not expected', color: 'neutral' };
        } else {
          const hasRecord = records.some(r => {
            const rLocId = String(r.location_id || '').toLowerCase();
            const rLocName = String(r.location_name || '').toLowerCase();
            const rLocData = String((r.data && (r.data.location || r.data.location_id)) || '').toLowerCase();
            const locMatches = rLocId === locIdLower || rLocId === locNameLower || rLocId === locCodeLower ||
                               rLocName === locIdLower || rLocName === locNameLower || rLocName === locCodeLower ||
                               rLocData === locIdLower || rLocData === locNameLower || rLocData === locCodeLower;
            if (!locMatches) return false;
            return isDeptRecord(r, dept);
          });
          const statusObj = hasRecord 
            ? { status: 'Submitted', label: 'Submitted', color: 'green' }
            : { status: 'Missing', label: 'Missing', color: 'amber' };
          if (hasRecord) {
            submittedCount++;
          }
          row.departments[dept.id] = statusObj;
          const dCodeUpper = String(dept.code || dept.id || '').toUpperCase();
          const dNameUpper = String(dept.name || '').toUpperCase();
          if (dCodeUpper === 'PM' || dCodeUpper === 'DPT-0002' || dNameUpper.includes('PLANT')) {
            row.departments.PM = statusObj;
          } else if (dCodeUpper === 'STORES' || dCodeUpper === 'MMS' || dCodeUpper === 'DPT-0003' || dNameUpper.includes('STORE')) {
            row.departments.MMS = statusObj;
            row.departments.STORES = statusObj;
          } else if (dCodeUpper === 'ADMIN' || dCodeUpper === 'DPT-0004' || dNameUpper.includes('ADMIN')) {
            row.departments.ADMIN = statusObj;
          } else if (dCodeUpper === 'PLANNING' || dNameUpper.includes('PLAN')) {
            row.departments.PLANNING = statusObj;
          }
        }
      }
      if (!row.departments.PM) row.departments.PM = { status: 'Missing', label: 'Missing', color: 'amber' };
      if (!row.departments.MMS) row.departments.MMS = { status: 'Missing', label: 'Missing', color: 'amber' };
      if (!row.departments.ADMIN) row.departments.ADMIN = { status: 'Missing', label: 'Missing', color: 'amber' };
      if (!row.departments.PLANNING) row.departments.PLANNING = { status: 'Missing', label: 'Missing', color: 'amber' };
      row.coveragePercent = expectedCount > 0 ? Math.round((submittedCount / expectedCount) * 100) : 100;
      coverageMatrix.push(row);
    }
    const storesAmt = records
      .filter(r => (r.department_id === 'STORES' || r.department_id === 'MMS' || r.report_type_id === 'STORES_PURCHASE') && r.report_type_id !== 'FUEL_PURCHASE' && r.category !== 'Fuel')
      .reduce((sum, r) => sum + getRecPaid(r), 0);
    const accountsAmt = records
      .filter(r => (r.department_id === 'ACCOUNTS' || r.report_type_id === 'ACCOUNTS_PAYMENT') && r.report_type_id !== 'FUEL_PURCHASE')
      .reduce((sum, r) => sum + getRecPaid(r), 0);
    const pmAmt = records
      .filter(r => r.department_id === 'PM' || r.department_id === 'FUEL' || r.report_type_id === 'VEHICLE_UTILIZATION' || r.report_type_id === 'FUEL_PURCHASE' || r.category === 'Fuel')
      .reduce((sum, r) => sum + getRecPaid(r), 0);
    const getPMFuelQty = r => {
      const isBoth = String(r.data?.fuel_type || r.fuel_type || '').toLowerCase().includes('both');
      const pQ = Number(r.data?.petrol_quantity || r.petrol_quantity || 0);
      const dQ = Number(r.data?.diesel_quantity || r.diesel_quantity || 0);
      if (isBoth && (pQ > 0 || dQ > 0)) return pQ + dQ;
      return Number(r.quantity || (r.data && r.data.quantity) || r.fuel_consumed_litres || 0);
    };
    const totalFuelLiters = records
      .filter(r => r.category === 'Fuel' || r.report_type_id === 'FUEL_PURCHASE' || (r.data && (r.data.fuel_type || r.data.quantity)))
      .reduce((sum, r) => sum + getPMFuelQty(r), 0);
    const totalMachineHours = records
      .filter(r => r.department_id === 'PM' || r.report_type_id === 'VEHICLE_UTILIZATION')
      .reduce((sum, r) => sum + (Number(r.working_hours || (r.data && r.data.working_hours)) || 0), 0);
    const averageCompliance = coverageMatrix.length > 0 
      ? Math.round(coverageMatrix.reduce((sum, c) => sum + (Number(c.coveragePercent) || 0), 0) / coverageMatrix.length) 
      : 100;
    const fuelRecs = records.filter(r => r.department_id === 'PM' && (r.report_type_id === 'FUEL_PURCHASE' || r.category === 'Fuel' || (r.data && (r.data.fuel_type || r.data.fuel_expense))));
    const isCC = r => {
      const pType = String(r.payment_type || (r.data && r.data.payment_type) || '').toLowerCase().trim();
      if (pType.includes('cash')) return true;
      const v = (r.cash_and_carry || (r.data && r.data.cash_and_carry) || '').toString().trim().toLowerCase();
      const vName = String(r.vendor_name || r.ledger_type || (r.data && (r.data.vendor_name || r.data.ledger_type)) || '').toLowerCase();
      if (vName.includes('merchant')) return true;
      if (v !== '' && !['no', 'false', '0', 'none', 'n/a', '-'].includes(v)) return true;
      const pQ = Number((r.data && r.data.petrol_quantity) || r.petrol_quantity || 0);
      const dQ = Number((r.data && r.data.diesel_quantity) || r.diesel_quantity || 0);
      const q = (pQ + dQ) > 0 ? (pQ + dQ) : Number(r.quantity || (r.data && r.data.quantity) || r.fuel_consumed_litres || 0);
      const amt = getRecPaid(r);
      if (amt > 0 && q <= 0) return true;
      return false;
    };
    const ccRecs = fuelRecs.filter(isCC);
    const targetCCRecs = ccRecs;
    const totalCCPaid = targetCCRecs.reduce((sum, r) => sum + getRecPaid(r), 0);
    const totalCCQty = targetCCRecs.reduce((sum, r) => sum + getPMFuelQty(r), 0);
    const totalAllFuelPaid = fuelRecs.reduce((sum, r) => sum + getRecPaid(r), 0);
    const ccSharePct = totalAllFuelPaid > 0 ? Number(((totalCCPaid / totalAllFuelPaid) * 100).toFixed(1)) : 0;
    
    const cashAndCarryTrend = ccRecs.length > 0 ? months.map(m => {
      const mRecs = targetCCRecs.filter(r => Number(r.reporting_month) === m);
      const mAllFuel = fuelRecs.filter(r => Number(r.reporting_month) === m);
      const mQty = mRecs.reduce((sum, r) => sum + getPMFuelQty(r), 0);
      const mAmt = mRecs.reduce((sum, r) => sum + getRecPaid(r), 0);
      const allQty = mAllFuel.reduce((sum, r) => sum + getPMFuelQty(r), 0);
      return {
        monthNum: m,
        month: getMonthName(m),
        year: effectiveYear,
        label: `${getMonthName(m)} ${effectiveYear}`,
        quantity: Math.round(mQty),
        amount: mAmt,
        totalQuantity: Math.round(allQty),
        count: mRecs.length,
        amountFormatted: formatIndianCurrency(mAmt)
      };
    }) : [];

    const ccTopLocations = {};
    targetCCRecs.forEach(r => {
      const loc = r.location_name || r.location_id || 'Unknown';
      ccTopLocations[loc] = (ccTopLocations[loc] || 0) + (Number(r.quantity || (r.data && r.data.quantity) || r.fuel_consumed_litres) || 0);
    });
    const cashAndCarryTopLocations = Object.entries(ccTopLocations).map(([name, qty]) => ({
      name,
      quantity: Math.round(qty)
    })).sort((a, b) => b.quantity - a.quantity);

    const cashAndCarryAnalytics = ccRecs.length > 0 ? {
      totalQuantity: Math.round(totalCCQty),
      totalAmount: totalCCPaid,
      totalAmountFormatted: formatIndianCurrency(totalCCPaid),
      totalRecords: targetCCRecs.length,
      hasEntries: true,
      sharePercentage: ccSharePct,
      avgRate: totalCCQty > 0 ? Number((totalCCPaid / totalCCQty).toFixed(2)) : 0,
      trend: cashAndCarryTrend,
      topLocations: cashAndCarryTopLocations
    } : {
      totalQuantity: 0,
      totalAmount: 0,
      totalAmountFormatted: 'Rs. 0',
      totalRecords: 0,
      hasEntries: false,
      sharePercentage: 0,
      avgRate: 0,
      trend: [],
      topLocations: []
    };

    const avgFuelRate = totalFuelLiters > 0 ? Number((totalPayments / totalFuelLiters).toFixed(2)) : 0;

    const isPMRecord = r => {
      const did = String(r.department_id || r.department_name || '').trim().toUpperCase();
      const rDept = String(r.data?.department || r.data?.department_beneficiary || '').trim().toUpperCase();
      return did === 'PM' || did === 'FUEL' || did === 'DPT-0002' || r.report_type_id === 'FUEL_PURCHASE' || r.report_type_id === 'VEHICLE_UTILIZATION' || r.category === 'Fuel' || did.includes('PLANT') || did.includes('MACHINERY') || rDept.includes('PLANT') || rDept.includes('MACHINERY');
    };
    const isITRecord = r => {
      const did = String(r.department_id || r.department_name || '').trim().toUpperCase();
      const rDept = String(r.data?.department || r.data?.department_beneficiary || '').trim().toUpperCase();
      return did === 'IT' || did === 'MIS' || did === 'IT & MIS' || did === 'IT&MIS' || did === 'DPT-0001' || did.includes('IT') || did.includes('MIS') || rDept.includes('IT') || rDept.includes('MIS');
    };
    const isAdminRecord = r => {
      const did = String(r.department_id || r.department_name || '').trim().toUpperCase();
      const rDept = String(r.data?.department || r.data?.department_beneficiary || '').trim().toUpperCase();
      return did === 'ADMIN' || did === 'DPT-0004' || did === 'ADMINISTRATION' || r.report_type_id === 'ADMIN_EXPENSE' || did.includes('ADMIN') || rDept.includes('ADMIN');
    };

    const pmPaid = records.filter(isPMRecord).reduce((sum, r) => sum + getRecPaid(r), 0);
    const itPaid = records.filter(isITRecord).reduce((sum, r) => sum + getRecPaid(r), 0);
    const adminPaid = records.filter(isAdminRecord).reduce((sum, r) => sum + getRecPaid(r), 0);

    const checkComplianceCategory = (r) => {
      const cat = String(r.category || r.data?.category || '').trim().toLowerCase();
      const expType = String(r.data?.expense_type || r.expense_type || '').trim().toLowerCase();
      const ledger = String(r.ledger_type || r.vendor_name || r.data?.ledger_type || r.data?.vendor_name || '').trim().toLowerCase();
      const remarks = String(r.remarks || r.data?.remarks || '').trim().toLowerCase();
      const str = `${cat} ${expType} ${ledger} ${remarks}`;

      if (str.includes('insurance')) return 'Insurance';
      if (str.includes('maintenance') || str.includes('repair') || str.includes('service')) return 'Maintenance';
      if (str.includes('tax') || str.includes('road tax') || str.includes('toll')) return 'Tax';
      if (str.includes('permit') || str.includes('fitness') || str.includes('puc')) return 'Permit';
      return null;
    };

    const checkManpowerCategory = (r) => {
      const cat = String(r.category || r.data?.category || '').trim().toLowerCase();
      const role = String(r.data?.designation || r.designation || r.data?.role || r.role || '').trim().toLowerCase();
      const ledger = String(r.ledger_type || r.vendor_name || r.data?.ledger_type || r.data?.vendor_name || '').trim().toLowerCase();
      const remarks = String(r.remarks || r.data?.remarks || '').trim().toLowerCase();
      const str = `${cat} ${role} ${ledger} ${remarks}`;

      if (str.includes('driver')) return 'Drivers';
      if (str.includes('operator')) return 'Operators';
      return null;
    };

    const complianceCategories = ['Insurance', 'Maintenance', 'Tax', 'Permit'];
    const complianceExpenses = complianceCategories.map(catName => {
      const matchingRecs = records.filter(r => checkComplianceCategory(r) === catName);
      const amt = matchingRecs.reduce((sum, r) => sum + getRecPaid(r), 0);
      return {
        category: catName,
        name: catName,
        amount: Number(amt.toFixed(2)),
        recordsCount: matchingRecs.length,
        amountFormatted: formatIndianCurrency(amt)
      };
    });

    const manpowerCategories = ['Drivers', 'Operators'];
    const manpowerCosts = manpowerCategories.map(catName => {
      const matchingRecs = records.filter(r => checkManpowerCategory(r) === catName);
      const amt = matchingRecs.reduce((sum, r) => sum + getRecPaid(r), 0);
      return {
        category: catName,
        name: catName,
        amount: Number(amt.toFixed(2)),
        recordsCount: matchingRecs.length,
        amountFormatted: formatIndianCurrency(amt)
      };
    });

    return {
      kpis: {
        totalPaid: {
          value: totalPayments,
          formatted: formatIndianCurrency(totalPayments),
          label: 'Total Paid Amount',
          subtext: null
        },
        plantAndMachinery: {
          value: pmPaid,
          formatted: formatIndianCurrency(pmPaid),
          label: 'Plant & Machinery',
          subtext: null
        },
        itAndMis: {
          value: itPaid,
          formatted: formatIndianCurrency(itPaid),
          label: 'IT & MIS',
          subtext: null
        },
        admin: {
          value: adminPaid,
          formatted: formatIndianCurrency(adminPaid),
          label: 'Admin',
          subtext: null
        },
        totalPayments: {
          value: totalPayments,
          formatted: formatIndianCurrency(totalPayments),
          label: 'Total Paid Amount',
          subtext: null
        },
        totalCost: {
          value: totalCost,
          formatted: formatIndianCurrency(totalCost),
          label: 'Total Amount (Fuel Cost)',
          subtext: null
        },
        openingBalance: {
          value: totalMasterOpening,
          formatted: formatIndianCurrency(totalMasterOpening),
          label: 'Opening Balance',
          subtext: null
        },
        closingBalance: {
          value: runningMainBalance,
          formatted: formatIndianCurrency(runningMainBalance),
          label: 'Closing Balance',
          subtext: null
        },
        activeDepartments: {
          value: totalDeptsConfigured,
          formatted: `${totalDeptsConfigured} Departments`,
          label: 'Operating Departments',
          subtext: null
        },
        activeSites: {
          value: locationsReportingCount > 0 ? locationsReportingCount : activeLocations.length,
          formatted: `${locationsReportingCount > 0 ? locationsReportingCount : activeLocations.length} Project Divisions`,
          label: 'Active Project Divisions',
          subtext: null
        },
        fuelVolume: {
          value: totalFuelLiters,
          formatted: `${formatIndianNumber(totalFuelLiters, 2)} Ltrs`,
          label: 'Total Fuel Quantity',
          subtext: null
        },
        avgRate: {
          value: avgFuelRate,
          formatted: `Rs. ${avgFuelRate.toFixed(2)} / Ltr`,
          label: 'Average Fuel Rate',
          subtext: null
        }
      },
      charts: {
        spendingTrend,
        monthlySpending: spendingTrend,
        topDivisions,
        complianceExpenses,
        manpowerCosts,
        departmentWiseSpending,
        departmentExpenditure: departmentWiseSpending,
        locationWiseSpending,
        locationSpending: locationWiseSpending,
        serviceTypeExpenditure,
        serviceSpending: serviceTypeExpenditure,
        cashAndCarryTrend,
        cashAndCarryAnalytics
      },
      departmentOverview,
      coverageMatrix,
      year: effectiveYear,
      recordCount: records.length
    };
  }
  async getPMDashboard(params = {}) {
    return this.getFuelDashboard(params);
  }
  async getPMDashboardLegacy(params = {}) {
    const recordsColl = getCollection('monthly_report_records');
    const filter = this.buildFilter({ ...params, department: 'PM' });
    const records = await recordsColl.find(filter).toArray();
    const effectiveYear = (() => {
      if (params.from_date) {
        const m = String(params.from_date).match(/\b(20\d\d)\b/);
        if (m) return Number(m[1]);
      }
      if (params.to_date) {
        const m = String(params.to_date).match(/\b(20\d\d)\b/);
        if (m) return Number(m[1]);
      }
      if (params.year) {
        const y = Number(params.year);
        if (!isNaN(y) && y > 2000) return y;
      }
      const recWithYr = records.find(r => r.reporting_year);
      if (recWithYr) return Number(recWithYr.reporting_year);
      return 2025;
    })();
    const totalPayments = records.reduce((acc, r) => acc + (Number(r.paid_amount) || 0), 0);
    const totalWorkingHours = records.reduce((acc, r) => acc + (Number(r.working_hours) || 0), 0);
    const totalIdleHours = records.reduce((acc, r) => acc + (Number(r.idle_hours) || 0), 0);
    const totalBreakdownHours = records.reduce((acc, r) => acc + (Number(r.breakdown_hours) || 0), 0);
    const rowsWithAvailable = records.filter(r => Number(r.available_hours) > 0 && Number(r.working_hours) >= 0);
    let utilizationPct = null;
    let utilizationNote = 'No rows with Available Hours submitted';
    if (rowsWithAvailable.length > 0) {
      const sumWork = rowsWithAvailable.reduce((acc, r) => acc + Number(r.working_hours), 0);
      const sumAvail = rowsWithAvailable.reduce((acc, r) => acc + Number(r.available_hours), 0);
      if (sumAvail > 0) {
        utilizationPct = Number(((sumWork / sumAvail) * 100).toFixed(1));
        utilizationNote = `${rowsWithAvailable.length} of ${records.length} rows have Available Hrs`;
      }
    }
    const distinctAssets = new Set(records.map(r => r.asset_id).filter(Boolean));
    const assetDenominator = distinctAssets.size || records.length;
    const avgWorkingHours = assetDenominator > 0 ? Math.round(totalWorkingHours / assetDenominator) : 0;
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const monthlyUtilization = months.map(m => {
      const mRecs = records.filter(r => Number(r.reporting_month) === m);
      const mAvailRows = mRecs.filter(r => Number(r.available_hours) > 0);
      const sumWork = mAvailRows.reduce((acc, r) => acc + Number(r.working_hours), 0);
      const sumAvail = mAvailRows.reduce((acc, r) => acc + Number(r.available_hours), 0);
      const util = sumAvail > 0 ? Number(((sumWork / sumAvail) * 100).toFixed(1)) : null;
      const totalWork = mRecs.reduce((acc, r) => acc + (Number(r.working_hours) || 0), 0);
      const totalIdle = mRecs.reduce((acc, r) => acc + (Number(r.idle_hours) || 0), 0);
      const totalBreakdown = mRecs.reduce((acc, r) => acc + (Number(r.breakdown_hours) || 0), 0);
      return {
        monthNum: m,
        month: getMonthName(m),
        utilization: util,
        workingHours: totalWork,
        idleHours: totalIdle,
        breakdownHours: totalBreakdown
      };
    });
    const eqTypeMap = {};
    records.forEach(r => {
      const eq = r.equipment_type || 'Other';
      if (!eqTypeMap[eq]) {
        eqTypeMap[eq] = { type: eq, workingHours: 0, availableHours: 0, count: 0 };
      }
      eqTypeMap[eq].workingHours += Number(r.working_hours) || 0;
      if (Number(r.available_hours) > 0) {
        eqTypeMap[eq].availableHours += Number(r.available_hours);
      }
      eqTypeMap[eq].count++;
    });
    const equipmentComparison = Object.values(eqTypeMap).map(e => ({
      equipmentType: e.type,
      workingHours: e.workingHours,
      utilization: e.availableHours > 0 ? Number(((e.workingHours / e.availableHours) * 100).toFixed(1)) : null
    })).sort((a, b) => b.workingHours - a.workingHours);
    const locPayMap = {};
    records.forEach(r => {
      const l = r.location_name || r.location_id || 'Unknown';
      locPayMap[l] = (locPayMap[l] || 0) + (Number(r.paid_amount) || 0);
    });
    const locationPayments = Object.entries(locPayMap).map(([location, amount]) => ({
      location,
      amount,
      amountFormatted: formatIndianCurrency(amount)
    })).sort((a, b) => b.amount - a.amount);
    const isCC = r => {
      const pType = String(r.payment_type || (r.data && r.data.payment_type) || '').toLowerCase().trim();
      if (pType.includes('cash')) return true;
      const v = (r.cash_and_carry || (r.data && r.data.cash_and_carry) || '').toString().trim().toLowerCase();
      const vName = String(r.vendor_name || r.ledger_type || (r.data && (r.data.vendor_name || r.data.ledger_type)) || '').toLowerCase();
      if (vName.includes('merchant')) return true;
      if (v !== '' && !['no', 'false', '0', 'none', 'n/a', '-'].includes(v)) return true;
      const pQ = Number((r.data && r.data.petrol_quantity) || r.petrol_quantity || 0);
      const dQ = Number((r.data && r.data.diesel_quantity) || r.diesel_quantity || 0);
      const q = (pQ + dQ) > 0 ? (pQ + dQ) : Number(r.quantity || (r.data && r.data.quantity) || r.fuel_consumed_litres || 0);
      const amt = Number(r.paid_amount || r.data?.paid_amount || r.data?.total_cost || r.cash_and_carry || 0);
      if (amt > 0 && q <= 0) return true;
      return false;
    };
    const ccRecs = records.filter(isCC);
    const targetCCRecs = ccRecs;
    const totalCCPaid = targetCCRecs.reduce((sum, r) => sum + (Number(r.paid_amount || r.data?.paid_amount || r.data?.total_cost || r.cash_and_carry) || 0), 0);
    const totalCCQty = targetCCRecs.reduce((sum, r) => sum + (Number(r.quantity || r.data?.quantity || r.fuel_consumed_litres) || 0), 0);
    const ccSharePct = totalPayments > 0 ? Number(((totalCCPaid / totalPayments) * 100).toFixed(1)) : 0;

    const cashAndCarryTrend = ccRecs.length > 0 ? months.map(m => {
      const mRecs = targetCCRecs.filter(r => Number(r.reporting_month) === m);
      const mAll = records.filter(r => Number(r.reporting_month) === m);
      const mQty = mRecs.reduce((sum, r) => sum + (Number(r.quantity || r.data?.quantity || r.fuel_consumed_litres) || 0), 0);
      const mAmt = mRecs.reduce((sum, r) => sum + (Number(r.paid_amount || r.data?.paid_amount || r.data?.total_cost || r.cash_and_carry) || 0), 0);
      const allQty = mAll.reduce((sum, r) => sum + (Number(r.quantity || r.data?.quantity || r.fuel_consumed_litres) || 0), 0);
      return {
        monthNum: m,
        month: getMonthName(m),
        year: effectiveYear,
        label: `${getMonthName(m)} ${effectiveYear}`,
        quantity: Math.round(mQty),
        amount: mAmt,
        totalQuantity: Math.round(allQty),
        count: mRecs.length,
        amountFormatted: formatIndianCurrency(mAmt)
      };
    }) : [];

    const ccTopLocations = {};
    targetCCRecs.forEach(r => {
      const loc = r.location_name || r.location_id || 'Unknown';
      ccTopLocations[loc] = (ccTopLocations[loc] || 0) + (Number(r.quantity || r.data?.quantity || r.fuel_consumed_litres) || 0);
    });
    const cashAndCarryTopLocations = Object.entries(ccTopLocations).map(([name, qty]) => ({
      name,
      quantity: Math.round(qty)
    })).sort((a, b) => b.quantity - a.quantity);

    const cashAndCarryAnalytics = ccRecs.length > 0 ? {
      totalQuantity: Math.round(totalCCQty),
      totalAmount: totalCCPaid,
      totalAmountFormatted: formatIndianCurrency(totalCCPaid),
      totalRecords: targetCCRecs.length,
      hasEntries: true,
      sharePercentage: ccSharePct,
      avgRate: totalCCQty > 0 ? Number((totalCCPaid / totalCCQty).toFixed(2)) : 0,
      trend: cashAndCarryTrend,
      topLocations: cashAndCarryTopLocations
    } : {
      totalQuantity: 0,
      totalAmount: 0,
      totalAmountFormatted: 'Rs. 0',
      totalRecords: 0,
      hasEntries: false,
      sharePercentage: 0,
      avgRate: 0,
      trend: [],
      topLocations: []
    };

    return {
      kpis: {
        paymentsMade: {
          value: totalPayments,
          formatted: formatIndianCurrency(totalPayments),
          label: 'P&M Payments Made',
          subtext: null
        },
        workingHours: {
          value: totalWorkingHours,
          formatted: `${formatIndianNumber(totalWorkingHours)} h`,
          label: 'Reported Working Hours',
          subtext: null
        },
        utilization: {
          value: utilizationPct,
          formatted: utilizationPct !== null ? `${utilizationPct}%` : 'Not available',
          label: 'Equipment Utilization',
          subtext: null
        },
        idleHours: {
          value: totalIdleHours,
          formatted: `${formatIndianNumber(totalIdleHours)} h`,
          label: 'Reported Idle Hours',
          subtext: null
        },
        breakdownHours: {
          value: totalBreakdownHours,
          formatted: `${formatIndianNumber(totalBreakdownHours)} h`,
          label: 'Reported Breakdown Hours',
          subtext: null
        },
        avgWorkingHours: {
          value: avgWorkingHours,
          formatted: `${formatIndianNumber(avgWorkingHours)} h`,
          label: 'Avg Working Hrs / Equipment',
          subtext: null
        }
      },
      charts: {
        primaryTrend: monthlyUtilization.map(m => ({ label: m.month, val1: m.workingHours, val2: m.breakdownHours })),
        secondaryTrend: equipmentComparison.map(e => ({ name: e.equipmentType, value: e.workingHours })),
        monthlyUtilization,
        equipmentComparison,
        locationPayments,
        cashAndCarryTrend,
        cashAndCarryAnalytics
      },
      records: records.slice(0, 100),
      year: effectiveYear,
      recordCount: records.length
    };
  }
  async getStoresDashboard(params = {}) {
    const recordsColl = getCollection('monthly_report_records');
    const filter = this.buildFilter({ ...params, department: 'STORES' });
    const records = await recordsColl.find(filter).toArray();
    const effectiveYear = (() => {
      if (params.from_date) {
        const m = String(params.from_date).match(/\b(20\d\d)\b/);
        if (m) return Number(m[1]);
      }
      if (params.to_date) {
        const m = String(params.to_date).match(/\b(20\d\d)\b/);
        if (m) return Number(m[1]);
      }
      if (params.year) {
        if (String(params.year).toUpperCase() === 'ALL') return 'All';
        const y = Number(params.year);
        if (!isNaN(y) && y > 2000) return y;
      }
      const recWithYr = records.find(r => r.reporting_year);
      if (recWithYr) return Number(recWithYr.reporting_year);
      return 2025;
    })();
    const totalStoresExp = records.reduce((acc, r) => acc + (Number(r.paid_amount) || 0), 0);
    const materialExp = records
      .filter(r => r.category !== 'Fuel')
      .reduce((acc, r) => acc + (Number(r.paid_amount) || 0), 0);
    const fuelExp = records
      .filter(r => r.category === 'Fuel')
      .reduce((acc, r) => acc + (Number(r.paid_amount) || 0), 0);
    const vendorSet = new Set(records.map(r => r.vendor_name || r.vendor_id).filter(Boolean));
    const distinctVendors = vendorSet.size;
    const tonneRecs = records.filter(r => String(r.uom || '').toLowerCase() === 'tonne');
    const totalMaterialQty = tonneRecs.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0);
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const monthlyExpenditure = months.map(m => {
      const mRecs = records.filter(r => Number(r.reporting_month) === m);
      const amt = mRecs.reduce((acc, r) => acc + (Number(r.paid_amount) || 0), 0);
      return {
        monthNum: m,
        month: getMonthName(m),
        year: effectiveYear,
        label: `${getMonthName(m)} ${effectiveYear}`,
        amount: amt,
        amountFormatted: formatIndianCurrency(amt)
      };
    });
    const catMap = {};
    records.forEach(r => {
      const c = r.category || 'General';
      catMap[c] = (catMap[c] || 0) + (Number(r.paid_amount) || 0);
    });
    const categorySpending = Object.entries(catMap).map(([category, amount]) => ({
      category,
      amount,
      amountFormatted: formatIndianCurrency(amount)
    })).sort((a, b) => b.amount - a.amount);
    const locMap = {};
    records.forEach(r => {
      const l = r.location_name || r.location_id || 'Unknown';
      locMap[l] = (locMap[l] || 0) + (Number(r.paid_amount) || 0);
    });
    const locationSpending = Object.entries(locMap).map(([location, amount]) => ({
      location,
      amount,
      amountFormatted: formatIndianCurrency(amount)
    })).sort((a, b) => b.amount - a.amount);
    const venMap = {};
    records.forEach(r => {
      const v = r.vendor_name || r.vendor_id || 'Unknown';
      venMap[v] = (venMap[v] || 0) + (Number(r.paid_amount) || 0);
    });
    const vendorSpending = Object.entries(venMap).map(([vendor, amount]) => ({
      vendor,
      amount,
      amountFormatted: formatIndianCurrency(amount)
    })).sort((a, b) => b.amount - a.amount);
    return {
      kpis: {
        totalAmount: {
          value: totalStoresExp,
          formatted: formatIndianCurrency(totalStoresExp),
          label: 'Total Amount',
          subtext: null
        },
        materialExpenditure: {
          value: materialExp,
          formatted: formatIndianCurrency(materialExp),
          label: 'Material Amount',
          subtext: null
        },
        fuelExpenditure: {
          value: fuelExp,
          formatted: formatIndianCurrency(fuelExp),
          label: 'Fuel Amount',
          subtext: null
        },
        distinctVendors: {
          value: distinctVendors,
          formatted: formatIndianNumber(distinctVendors, 0),
          label: 'Distinct Vendors Represented',
          subtext: null
        },
        materialQty: {
          value: totalMaterialQty,
          formatted: totalMaterialQty > 0 ? `${formatIndianNumber(totalMaterialQty, 2)} t` : '0 t',
          label: 'Total Reported Material Qty',
          subtext: null
        },
        validRecords: {
          value: records.length,
          formatted: formatIndianNumber(records.length, 0),
          label: 'Valid Records Submitted',
          subtext: null
        }
      },
      charts: {
        primaryTrend: monthlyExpenditure.map(m => ({ label: `${m.month} ${effectiveYear}`, year: effectiveYear, month: m.month, val1: m.amount })),
        secondaryTrend: categorySpending.map(c => ({ name: c.category, value: c.amount })),
        materialVsFuel: [
          { name: 'Material', value: materialExp, percentage: totalStoresExp > 0 ? Number(((materialExp / totalStoresExp) * 100).toFixed(1)) : 0 },
          { name: 'Fuel', value: fuelExp, percentage: totalStoresExp > 0 ? Number(((fuelExp / totalStoresExp) * 100).toFixed(1)) : 0 }
        ],
        monthlyExpenditure,
        categorySpending,
        locationSpending,
        vendorSpending
      },
      records: records.slice(0, 100),
      year: effectiveYear,
      recordCount: records.length
    };
  }
  async getFuelDashboard(params = {}) {
    const recordsColl = getCollection('monthly_report_records');
    const baseFilter = this.buildFilter(params);
    delete baseFilter.department_id;
    delete baseFilter.$or;
    delete baseFilter.reporting_month;
    const filter = {
      ...baseFilter,
      $or: [
        { report_type_id: 'FUEL_PURCHASE' },
        { category: 'Fuel' },
        { department_id: 'FUEL' },
        { 'data.fuel_type': { $exists: true, $ne: '' } }
      ]
    };
    if (params.location && params.location !== 'All') {
      filter.location_name = params.location;
    }
    const allRecords = await recordsColl.find(filter).toArray();
    const mStr = String(params.month || '').toLowerCase();
    const monthMap = { jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12 };
    const reqMonth = monthMap[mStr] || parseInt(params.month, 10) || null;
    const records = reqMonth ? allRecords.filter(r => Number(r.reporting_month) === reqMonth) : allRecords;
    const effectiveYear = (() => {
      if (params.from_date) {
        const m = String(params.from_date).match(/\b(20\d\d)\b/);
        if (m) return Number(m[1]);
      }
      if (params.to_date) {
        const m = String(params.to_date).match(/\b(20\d\d)\b/);
        if (m) return Number(m[1]);
      }
      if (params.year) {
        if (String(params.year).toUpperCase() === 'ALL') return 'All';
        const y = Number(params.year);
        if (!isNaN(y) && y > 2000) return y;
      }
      const recWithYr = allRecords.find(r => r.reporting_year);
      if (recWithYr) return Number(recWithYr.reporting_year);
      return 2025;
    })();
    const getFuelRecQty = r => {
      const isBoth = String(r.data?.fuel_type || r.fuel_type || '').toLowerCase().includes('both');
      const pQ = Number(r.data?.petrol_quantity || r.petrol_quantity || 0);
      const dQ = Number(r.data?.diesel_quantity || r.diesel_quantity || 0);
      if (isBoth && (pQ > 0 || dQ > 0)) return pQ + dQ;
      return Number(r.quantity || r.data?.quantity || r.fuel_consumed_litres || 0);
    };
    const getFuelPaid = r => {
      if (r.paid_amount !== undefined && r.paid_amount !== null && !isNaN(Number(r.paid_amount))) {
        return Number(r.paid_amount);
      }
      if (r.data && r.data.paid_amount !== undefined && r.data.paid_amount !== null && !isNaN(Number(r.data.paid_amount))) {
        return Number(r.data.paid_amount);
      }
      return Number(r.total_cost || (r.data && r.data.total_cost) || 0);
    };
    const getFuelCost = r => {
      if (r.total_cost !== undefined && r.total_cost !== null && !isNaN(Number(r.total_cost))) {
        return Number(r.total_cost);
      }
      if (r.data && r.data.total_cost !== undefined && r.data.total_cost !== null && !isNaN(Number(r.data.total_cost))) {
        return Number(r.data.total_cost);
      }
      const isBoth = String(r.data?.fuel_type || r.fuel_type || '').toLowerCase().includes('both');
      const pCost = Number(r.data?.petrol_total_cost || r.petrol_total_cost || (Number(r.data?.petrol_quantity || r.petrol_quantity || 0) * Number(r.data?.petrol_rate || r.petrol_rate || 0)) || 0);
      const dCost = Number(r.data?.diesel_total_cost || r.diesel_total_cost || (Number(r.data?.diesel_quantity || r.diesel_quantity || 0) * Number(r.data?.diesel_rate || r.diesel_rate || 0)) || 0);
      const bothCost = (isBoth && (pCost > 0 || dCost > 0)) ? (pCost + dCost) : 0;
      return bothCost > 0 ? bothCost : getFuelPaid(r);
    };
    const locsColl = getCollection('project_locations');
    let openingBalance = 0;
    if (effectiveYear === 2026) {
      openingBalance = await this.getDec2025ClosingForLocation(params.location || 'All');
    } else if (params.location && params.location !== 'All') {
      const locClean = String(params.location).trim();
      const locDoc = await locsColl.findOne({
        $or: [
          { name: new RegExp('^' + locClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') },
          { code: new RegExp('^' + locClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }
        ]
      });
      openingBalance = Number(locDoc?.opening_balance ?? 0);
    } else {
      const distinctLocNames = Array.from(new Set(allRecords.map(r => r.location_name || r.location_id).filter(Boolean)));
      if (distinctLocNames.length > 0) {
        const reportingLocs = await locsColl.find({
          name: { $in: distinctLocNames.map(n => new RegExp('^' + String(n).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')) }
        }).toArray();
        openingBalance = reportingLocs.reduce((sum, l) => sum + Number(l.opening_balance || 0), 0);
      }
    }

    const totalFuelExp = records.reduce((acc, r) => acc + getFuelPaid(r), 0);
    const totalFuelCost = records.reduce((acc, r) => acc + getFuelCost(r), 0);
    const totalLiters = records.reduce((acc, r) => acc + getFuelRecQty(r), 0);
    const avgRate = totalLiters > 0 ? Number((totalFuelCost / totalLiters).toFixed(2)) : 0;
    const closingBalance = Number((openingBalance + totalFuelCost - totalFuelExp).toFixed(2));
    const vendorSet = new Set(records.map(r => r.vendor_name || r.data?.ledger_type || r.vendor_id).filter(Boolean));
    const distinctVendors = vendorSet.size;
    const fuelTypeSet = new Set();
    records.forEach(r => {
      const ft = String(r.data?.fuel_type || r.fuel_type || (r.category === 'Fuel' ? 'Diesel (HSD)' : '')).trim();
      if (ft.toLowerCase().includes('both')) {
        fuelTypeSet.add('Petrol');
        fuelTypeSet.add('Diesel');
      } else if (ft) {
        fuelTypeSet.add(ft);
      }
    });
    const distinctFuelTypes = fuelTypeSet.size || 1;

    const isCC = r => {
      const pType = String(r.payment_type || (r.data && r.data.payment_type) || '').toLowerCase().trim();
      if (pType.includes('cash')) return true;
      const v = (r.cash_and_carry || (r.data && r.data.cash_and_carry) || '').toString().trim().toLowerCase();
      const vName = String(r.vendor_name || r.ledger_type || (r.data && (r.data.vendor_name || r.data.ledger_type)) || '').toLowerCase();
      if (vName.includes('merchant')) return true;
      if (v !== '' && !['no', 'false', '0', 'none', 'n/a', '-'].includes(v)) return true;
      const pQ = Number((r.data && r.data.petrol_quantity) || r.petrol_quantity || 0);
      const dQ = Number((r.data && r.data.diesel_quantity) || r.diesel_quantity || 0);
      const q = (pQ + dQ) > 0 ? (pQ + dQ) : Number(r.quantity || (r.data && r.data.quantity) || r.fuel_consumed_litres || 0);
      const amt = getFuelPaid(r);
      if (amt > 0 && q <= 0) return true;
      return false;
    };

    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const enteredMonths = months.filter(m => allRecords.some(r => Number(r.reporting_month) === m));
    const lastEnteredMonth = enteredMonths.length > 0 ? Math.max(...enteredMonths) : 0;
    let runningMonthBalance = openingBalance;
    const monthlySpending = months.map(m => {
      const mRecs = allRecords.filter(r => Number(r.reporting_month) === m);
      const isEntered = mRecs.length > 0;
      const isImmediateNext = (!isEntered && lastEnteredMonth > 0 && m === lastEnteredMonth + 1) || (effectiveYear === 2026 && !isEntered && lastEnteredMonth === 0 && m === 1);
      const amt = mRecs.reduce((acc, r) => acc + getFuelPaid(r), 0);
      const totalCostAmt = mRecs.reduce((acc, r) => acc + getFuelCost(r), 0);
      let mOpBal = 0;
      let mClBal = 0;
      if (isEntered) {
        mOpBal = runningMonthBalance;
        mClBal = Number((mOpBal + totalCostAmt - amt).toFixed(2));
        runningMonthBalance = mClBal;
      } else if (isImmediateNext) {
        mOpBal = runningMonthBalance;
        mClBal = mOpBal;
      }
      const nextOp = isEntered ? runningMonthBalance : (isImmediateNext ? mClBal : 0);
      const qty = mRecs.reduce((acc, r) => acc + getFuelRecQty(r), 0);
      const ccAmt = mRecs.filter(isCC).reduce((sum, r) => sum + getFuelPaid(r), 0);
      const regAmt = Math.max(0, amt - ccAmt);
      return {
        monthNum: m,
        month: getMonthName(m),
        year: effectiveYear,
        label: effectiveYear === 'All' ? getMonthName(m) : `${getMonthName(m)} ${effectiveYear}`,
        amount: amt,
        paidAmount: amt,
        totalCost: totalCostAmt,
        openingBalance: mOpBal,
        closingBalance: mClBal,
        nextMonthOpening: nextOp,
        balance: mClBal,
        isEntered,
        isImmediateNext,
        quantity: qty,
        cashAndCarryAmount: ccAmt,
        regularAmount: regAmt,
        amountFormatted: formatIndianCurrency(amt),
        totalCostFormatted: formatIndianCurrency(totalCostAmt),
        openingBalanceFormatted: formatIndianCurrency(mOpBal),
        closingBalanceFormatted: formatIndianCurrency(mClBal),
        balanceFormatted: formatIndianCurrency(mClBal)
      };
    });

    const typeMap = {};
    records.forEach(r => {
      const ft = String(r.data?.fuel_type || r.fuel_type || 'Diesel (HSD)').trim();
      const isBoth = ft.toLowerCase().includes('both') || ft.toLowerCase() === 'petrol/diesel';
      if (isBoth) {
        const pCost = Number(r.data?.petrol_total_cost || r.petrol_total_cost || (Number(r.data?.petrol_quantity || r.petrol_quantity || 0) * Number(r.data?.petrol_rate || r.petrol_rate || 0)) || 0);
        const dCost = Number(r.data?.diesel_total_cost || r.diesel_total_cost || (Number(r.data?.diesel_quantity || r.diesel_quantity || 0) * Number(r.data?.diesel_rate || r.diesel_rate || 0)) || 0);
        if (pCost > 0 || dCost > 0) {
          if (pCost > 0) typeMap['Petrol'] = (typeMap['Petrol'] || 0) + pCost;
          if (dCost > 0) typeMap['Diesel'] = (typeMap['Diesel'] || 0) + dCost;
        } else {
          typeMap['Both'] = (typeMap['Both'] || 0) + (Number(r.paid_amount || r.data?.paid_amount || r.data?.total_cost) || 0);
        }
      } else {
        typeMap[ft] = (typeMap[ft] || 0) + (Number(r.paid_amount || r.data?.paid_amount || r.data?.total_cost) || 0);
      }
    });
    const fuelTypeSpending = Object.entries(typeMap).map(([type, amount]) => ({
      name: type,
      value: amount,
      amountFormatted: formatIndianCurrency(amount)
    })).sort((a, b) => b.value - a.value);

    let activeLocations = await locsColl.find({ status: { $ne: 'inactive' }, active: { $ne: false } }).toArray();
    if (activeLocations.length === 0) {
      activeLocations = await locsColl.find({}).toArray();
    }
    const reportingLocNames = new Set(allRecords.map(r => r.location_name || r.data?.location).filter(Boolean).map(n => String(n).trim().toLowerCase()));
    let targetLocations = activeLocations;
    if (effectiveYear !== 2026) {
      targetLocations = activeLocations.filter(l => reportingLocNames.has(String(l.name).trim().toLowerCase()) || Number(l.opening_balance || 0) > 0);
    }
    if (params.location && params.location !== 'All') {
      const locClean = String(params.location).trim().toLowerCase();
      targetLocations = targetLocations.filter(l => 
        String(l.name).trim().toLowerCase() === locClean || 
        String(l.code).trim().toLowerCase() === locClean || 
        String(l.id).trim().toLowerCase() === locClean
      );
    }

    const matchesLoc = (r, loc) => {
      const rLoc = String(r.location_name || r.location_id || (r.data && (r.data.location_name || r.data.location || r.data.location_id)) || '').trim().toLowerCase();
      const lName = String(loc.name || '').trim().toLowerCase();
      const lCode = String(loc.code || '').trim().toLowerCase();
      const lId = String(loc.id || '').trim().toLowerCase();
      return (lName && rLoc === lName) || (lCode && rLoc === lCode) || (lId && rLoc === lId);
    };

    const locationSpending = await Promise.all(targetLocations.map(async locDoc => {
      const locName = locDoc.name;
      let runningLocBal = Number(locDoc.opening_balance || 0);
      let locOp = 0;
      let locCost = 0;
      let locPaid = 0;
      let locCl = 0;
      let locQty = 0;

      if (effectiveYear === 2026) {
        locOp = await this.getDec2025ClosingForLocation(locName);
        const allLocRecs = allRecords.filter(r => matchesLoc(r, locDoc));
        locCost = allLocRecs.reduce((sum, r) => sum + getFuelCost(r), 0);
        locPaid = allLocRecs.reduce((sum, r) => sum + getFuelPaid(r), 0);
        locCl = Math.max(0, Number((locOp + locCost - locPaid).toFixed(2)));
        locQty = allLocRecs.reduce((sum, r) => sum + getFuelRecQty(r), 0);
      } else if (reqMonth) {
        for (const m of months) {
          const mRecs = allRecords.filter(r => Number(r.reporting_month) === m && matchesLoc(r, locDoc));
          const isMEntered = mRecs.length > 0;
          const isMNext = (!isMEntered && lastEnteredMonth > 0 && m === lastEnteredMonth + 1);
          const mCost = mRecs.reduce((sum, r) => sum + getFuelCost(r), 0);
          const mPaid = mRecs.reduce((sum, r) => sum + getFuelPaid(r), 0);
          const mQty = mRecs.reduce((sum, r) => sum + getFuelRecQty(r), 0);
          let curOp = 0;
          let curCl = 0;
          if (isMEntered) {
            curOp = runningLocBal;
            curCl = Math.max(0, Number((curOp + mCost - mPaid).toFixed(2)));
            runningLocBal = curCl;
          } else if (isMNext) {
            curOp = runningLocBal;
            curCl = curOp;
          }

          if (m === reqMonth) {
            locOp = curOp;
            locCost = mCost;
            locPaid = mPaid;
            locCl = curCl;
            locQty = mQty;
            break;
          }
        }
      } else {
        const allLocRecs = allRecords.filter(r => matchesLoc(r, locDoc));
        locOp = Number(locDoc.opening_balance || 0);
        locCost = allLocRecs.reduce((sum, r) => sum + getFuelCost(r), 0);
        locPaid = allLocRecs.reduce((sum, r) => sum + getFuelPaid(r), 0);
        locCl = Math.max(0, Number((locOp + locCost - locPaid).toFixed(2)));
        locQty = allLocRecs.reduce((sum, r) => sum + getFuelRecQty(r), 0);
      }

      return {
        location: locName,
        name: locName,
        amount: locPaid,
        paidAmount: locPaid,
        totalCost: locCost,
        netPeriod: Number((locCost - locPaid).toFixed(2)),
        openingBalance: locOp,
        closingBalance: locCl,
        nextMonthOpening: locCl,
        quantity: locQty,
        amountFormatted: formatIndianCurrency(locPaid),
        totalCostFormatted: formatIndianCurrency(locCost),
        netPeriodFormatted: formatIndianCurrency(Number((locCost - locPaid).toFixed(2))),
        openingBalanceFormatted: formatIndianCurrency(locOp),
        closingBalanceFormatted: formatIndianCurrency(locCl)
      };
    }));

    locationSpending.sort((a, b) => {
      if (b.totalCost !== a.totalCost) {
        return b.totalCost - a.totalCost;
      }
      return b.closingBalance - a.closingBalance;
    });

    const ccRecs = records.filter(isCC);
    const targetCCRecs = ccRecs;
    const totalCCPaid = targetCCRecs.reduce((sum, r) => sum + (Number(r.paid_amount || r.data?.paid_amount || r.data?.total_cost || r.cash_and_carry) || 0), 0);
    const totalCCQty = targetCCRecs.reduce((sum, r) => sum + getFuelRecQty(r), 0);
    const ccSharePct = totalFuelExp > 0 ? Number(((totalCCPaid / totalFuelExp) * 100).toFixed(1)) : 0;

    const cashAndCarryTrend = ccRecs.length > 0 ? months.map(m => {
      const mRecs = targetCCRecs.filter(r => Number(r.reporting_month) === m);
      const mAllFuel = records.filter(r => Number(r.reporting_month) === m);
      const mQty = mRecs.reduce((sum, r) => sum + getFuelRecQty(r), 0);
      const mAmt = mRecs.reduce((sum, r) => sum + (Number(r.paid_amount || r.data?.paid_amount || r.data?.total_cost || r.cash_and_carry) || 0), 0);
      const allQty = mAllFuel.reduce((sum, r) => sum + getFuelRecQty(r), 0);
      return {
        monthNum: m,
        month: getMonthName(m),
        year: effectiveYear,
        label: `${getMonthName(m)} ${effectiveYear}`,
        quantity: Math.round(mQty),
        amount: mAmt,
        totalQuantity: Math.round(allQty),
        count: mRecs.length,
        amountFormatted: formatIndianCurrency(mAmt)
      };
    }) : [];

    const ccTopLocations = {};
    targetCCRecs.forEach(r => {
      const loc = r.location_name || r.location_id || 'Unknown';
      ccTopLocations[loc] = (ccTopLocations[loc] || 0) + (Number(r.quantity || r.data?.quantity) || 0);
    });
    const cashAndCarryTopLocations = Object.entries(ccTopLocations).map(([name, qty]) => ({
      name,
      quantity: Math.round(qty)
    })).sort((a, b) => b.quantity - a.quantity);

    const cashAndCarryAnalytics = ccRecs.length > 0 ? {
      totalQuantity: Math.round(totalCCQty),
      totalAmount: totalCCPaid,
      totalAmountFormatted: formatIndianCurrency(totalCCPaid),
      totalRecords: targetCCRecs.length,
      hasEntries: true,
      sharePercentage: ccSharePct,
      avgRate: totalCCQty > 0 ? Number((totalCCPaid / totalCCQty).toFixed(2)) : 0,
      trend: cashAndCarryTrend,
      topLocations: cashAndCarryTopLocations
    } : {
      totalQuantity: 0,
      totalAmount: 0,
      totalAmountFormatted: 'Rs. 0',
      totalRecords: 0,
      hasEntries: false,
      sharePercentage: 0,
      avgRate: 0,
      trend: [],
      topLocations: []
    };

    let displayedOpeningBalance = openingBalance;
    let displayedClosingBalance = closingBalance;
    let openingSubtext = 'Brought Forward';
    let closingSubtext = lastEnteredMonth > 0 ? `Next Month Opening (${getMonthName(lastEnteredMonth + 1)})` : 'Next Month Opening';

    if (params.month && params.month !== 'All') {
      const mStr = String(params.month).toLowerCase();
      const monthMap = { jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12 };
      const reqMonth = monthMap[mStr] || parseInt(params.month, 10);
      if (reqMonth) {
        const foundMonth = monthlySpending.find(m => m.monthNum === reqMonth);
        if (foundMonth) {
          displayedOpeningBalance = foundMonth.openingBalance;
          displayedClosingBalance = foundMonth.closingBalance;
          if (foundMonth.isImmediateNext) {
            openingSubtext = `Brought Forward from ${getMonthName(lastEnteredMonth)}`;
            closingSubtext = `Next Month Opening (${getMonthName(reqMonth + 1)})`;
          } else if (foundMonth.isEntered) {
            openingSubtext = reqMonth === 1 ? 'Brought Forward' : `Brought Forward from ${getMonthName(reqMonth - 1)}`;
            closingSubtext = `Next Month Opening (${getMonthName(reqMonth + 1)})`;
          }
        }
      }
    }

    return {
      kpis: {
        openingBalance: {
          value: displayedOpeningBalance,
          formatted: formatIndianCurrency(displayedOpeningBalance),
          label: 'Opening Balance',
          subtext: null
        },
        totalCost: {
          value: totalFuelCost,
          formatted: formatIndianCurrency(totalFuelCost),
          label: 'Total Amount (Fuel Cost)',
          subtext: null
        },
        totalPayments: {
          value: totalFuelExp,
          formatted: formatIndianCurrency(totalFuelExp),
          label: 'Total Paid Amount',
          subtext: null
        },
        closingBalance: {
          value: displayedClosingBalance,
          formatted: formatIndianCurrency(displayedClosingBalance),
          label: 'Closing Balance',
          subtext: null
        },
        totalFuelLiters: {
          value: totalLiters,
          formatted: `${formatIndianNumber(totalLiters, 2)} Ltrs`,
          label: 'Total Fuel Quantity',
          subtext: null
        },
        avgRatePerLiter: {
          value: avgRate,
          formatted: `Rs. ${avgRate.toFixed(2)} / Ltr`,
          label: 'Average Rate / Ltr',
          subtext: null
        },
        distinctLedgers: {
          value: distinctVendors,
          formatted: `${formatIndianNumber(distinctVendors, 0)} Project Divisions`,
          label: 'Project Divisions / Ledgers',
          subtext: null
        }
      },
      charts: {
        primaryTrend: monthlySpending.map(m => ({
          label: `${m.month} ${effectiveYear}`,
          month: m.month,
          year: effectiveYear,
          val1: m.amount,
          val2: m.quantity,
          amount: m.amount,
          paidAmount: m.amount,
          totalCost: m.totalCost,
          openingBalance: m.openingBalance,
          closingBalance: m.closingBalance,
          nextMonthOpening: m.nextMonthOpening,
          balance: m.closingBalance,
          isEntered: m.isEntered,
          isImmediateNext: m.isImmediateNext
        })),
        secondaryTrend: fuelTypeSpending,
        monthlySpending,
        fuelTypeSpending,
        locationSpending,
        cashAndCarryTrend,
        cashAndCarryAnalytics
      },
      records: records.slice(0, 100),
      year: effectiveYear,
      recordCount: records.length
    };
  }
  async getAccountsDashboard(params = {}) {
    const recordsColl = getCollection('monthly_report_records');
    const filter = this.buildFilter(params);
    const records = await recordsColl.find({
      ...filter,
      $or: [
        { paid_amount: { $gt: 0 } },
        { 'data.paid_amount': { $gt: 0 } },
        { 'data.total_cost': { $gt: 0 } }
      ]
    }).toArray();
    const getRecPaid = r => Number(r.paid_amount || (r.data && (r.data.paid_amount || r.data.total_cost)) || 0);
    const effectiveYear = (() => {
      if (params.from_date) {
        const m = String(params.from_date).match(/\b(20\d\d)\b/);
        if (m) return Number(m[1]);
      }
      if (params.to_date) {
        const m = String(params.to_date).match(/\b(20\d\d)\b/);
        if (m) return Number(m[1]);
      }
      if (params.year) {
        if (String(params.year).toUpperCase() === 'ALL') return 'All';
        const y = Number(params.year);
        if (!isNaN(y) && y > 2000) return y;
      }
      const recWithYr = records.find(r => r.reporting_year);
      if (recWithYr) return Number(recWithYr.reporting_year);
      return 2025;
    })();
    const totalPaid = records.reduce((acc, r) => acc + getRecPaid(r), 0);
    const vendorSet = new Set(records.map(r => r.vendor_name || (r.data && (r.data.ledger_type || r.data.vendor_name || r.data.vendor)) || r.vendor_id).filter(Boolean));
    const locSet = new Set(records.map(r => r.location_name || r.location_id).filter(Boolean));
    const deptSet = new Set(records.map(r => r.department_name || (r.data && (r.data.department_beneficiary || r.data.department)) || r.department_id).filter(Boolean));
    const avgPaid = records.length > 0 ? Math.round(totalPaid / records.length) : 0;
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const monthlyPayments = months.map(m => {
      const mRecs = records.filter(r => Number(r.reporting_month) === m);
      const amt = mRecs.reduce((acc, r) => acc + getRecPaid(r), 0);
      return {
        monthNum: m,
        month: getMonthName(m),
        year: effectiveYear,
        label: `${getMonthName(m)} ${effectiveYear}`,
        amount: amt,
        amountFormatted: formatIndianCurrency(amt)
      };
    });
    const deptMap = {};
    const deptNames = {
      'STORES': 'MMS (Fuel)',
      'MMS': 'MMS (Fuel)',
      'FUEL': 'MMS (Fuel)',
      'ACCOUNTS': 'Accounts & Finance',
      'PM': 'Plant & Machinery',
      'ADMIN': 'Administration',
      'PLANNING': 'Project Planning',
      'IT': 'IT & Systems',
      'IT&MIS': 'IT & MIS'
    };
    records.forEach(r => {
      const recPaid = getRecPaid(r);
      const rawDept = String(r.department_name || (r.data && (r.data.department_beneficiary || r.data.department)) || r.department_id || 'General').toUpperCase();
      const d = deptNames[rawDept] || (r.data && (r.data.department_beneficiary || r.data.department)) || r.department_name || r.department_id || 'General';
      deptMap[d] = (deptMap[d] || 0) + recPaid;
    });
    const departmentPayments = Object.entries(deptMap).map(([department, amount]) => ({
      department,
      amount,
      amountFormatted: formatIndianCurrency(amount)
    })).sort((a, b) => b.amount - a.amount);
    const locMap = {};
    records.forEach(r => {
      const l = r.location_name || r.location_id || 'General';
      locMap[l] = (locMap[l] || 0) + getRecPaid(r);
    });
    const locationPayments = Object.entries(locMap).map(([location, amount]) => ({
      location,
      amount,
      amountFormatted: formatIndianCurrency(amount)
    })).sort((a, b) => b.amount - a.amount);
    const servMap = {};
    records.forEach(r => {
      const s = r.service_type_name || (r.data && r.data.service_type) || r.service_type_id || 'Other';
      servMap[s] = (servMap[s] || 0) + getRecPaid(r);
    });
    const servicePayments = Object.entries(servMap).map(([service, amount]) => ({
      service,
      amount,
      percentage: totalPaid > 0 ? Number(((amount / totalPaid) * 100).toFixed(1)) : 0,
      amountFormatted: formatIndianCurrency(amount)
    })).sort((a, b) => b.amount - a.amount);
    const venMap = {};
    records.forEach(r => {
      const v = r.vendor_name || (r.data && (r.data.ledger_type || r.data.vendor_name || r.data.vendor)) || r.vendor_id || 'Unknown';
      venMap[v] = (venMap[v] || 0) + getRecPaid(r);
    });
    const vendorPayments = Object.entries(venMap).map(([vendor, amount]) => ({
      vendor,
      amount,
      amountFormatted: formatIndianCurrency(amount)
    })).sort((a, b) => b.amount - a.amount);
    const storesAmt = records
      .filter(r => r.department_id === 'STORES' || r.department_id === 'MMS' || r.report_type_id === 'FUEL_PURCHASE' || r.report_type_id === 'STORES_PURCHASE' || r.category === 'Fuel' || (r.data && (r.data.fuel_type || r.data.fuel_expense)))
      .reduce((sum, r) => sum + getRecPaid(r), 0);
    const accountsAmt = totalPaid - storesAmt;
    return {
      kpis: {
        totalPayments: {
          value: totalPaid,
          formatted: `Rs. ${Number(totalPaid).toLocaleString('en-IN')}`,
          label: 'Total Project Payments',
          subtext: null
        },
        avgPayment: {
          value: avgPaid,
          formatted: formatIndianCurrency(avgPaid),
          label: 'Average Payment Value',
          subtext: null
        },
        storesExp: {
          value: storesAmt,
          formatted: formatIndianCurrency(storesAmt),
          label: 'Materials & Fuel Disbursements',
          subtext: null
        },
        accountsExp: {
          value: accountsAmt,
          formatted: formatIndianCurrency(accountsAmt),
          label: 'Accounts & Operations Spend',
          subtext: null
        },
        fundedSites: {
          value: locSet.size,
          formatted: `${locSet.size} Project Divisions Funded`,
          label: 'Project Divisions Funded',
          subtext: null
        }
      },
      charts: {
        primaryTrend: monthlyPayments.map(m => ({ label: `${m.month} ${effectiveYear}`, year: effectiveYear, month: m.month, val1: m.amount })),
        secondaryTrend: departmentPayments.map(d => ({ name: d.department, value: d.amount })),
        monthlyPayments,
        monthlySpending: monthlyPayments,
        departmentPayments,
        locationPayments,
        servicePayments,
        serviceSpending: servicePayments,
        vendorPayments
      },
      records: records.slice(0, 100),
      year: effectiveYear,
      recordCount: records.length
    };
  }
  async getAdminDashboard(params = {}) {
    const recordsColl = getCollection('monthly_report_records');
    const filter = this.buildFilter({ ...params, department: 'ADMIN' });
    const records = await recordsColl.find(filter).toArray();
    const effectiveYear = (() => {
      if (params.from_date) {
        const m = String(params.from_date).match(/\b(20\d\d)\b/);
        if (m) return Number(m[1]);
      }
      if (params.to_date) {
        const m = String(params.to_date).match(/\b(20\d\d)\b/);
        if (m) return Number(m[1]);
      }
      if (params.year) {
        if (String(params.year).toUpperCase() === 'ALL') return 'All';
        const y = Number(params.year);
        if (!isNaN(y) && y > 2000) return y;
      }
      const recWithYr = records.find(r => r.reporting_year);
      if (recWithYr) return Number(recWithYr.reporting_year);
      return 2025;
    })();
    const totalExp = records.reduce((acc, r) => acc + (Number(r.paid_amount) || 0), 0);
    const vendorSet = new Set(records.map(r => r.vendor_name || r.vendor_id).filter(Boolean));
    const locSet = new Set(records.map(r => r.location_id).filter(Boolean));
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const monthlyExp = months.map(m => {
      const mRecs = records.filter(r => Number(r.reporting_month) === m);
      const amt = mRecs.reduce((acc, r) => acc + (Number(r.paid_amount) || 0), 0);
      return {
        monthNum: m,
        month: getMonthName(m),
        year: effectiveYear,
        label: `${getMonthName(m)} ${effectiveYear}`,
        amount: amt,
        amountFormatted: formatIndianCurrency(amt)
      };
    });
    const catMap = {};
    records.forEach(r => {
      const c = r.category || 'Utilities';
      catMap[c] = (catMap[c] || 0) + (Number(r.paid_amount) || 0);
    });
    const categoryAnalysis = Object.entries(catMap).map(([category, amount]) => ({
      category,
      amount,
      amountFormatted: formatIndianCurrency(amount)
    })).sort((a, b) => b.amount - a.amount);
    const locMap = {};
    records.forEach(r => {
      const l = r.location_name || r.location_id || 'Unknown';
      locMap[l] = (locMap[l] || 0) + (Number(r.paid_amount) || 0);
    });
    const locationAnalysis = Object.entries(locMap).map(([location, amount]) => ({
      location,
      amount,
      amountFormatted: formatIndianCurrency(amount)
    })).sort((a, b) => b.amount - a.amount);
    return {
      kpis: {
        totalAmount: {
          value: totalExp,
          formatted: formatIndianCurrency(totalExp),
          label: 'Total Amount',
          subtext: null
        },
        distinctVendors: {
          value: vendorSet.size,
          formatted: formatIndianNumber(vendorSet.size),
          label: 'Distinct Vendors Represented',
          subtext: null
        },
        locations: {
          value: locSet.size,
          formatted: formatIndianNumber(locSet.size),
          label: 'Locations Reporting',
          subtext: null
        },
        recordsCount: {
          value: records.length,
          formatted: formatIndianNumber(records.length),
          label: 'Records',
          subtext: null
        }
      },
      charts: {
        primaryTrend: monthlyExp.map(m => ({ label: `${m.month} ${effectiveYear}`, year: effectiveYear, month: m.month, val1: m.amount })),
        secondaryTrend: categoryAnalysis.map(c => ({ name: c.category, value: c.amount })),
        monthlyExp,
        categoryAnalysis,
        locationAnalysis
      },
      optionalReports: [
        { name: 'Headcount / staffing', fields: 'employee_count, month, location', status: 'Needs data' },
        { name: 'Travel', fields: 'travel_expense, category, month', status: 'Needs data' },
        { name: 'Accommodation', fields: 'accommodation_expense, location, month', status: 'Needs data' },
        { name: 'Vendor/service spending', fields: 'vendor_id, service_type, paid_amount', status: records.length ? 'Available' : 'Needs data' }
      ],
      records: records.slice(0, 100),
      year: effectiveYear,
      recordCount: records.length
    };
  }
  async getPlanningDashboard(params = {}) {
    const recordsColl = getCollection('monthly_report_records');
    const filter = this.buildFilter({ ...params, department: 'PLANNING' });
    const records = await recordsColl.find(filter).toArray();
    let plannedPct = null;
    let actualPct = null;
    let progressVariance = null;
    let totalQtyAchieved = 0;
    if (records.length > 0) {
      const lastRec = records[records.length - 1];
      if (lastRec.planned_progress !== undefined) plannedPct = Number(lastRec.planned_progress);
      if (lastRec.actual_progress !== undefined) actualPct = Number(lastRec.actual_progress);
      if (plannedPct !== null && actualPct !== null) {
        progressVariance = Number((actualPct - plannedPct).toFixed(1));
      }
      totalQtyAchieved = records.reduce((acc, r) => acc + (Number(r.quantity_achieved) || 0), 0);
    }
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const progressTrend = months.map(m => {
      const mRec = records.find(r => Number(r.reporting_month) === m);
      return {
        monthNum: m,
        month: getMonthName(m),
        planned: mRec ? Number(mRec.planned_progress) || null : null,
        actual: mRec ? Number(mRec.actual_progress) || null : null
      };
    });
    return {
      kpis: {
        plannedProgress: {
          value: plannedPct,
          formatted: plannedPct !== null ? `${plannedPct}%` : 'Not available',
          label: 'Planned Progress',
          subtext: null
        },
        actualProgress: {
          value: actualPct,
          formatted: actualPct !== null ? `${actualPct}%` : 'Not available',
          label: 'Actual Progress',
          subtext: null
        },
        progressVariance: {
          value: progressVariance,
          formatted: progressVariance !== null ? `${progressVariance > 0 ? '+' : ''}${progressVariance} pp` : 'Not available',
          label: 'Progress Variance',
          subtext: null
        },
        cumulativeProgress: {
          value: actualPct,
          formatted: actualPct !== null ? `${actualPct}%` : 'Not available',
          label: 'Cumulative Progress',
          subtext: null
        },
        quantityAchieved: {
          value: totalQtyAchieved,
          formatted: totalQtyAchieved > 0 ? `${formatIndianNumber(totalQtyAchieved)} m` : 'Not available',
          label: 'Quantity Achieved',
          subtext: null
        },
        milestones: {
          value: '14 / 22',
          formatted: '14 / 22',
          label: 'Milestones Completed',
          subtext: null
        }
      },
      charts: {
        progressTrend,
        primaryTrend: progressTrend.map(p => ({ label: p.month, val1: p.actual, val2: p.planned }))
      },
      records: records.slice(0, 100),
      recordCount: records.length
    };
  }
  async getDepartmentDashboard(deptIdentifier, params = {}) {
    const deptsColl = getCollection('departments');
    let deptDoc = null;
    try {
      const safeId = String(deptIdentifier || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      deptDoc = await deptsColl.findOne({
        $or: [
          { code: new RegExp('^' + safeId + '$', 'i') },
          { id: new RegExp('^' + safeId + '$', 'i') },
          { name: new RegExp('^' + safeId + '$', 'i') }
        ]
      });
    } catch {}

    const deptName = deptDoc?.name || deptIdentifier || 'Department';
    const recordsColl = getCollection('monthly_report_records');
    const filter = this.buildFilter({ ...params, department: deptName });
    const records = await recordsColl.find(filter).toArray();

    const totalExp = records.reduce((acc, r) => acc + (Number(r.paid_amount || r.data?.paid_amount || r.data?.total_cost) || 0), 0);
    const vendorSet = new Set(records.map(r => r.vendor_name || r.data?.vendor_name || r.vendor_id).filter(Boolean));
    const locSet = new Set(records.map(r => r.location_name || r.location_id || r.data?.location).filter(Boolean));
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const monthlyExp = months.map(m => {
      const mRecs = records.filter(r => Number(r.reporting_month) === m);
      const amt = mRecs.reduce((acc, r) => acc + (Number(r.paid_amount || r.data?.paid_amount || r.data?.total_cost) || 0), 0);
      return {
        monthNum: m,
        month: getMonthName(m),
        amount: amt,
        amountFormatted: formatIndianCurrency(amt)
      };
    });

    const catMap = {};
    records.forEach(r => {
      const c = r.category || r.report_type_id || 'Operational';
      catMap[c] = (catMap[c] || 0) + (Number(r.paid_amount || r.data?.paid_amount || r.data?.total_cost) || 0);
    });
    const categoryAnalysis = Object.entries(catMap).map(([category, amount]) => ({
      category,
      amount,
      amountFormatted: formatIndianCurrency(amount)
    })).sort((a, b) => b.amount - a.amount);

    const locMap = {};
    records.forEach(r => {
      const l = r.location_name || r.location_id || r.data?.location || 'Unknown';
      locMap[l] = (locMap[l] || 0) + (Number(r.paid_amount || r.data?.paid_amount || r.data?.total_cost) || 0);
    });
    const locationAnalysis = Object.entries(locMap).map(([location, amount]) => ({
      location,
      amount,
      amountFormatted: formatIndianCurrency(amount)
    })).sort((a, b) => b.amount - a.amount);

    return {
      kpis: {
        totalAmount: {
          value: totalExp,
          formatted: formatIndianCurrency(totalExp),
          label: 'Total Amount',
          subtext: null
        },
        distinctVendors: {
          value: vendorSet.size,
          formatted: formatIndianNumber(vendorSet.size),
          label: 'Active Vendors / Entities',
          subtext: null
        },
        locations: {
          value: locSet.size,
          formatted: formatIndianNumber(locSet.size),
          label: 'Locations Reporting',
          subtext: null
        },
        recordsCount: {
          value: records.length,
          formatted: formatIndianNumber(records.length),
          label: 'Operational Records Logged',
          subtext: null
        }
      },
      charts: {
        primaryTrend: monthlyExp.map(m => ({ label: m.month, val1: m.amount })),
        secondaryTrend: categoryAnalysis.map(c => ({ name: c.category, value: c.amount })),
        monthlyExp,
        categoryAnalysis,
        locationAnalysis
      },
      records: records.slice(0, 100),
      recordCount: records.length
    };
  }
  async getLocationDashboard(locationId, params = {}) {
    const recordsColl = getCollection('monthly_report_records');
    const locsColl = getCollection('project_locations');
    const deptsColl = getCollection('departments');
    const allDepts = await deptsColl.find({ active: { $ne: false } }).toArray();
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    const isAllLoc = !locationId || locationId === 'All' || String(locationId).toLowerCase() === 'all';
    let loc;
    if (isAllLoc) {
      loc = { id: 'All', code: 'ALL', name: 'All Project Divisions', state: 'All Construction Sites' };
    } else {
      const safePattern = String(locationId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const safeRegex = new RegExp(`^${safePattern}$`, 'i');
      loc = await locsColl.findOne({
        $or: [
          { id: locationId },
          { code: locationId },
          { name: locationId },
          { name: safeRegex },
          { id: safeRegex },
          { code: safeRegex }
        ]
      });
      if (!loc) {
        loc = { id: locationId, code: locationId, name: locationId, state: '(master)' };
      }
    }

    const filter = this.buildFilter({ ...params, location: isAllLoc ? 'All' : (loc.id || loc.name || locationId) });
    const records = await recordsColl.find(filter).toArray();
    const effectiveYear = (() => {
      if (params.from_date) {
        const m = String(params.from_date).match(/\b(20\d\d)\b/);
        if (m) return Number(m[1]);
      }
      if (params.to_date) {
        const m = String(params.to_date).match(/\b(20\d\d)\b/);
        if (m) return Number(m[1]);
      }
      if (params.year) {
        if (String(params.year).toUpperCase() === 'ALL') return 'All';
        const y = Number(params.year);
        if (!isNaN(y) && y > 2000) return y;
      }
      const recWithYr = records.find(r => r.reporting_year);
      if (recWithYr) return Number(recWithYr.reporting_year);
      return 2025;
    })();

    if (records.length === 0) {
      let locOp = 0;
      if (effectiveYear === 2026) {
        locOp = await this.getDec2025ClosingForLocation(loc.name);
      } else {
        locOp = Number(loc.opening_balance || 0);
      }
      return {
        location: loc,
        isDemo: false,
        lastUpdated: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        kpis: {
          openingBalance: {
            value: locOp,
            formatted: formatIndianCurrency(locOp),
            label: 'Opening Balance',
            subtext: null
          },
          closingBalance: {
            value: locOp,
            formatted: formatIndianCurrency(locOp),
            label: 'Closing Balance',
            subtext: null
          },
          totalPayments: {
            value: 0,
            formatted: 'Rs. 0',
            label: 'Total Amount',
            subtext: null
          },
          distinctVendors: {
            value: 0,
            formatted: '0',
            label: 'Distinct Ledgers',
            subtext: null
          },
          departmentsReporting: {
            value: 0,
            total: allDepts.length || 5,
            formatted: `0 of ${allDepts.length || 5}`,
            label: 'Departments Reporting',
            subtext: null
          },
          reportingRecords: {
            value: 0,
            formatted: '0',
            label: 'Reporting Records',
            subtext: null
          },
          operationalKPI: {
            value: 0,
            formatted: '0 h',
            label: 'P&M Working Hours',
            subtext: null
          },
          pmHours: {
            value: 0,
            formatted: '0 h',
            label: 'P&M Working Hours',
            subtext: null
          },
          storesExp: {
            value: 0,
            formatted: 'Rs. 0',
            label: 'Stores Amount',
            subtext: null
          },
          fuelExp: {
            value: 0,
            formatted: 'Rs. 0',
            label: 'Fuel & P&M Amount',
            subtext: null
          },
          submissionCoverage: {
            value: 0,
            formatted: '0%',
            label: 'Submission Coverage',
            subtext: null
          }
        },
        charts: {
          monthlySpending: months.map(m => ({
            monthNum: m,
            month: getMonthName(m),
            year: effectiveYear,
            label: `${getMonthName(m)} ${effectiveYear}`,
            amount: 0,
            amountRaw: 0,
            amountFormatted: 'Rs. 0',
            openingBalance: (effectiveYear === 2026 && m === 1) ? locOp : 0,
            closingBalance: (effectiveYear === 2026 && m === 1) ? locOp : 0,
            isImmediateNext: (effectiveYear === 2026 && m === 1)
          })),
          departmentExpenditure: [],
          deptBreakdown: [],
          serviceSpending: [],
          vendorSpending: []
        },
        departmentOverview: allDepts.map(d => ({
          department: d.name,
          measure: 'Total Amount',
          value: '0'
        })),
        registerRecords: [],
        records: [],
        recordCount: 0
      };
    }
    const totalPaid = records.reduce((acc, r) => acc + (Number(r.paid_amount) || 0), 0);
    const vendorSet = new Set(records.map(r => r.ledger_type || r.vendor_name || r.vendor_id).filter(Boolean));
    const deptSet = new Set(records.map(r => r.department_id).filter(Boolean));
    const pmRecs = records.filter(r => {
      const rd = String(r.department_id || '').toUpperCase();
      return rd === 'PM' || rd === 'FUEL' || rd === 'DPT-0002' || r.report_type_id === 'FUEL_PURCHASE' || r.category === 'Fuel';
    });
    const pmWorkHours = pmRecs.reduce((acc, r) => acc + (Number(r.working_hours) || 0), 0);
    const fuelPaid = pmRecs.reduce((acc, r) => acc + (Number(r.paid_amount) || 0), 0);

    const storesRecs = records.filter(r => {
      const rd = String(r.department_id || '').toUpperCase();
      return (rd === 'STORES' || rd === 'MMS' || rd === 'DPT-0003' || r.report_type_id === 'STORES_PURCHASE') && r.report_type_id !== 'FUEL_PURCHASE' && r.category !== 'Fuel';
    });
    const storesPaid = storesRecs.reduce((acc, r) => acc + (Number(r.paid_amount) || 0), 0);

    let locOp = 0;
    if (effectiveYear === 2026) {
      locOp = await this.getDec2025ClosingForLocation(loc.name);
    } else {
      locOp = Number(loc.opening_balance || 0);
    }
    const enteredMonths = months.filter(m => records.some(r => Number(r.reporting_month) === m));
    const lastEnteredMonth = enteredMonths.length > 0 ? Math.max(...enteredMonths) : 0;
    let runningLocBal = locOp;

    const submissionCoverage = allDepts.length > 0 ? Math.round((deptSet.size / allDepts.length) * 100) : 0;
    const monthlySpending = months.map(m => {
      const mRecs = records.filter(r => Number(r.reporting_month) === m);
      const isEntered = mRecs.length > 0;
      const isImmediateNext = (!isEntered && lastEnteredMonth > 0 && m === lastEnteredMonth + 1) || (effectiveYear === 2026 && !isEntered && lastEnteredMonth === 0 && m === 1);
      const amt = mRecs.reduce((acc, r) => acc + (Number(r.paid_amount) || 0), 0);
      const totalCostAmt = mRecs.reduce((acc, r) => acc + (Number(r.total_cost || r.data?.total_cost || r.paid_amount) || 0), 0);
      let mOpBal = 0;
      let mClBal = 0;
      if (isEntered) {
        mOpBal = runningLocBal;
        mClBal = Number((mOpBal + totalCostAmt - amt).toFixed(2));
        runningLocBal = mClBal;
      } else if (isImmediateNext) {
        mOpBal = runningLocBal;
        mClBal = mOpBal;
      }
      return {
        monthNum: m,
        month: getMonthName(m),
        year: effectiveYear,
        label: `${getMonthName(m)} ${effectiveYear}`,
        amount: Number((amt / 100000).toFixed(1)),
        amountRaw: amt,
        amountFormatted: formatIndianCurrency(amt),
        openingBalance: mOpBal,
        closingBalance: mClBal,
        isImmediateNext
      };
    });
    const deptMap = {};
    records.forEach(r => {
      let d = r.department_name || r.department_id || 'Other';
      if (d === 'PM' || r.report_type_id === 'FUEL_PURCHASE') d = 'Plant & Machinery';
      else if (d === 'STORES' || d === 'MMS') d = 'Stores';
      deptMap[d] = (deptMap[d] || 0) + (Number(r.paid_amount) || 0);
    });
    const departmentExpenditure = Object.entries(deptMap).map(([dept, amount]) => ({
      department: dept,
      spending: Number((amount / 100000).toFixed(1)),
      amount: Number((amount / 100000).toFixed(1)),
      amountRaw: amount,
      amountFormatted: formatIndianCurrency(amount)
    })).sort((a, b) => b.amount - a.amount);
    const servMap = {};
    records.forEach(r => {
      const s = r.service_type_name || r.service_type_id || 'Other';
      servMap[s] = (servMap[s] || 0) + (Number(r.paid_amount) || 0);
    });
    const serviceSpending = Object.entries(servMap).map(([service, amount]) => ({
      service,
      amount,
      percentage: totalPaid > 0 ? Number(((amount / totalPaid) * 100).toFixed(1)) : 0,
      amountFormatted: formatIndianCurrency(amount)
    })).sort((a, b) => b.amount - a.amount);
    const venMap = {};
    records.forEach(r => {
      const v = r.ledger_type || r.vendor_name || r.vendor_id || 'Unknown';
      venMap[v] = (venMap[v] || 0) + (Number(r.paid_amount) || 0);
    });
    const vendorSpending = Object.entries(venMap).map(([vendor, amount]) => ({
      vendor,
      amount: Number((amount / 100000).toFixed(1)),
      amountRaw: amount,
      amountFormatted: formatIndianCurrency(amount)
    })).sort((a, b) => b.amount - a.amount);
    const departmentOverview = allDepts.map(d => {
      const dCode = String(d.code || d.id || '').trim().toUpperCase();
      const dName = String(d.name || '').trim().toUpperCase();

      const isPM = dCode === 'PM' || dCode === 'DPT-0002' || dName.includes('PLANT') || dName.includes('MACHINERY');
      const isStores = dCode === 'STORES' || dCode === 'MMS' || dCode === 'DPT-0003' || dName.includes('STORE');
      const isAdmin = dCode === 'ADMIN' || dCode === 'DPT-0004' || dName.includes('ADMIN');
      const isIT = dCode === 'IT' || dCode === 'MIS' || dCode === 'DPT-0001' || dName.includes('IT');

      const dRecs = records.filter(r => {
        const rd = String(r.department_id || r.department_name || '').trim().toUpperCase();
        if (isPM) return rd === 'PM' || rd === 'FUEL' || rd === 'DPT-0002' || r.report_type_id === 'FUEL_PURCHASE' || r.category === 'Fuel';
        if (isStores) return (rd === 'STORES' || rd === 'MMS' || rd === 'DPT-0003' || r.report_type_id === 'STORES_PURCHASE') && r.report_type_id !== 'FUEL_PURCHASE';
        if (isAdmin) return rd === 'ADMIN' || rd === 'DPT-0004' || r.report_type_id === 'ADMIN_EXPENSE';
        if (isIT) return rd === 'IT' || rd === 'MIS' || rd === 'DPT-0001';
        return rd === dCode || rd === dName;
      });

      let measure = 'Total Amount';
      let value = '0';
      if (isPM) {
        measure = 'Fuel & Working Hrs';
        const wh = dRecs.reduce((acc, r) => acc + (Number(r.working_hours) || 0), 0);
        const fAmt = dRecs.reduce((acc, r) => acc + (Number(r.paid_amount) || 0), 0);
        if (fAmt > 0 && wh > 0) {
          value = `${formatIndianNumber(wh)} h / ${formatIndianCurrency(fAmt)}`;
        } else if (fAmt > 0) {
          value = formatIndianCurrency(fAmt);
        } else if (wh > 0) {
          value = `${formatIndianNumber(wh)} h`;
        } else {
          value = '0';
        }
      } else if (isStores) {
        measure = 'Material / Stores';
        const amt = dRecs.reduce((acc, r) => acc + (Number(r.paid_amount) || 0), 0);
        value = amt > 0 ? formatIndianCurrency(amt) : '0';
      } else if (isAdmin) {
        measure = 'Paid';
        const amt = dRecs.reduce((acc, r) => acc + (Number(r.paid_amount) || 0), 0);
        value = amt > 0 ? formatIndianCurrency(amt) : '0';
      } else {
        const amt = dRecs.reduce((acc, r) => acc + (Number(r.paid_amount) || 0), 0);
        value = amt > 0 ? formatIndianCurrency(amt) : '0';
      }
      return {
        department: d.name,
        measure,
        value
      };
    });
    const monthShortNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const registerRecords = records.slice(0, 10).map((r, i) => ({
      period: `${monthShortNames[Number(r.reporting_month)] || 'Sep'} ${String(r.reporting_year || effectiveYear).slice(-2)}`,
      dept: r.department_name || r.department_id || 'P&M',
      report: r.report_type_name || r.report_type_id || 'Utilization',
      rec: r.batch_id || `REC-0${600 + i}`
    }));
    return {
      location: loc,
      isDemo: false,
      lastUpdated: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      kpis: {
        openingBalance: {
          value: locOp,
          formatted: formatIndianCurrency(locOp),
          label: 'Opening Balance',
          subtext: null
        },
        closingBalance: {
          value: runningLocBal,
          formatted: formatIndianCurrency(runningLocBal),
          label: 'Closing Balance',
          subtext: null
        },
        totalPayments: {
          value: totalPaid,
          formatted: formatIndianCurrency(totalPaid),
          label: 'Total Amount',
          subtext: null
        },
        distinctVendors: {
          value: vendorSet.size,
          formatted: formatIndianNumber(vendorSet.size),
          label: 'Distinct Ledgers',
          subtext: null
        },
        departmentsReporting: {
          value: deptSet.size,
          total: allDepts.length,
          formatted: `${deptSet.size} of ${allDepts.length}`,
          label: 'Departments Reporting',
          subtext: null
        },
        reportingRecords: {
          value: records.length,
          formatted: formatIndianNumber(records.length),
          label: 'Reporting Records',
          subtext: null
        },
        operationalKPI: {
          value: pmWorkHours,
          formatted: pmWorkHours > 0 ? `${formatIndianNumber(pmWorkHours)} h` : '0 h',
          label: 'P&M Working Hours',
          subtext: null
        },
        pmHours: {
          value: pmWorkHours,
          formatted: pmWorkHours > 0 ? `${formatIndianNumber(pmWorkHours)} h` : '0 h',
          label: 'P&M Working Hours',
          subtext: null
        },
        storesExp: {
          value: storesPaid,
          formatted: formatIndianCurrency(storesPaid),
          label: 'Stores Amount',
          subtext: null
        },
        fuelExp: {
          value: fuelPaid,
          formatted: formatIndianCurrency(fuelPaid),
          label: 'Fuel & P&M Amount',
          subtext: null
        },
        submissionCoverage: {
          value: submissionCoverage,
          formatted: `${submissionCoverage}%`,
          label: 'Submission Coverage',
          subtext: null
        }
      },
      charts: {
        monthlySpending,
        departmentExpenditure,
        deptBreakdown: departmentExpenditure,
        serviceSpending,
        vendorSpending
      },
      departmentOverview,
      registerRecords,
      records: records.slice(0, 100),
      year: effectiveYear,
      recordCount: records.length
    };
  }
}
module.exports = new AggregationService();
