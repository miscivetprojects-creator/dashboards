import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip 
} from 'recharts';
import { Wrench, Package, Receipt, ShieldCheck, CalendarRange, Layers, Plus, Fuel, TrendingUp, Laptop } from 'lucide-react';
import KPICard from '../components/KPICard';
import EmptyState from '../components/EmptyState';
import { api } from '../services/api';
import { formatINR, formatNumber } from '../utils/formatUtils';

const DEPARTMENT_METADATA = {
  pm: {
    title: 'Plant & Machinery (P&M)',
    subtitle: 'Plant & Machinery — Heavy equipment assets, working hours, utilization and maintenance',
    icon: Wrench,
    apiMethod: 'getPMDashboard',
    badge: 'P&M'
  },
  fuel: {
    title: 'Fuel Management',
    subtitle: 'Site diesel intake, litres, fuel rates, suppliers, and machinery tracking',
    icon: Fuel,
    apiMethod: 'getFuelDashboard',
    badge: 'Fuel'
  },
  mms: {
    title: 'Stores & Materials (MMS)',
    subtitle: 'Site stores, cement, steel, materials intake, and stock tracking',
    icon: Package,
    apiMethod: 'getStoresDashboard',
    badge: 'MMS'
  },
  stores: {
    title: 'Stores & Materials (MMS)',
    subtitle: 'Site stores, cement, steel, materials intake, and stock tracking',
    icon: Package,
    apiMethod: 'getStoresDashboard',
    badge: 'MMS'
  },
  admin: {
    title: 'Administration',
    subtitle: 'Site camp upkeep, field logistics, staff utilities, and compliance logs',
    icon: ShieldCheck,
    apiMethod: 'getAdminDashboard',
    badge: 'ADMIN'
  },
  planning: {
    title: 'Project Planning & Progress',
    subtitle: 'Construction milestones, planned vs actual schedule adherence, and progress logs',
    icon: CalendarRange,
    apiMethod: 'getPlanningDashboard',
    badge: 'PLANNING'
  },
  it: {
    title: 'IT & MIS',
    subtitle: 'Digital operations, site connectivity, hardware assets, and MIS software logs',
    icon: Laptop,
    apiMethod: 'getDepartmentDashboard',
    badge: 'IT & MIS',
    deptName: 'IT & MIS'
  },
  mis: {
    title: 'IT & MIS',
    subtitle: 'Digital operations, site connectivity, hardware assets, and MIS software logs',
    icon: Laptop,
    apiMethod: 'getDepartmentDashboard',
    badge: 'IT & MIS',
    deptName: 'IT & MIS'
  },
  'it & mis': {
    title: 'IT & MIS',
    subtitle: 'Digital operations, site connectivity, hardware assets, and MIS software logs',
    icon: Laptop,
    apiMethod: 'getDepartmentDashboard',
    badge: 'IT & MIS',
    deptName: 'IT & MIS'
  },
  'it_mis': {
    title: 'IT & MIS',
    subtitle: 'Digital operations, site connectivity, hardware assets, and MIS software logs',
    icon: Laptop,
    apiMethod: 'getDepartmentDashboard',
    badge: 'IT & MIS',
    deptName: 'IT & MIS'
  },
  'dpt-0001': {
    title: 'IT & MIS',
    subtitle: 'Digital operations, site connectivity, hardware assets, and MIS software logs',
    icon: Laptop,
    apiMethod: 'getDepartmentDashboard',
    badge: 'IT & MIS',
    deptName: 'IT & MIS'
  }
};

function getDepartmentProfile(deptId, departments = []) {
  let norm = String(deptId || '').toLowerCase().trim();
  if (norm === 'pm' || norm === 'dpt-0002' || norm === 'accounts') {
    norm = 'fuel';
  }
  if (DEPARTMENT_METADATA[norm]) {
    return DEPARTMENT_METADATA[norm];
  }
  const match = departments.find(d => 
    (d.code || '').toLowerCase() === norm ||
    (d.id || '').toLowerCase() === norm ||
    (d._id || '').toLowerCase() === norm ||
    (d.name || '').toLowerCase() === norm
  );
  if (match) {
    const isIt = match.name.toLowerCase().includes('it') || match.name.toLowerCase().includes('mis');
    return {
      title: match.name,
      subtitle: `${match.name} — Departmental operational registers and payments tracking`,
      icon: isIt ? Laptop : Layers,
      apiMethod: 'getDepartmentDashboard',
      badge: match.code || match.name,
      deptName: match.name
    };
  }
  return {
    title: String(deptId || 'Department').toUpperCase(),
    subtitle: `${String(deptId || 'Department').toUpperCase()} — Departmental operational registers and payments tracking`,
    icon: Layers,
    apiMethod: 'getDepartmentDashboard',
    badge: String(deptId || 'DEP').toUpperCase(),
    deptName: deptId
  };
}

function formatAxisINR(val) {
  if (val >= 10000000) return `${(val / 10000000).toFixed(1)} Cr`;
  if (val >= 100000) return `${(val / 100000).toFixed(1)} L`;
  if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
  return val;
}

export default function DeptDashboard({ deptId = 'pm', departments = [], filters, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [dashboardMetrics, setDashboardMetrics] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  const activeDeptProfile = getDepartmentProfile(deptId, departments);

  const activeYear = (() => {
    if (filters?.from_date) {
      const match = String(filters.from_date).match(/\b(20\d\d)\b/);
      if (match) return match[1];
    }
    if (filters?.to_date) {
      const match = String(filters.to_date).match(/\b(20\d\d)\b/);
      if (match) return match[1];
    }
    if (filters?.year) return String(filters.year);
    if (dashboardMetrics?.year) return String(dashboardMetrics.year);
    return '2025';
  })();

  useEffect(() => {
    fetchDepartmentData();
  }, [deptId, filters, departments]);

  async function fetchDepartmentData() {
    setLoading(true);
    setFetchError(null);
    try {
      const methodName = activeDeptProfile.apiMethod;
      let response;
      if (methodName === 'getDepartmentDashboard') {
        const queryDept = activeDeptProfile.deptName || deptId;
        response = await api.getDepartmentDashboard(queryDept, filters);
      } else if (typeof api[methodName] === 'function') {
        response = await api[methodName](filters);
      } else {
        response = await api.getDepartmentDashboard(deptId, filters);
      }
      setDashboardMetrics(response);
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <div style={{ color: '#576574', fontSize: '12px' }}>Loading {activeDeptProfile.title || 'Fuel Management'} analytics...</div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={{ padding: '20px' }}>
        <div className="badge badge-danger" style={{ padding: '8px 12px', fontSize: '12px' }}>
          Error loading department dashboard: {fetchError}
        </div>
      </div>
    );
  }

  const kpis = dashboardMetrics?.kpis || {};
  const charts = dashboardMetrics?.charts || {};
  const operationalRecords = dashboardMetrics?.records || dashboardMetrics?.items || [];

  const primaryData = charts.primaryTrend || charts.monthlyPayments || charts.monthlySpending || charts.monthlyExp || [];
  const secondaryData = charts.secondaryTrend || charts.servicePayments || charts.serviceSpending || charts.categoryAnalysis || [];
  const locationSpendingData = charts.locationSpending || charts.locationWiseSpending || [];

  const totalPrimaryVal1 = primaryData.reduce((acc, p) => acc + (Number(p.val1 || p.paidAmount || p.amount || 0)), 0);
  const totalPrimaryVal2 = primaryData.reduce((acc, p) => acc + (Number(p.val2 || p.quantity || 0)), 0);
  const activeMonths = primaryData.filter(p => Number(p.totalCost || 0) > 0 || Number(p.val1 || p.amount || 0) > 0 || Number(p.openingBalance || 0) > 0);
  const totalPrimaryOpening = kpis.openingBalance?.value !== undefined ? Number(kpis.openingBalance.value) : (activeMonths.length > 0 ? Number(activeMonths[0]?.openingBalance || 0) : 0);
  const totalPrimaryBalance = kpis.closingBalance?.value !== undefined ? Number(kpis.closingBalance.value) : (activeMonths.length > 0 ? Number(activeMonths[activeMonths.length - 1]?.closingBalance || activeMonths[activeMonths.length - 1]?.balance || 0) : 0);
  const totalPrimaryCost = kpis.totalCost?.value !== undefined ? Number(kpis.totalCost.value) : primaryData.reduce((acc, p) => acc + (Number(p.totalCost || (Number(p.val1 || p.amount || 0) + Number(p.balance || 0)))), 0);

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: activeDeptProfile.title ? 'space-between' : 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        {activeDeptProfile.title && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#0F2A4A' }}>{activeDeptProfile.title}</h1>
            </div>
          </div>
        )}
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => onNavigate({ view: 'workspace', preselectDept: deptId === 'fuel' ? 'FUEL_PURCHASE' : (deptId === 'mms' || deptId === 'stores') ? 'STORES_PURCHASE' : (activeDeptProfile.deptName || deptId) })}
        >
          <Plus size={13} />
          New Record Entry
        </button>
      </div>

      <div className="grid-kpis" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {(() => {
          const KPI_LIGHT_COLORS = [
            { bg: '#FFEDB9', border: '#D99A1E' },
            { bg: '#BAE6FD', border: '#0284C7' },
            { bg: '#BBF7D0', border: '#16A34A' },
            { bg: '#FED7AA', border: '#EA580C' },
            { bg: '#DDD6FE', border: '#7C3AED' },
            { bg: '#A5F3FC', border: '#0891B2' },
            { bg: '#FECDD3', border: '#E11D48' },
            { bg: '#D9F99D', border: '#65A30D' }
          ];
          const seenLabels = new Set();
          let colorIdx = 0;
          return Object.keys(kpis).map((cardKey) => {
            const item = kpis[cardKey];
            if (!item) return null;
            const normLabel = String(item.label || cardKey).trim().toLowerCase();
            if (normLabel.includes('operational submissions') || cardKey === 'totalRecords' || cardKey === 'recordsCount') return null;
            if (seenLabels.has(normLabel)) return null;
            seenLabels.add(normLabel);
            const colorScheme = KPI_LIGHT_COLORS[colorIdx % KPI_LIGHT_COLORS.length];
            colorIdx++;
            return (
              <KPICard
                key={cardKey}
                label={item.label || cardKey}
                value={item.formatted || item.value || '0'}
                subtext={item.subtext}
                alert={item.isAlert}
                bg={colorScheme.bg}
                borderLeftColor={colorScheme.border}
              />
            );
          });
        })()}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
        gap: '16px'
      }}>
        {deptId === 'fuel' ? (
          <>
            <div className="civet-card" style={{ border: '1px solid #000000', padding: '16px 20px', backgroundColor: '#E0F2FE' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h2 className="text-h2">Monthly Fuel Payments Trend</h2>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>Total Paid</span>
                  <strong style={{ fontSize: '12.5px', color: '#1F6FEB', fontWeight: '700' }}>{formatINR(totalPrimaryVal1)}</strong>
                  {totalPrimaryBalance > 0 && (
                    <span style={{ fontSize: '10px', color: '#C8423A', display: 'block', fontWeight: '600' }}>
                      Closing Bal: {formatINR(totalPrimaryBalance)}
                    </span>
                  )}
                </div>
              </div>

              {(!primaryData || primaryData.length === 0) ? (
                <EmptyState message="No operational data available to plot primary trend." />
              ) : (
                <div>
                  <div style={{
                    backgroundColor: '#BAE6FD',
                    border: '1px solid #000000',
                    borderRadius: '6px',
                    padding: '10px 8px 4px 0',
                    marginBottom: '12px'
                  }}>
                    <div style={{ width: '100%', height: '220px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={primaryData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <defs>
                            <filter id="deptBar3d" x="-10%" y="-10%" width="130%" height="130%">
                              <feDropShadow dx="2" dy="3" stdDeviation="2" floodColor="#0F2A4A" floodOpacity="0.20" />
                            </filter>
                            <linearGradient id="deptGradPurple" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#A78BFA" />
                              <stop offset="100%" stopColor="#7C3AED" />
                            </linearGradient>
                            <linearGradient id="deptGradBlue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#38BDF8" />
                              <stop offset="100%" stopColor="#0284C7" />
                            </linearGradient>
                            <linearGradient id="deptGradGreen" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#34D399" />
                              <stop offset="100%" stopColor="#059669" />
                            </linearGradient>
                            <linearGradient id="deptGradRose" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#FB7185" />
                              <stop offset="100%" stopColor="#BE123C" />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#EAEFF5" />
                          <XAxis 
                            dataKey="month" 
                            interval={0} 
                            tickFormatter={(val, idx) => {
                              if (val && typeof val === 'string' && val.length <= 4) return val;
                              const p = primaryData[idx];
                              if (p?.month) return p.month;
                              if (p?.monthNum) {
                                const mNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                return mNames[p.monthNum - 1] || val;
                              }
                              return val;
                            }}
                            tickLine={{ stroke: '#000000' }} 
                            axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} 
                            tick={{ fontSize: 9.5, fill: '#0F2A4A' }} 
                          />
                          <YAxis tickFormatter={formatAxisINR} tickLine={{ stroke: '#000000' }} axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} tick={{ fontSize: 9.5, fill: '#0F2A4A' }} />
                          <Tooltip 
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                const p = payload[0]?.payload || {};
                                const opVal = Number(p.openingBalance || 0);
                                const costVal = Number(p.totalCost || 0);
                                const paidVal = Number(p.val1 || p.paidAmount || p.amount || 0);
                                const balVal = Number(p.closingBalance ?? p.balance ?? 0);
                                const nextOp = Number(p.nextMonthOpening ?? balVal);
                                return (
                                  <div style={{
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid #000000',
                                    borderRadius: '6px',
                                    padding: '10px 14px',
                                    fontSize: '11px',
                                    boxShadow: '0 4px 12px rgba(15, 42, 74, 0.12)'
                                  }}>
                                    <div style={{ fontWeight: '700', color: '#0F2A4A', marginBottom: '8px', borderBottom: '1px solid #E2E8F0', paddingBottom: '4px' }}>
                                      <span>{p.label || (label && String(label).match(/\b20\d\d\b/) ? label : `${label} ${p.year || activeYear}`)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '4px' }}>
                                      <span style={{ color: '#7C3AED', fontWeight: '600' }}>Opening Balance:</span>
                                      <strong>{formatINR(opVal)}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '4px' }}>
                                      <span style={{ color: '#0284C7', fontWeight: '600' }}>Total Amount (Fuel Cost):</span>
                                      <strong>{formatINR(costVal)}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '4px' }}>
                                      <span style={{ color: '#059669', fontWeight: '600' }}>Paid Amount:</span>
                                      <strong>{formatINR(paidVal)}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', borderTop: '1px solid #E2E8F0', paddingTop: '4px', marginTop: '4px' }}>
                                      <span style={{ color: '#BE123C', fontWeight: '700' }}>Closing Balance:</span>
                                      <strong style={{ color: '#BE123C' }}>{formatINR(balVal)}</strong>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="openingBalance" fill="url(#deptGradPurple)" stroke="#5B21B6" strokeWidth={1} filter="url(#deptBar3d)" name="Opening Balance (Rs.)" radius={[2, 2, 0, 0]} />
                          <Bar dataKey="totalCost" fill="url(#deptGradBlue)" stroke="#0369A1" strokeWidth={1} filter="url(#deptBar3d)" name="Total Amount (Fuel Cost) (Rs.)" radius={[2, 2, 0, 0]} />
                          <Bar dataKey="val1" fill="url(#deptGradGreen)" stroke="#047857" strokeWidth={1} filter="url(#deptBar3d)" name="Paid Amount (Rs.)" radius={[2, 2, 0, 0]} />
                          <Bar dataKey="balance" fill="url(#deptGradRose)" stroke="#9F1239" strokeWidth={1} filter="url(#deptBar3d)" name="Closing Balance (Rs.)" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: '#F0F9FF',
                    border: '1px solid #000000',
                    borderRadius: '4px',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                    fontSize: '11px'
                  }}>
                    {totalPrimaryOpening > 0 && (
                      <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '10px' }}>Opening Balance</span>
                        <strong style={{ color: '#6366F1', fontSize: '12px' }}>
                          {formatINR(totalPrimaryOpening)}
                        </strong>
                      </div>
                    )}
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '10px' }}>Total Amount (Fuel Cost)</span>
                      <strong style={{ color: '#0284C7', fontSize: '12px' }}>
                        {formatINR(totalPrimaryCost)}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '10px' }}>Paid Amount</span>
                      <strong style={{ color: '#1F6FEB', fontSize: '12px' }}>
                        {formatINR(totalPrimaryVal1)}
                      </strong>
                    </div>
                    {totalPrimaryBalance > 0 && (
                      <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '10px' }}>Closing Balance</span>
                        <strong style={{ color: '#C8423A', fontSize: '12px' }}>
                          {formatINR(totalPrimaryBalance)}
                        </strong>
                      </div>
                    )}
                    <div style={{
                      backgroundColor: '#EEF2FF',
                      border: '1px solid #C7D2FE',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '10px',
                      color: '#3730A3',
                      fontWeight: '600'
                    }}>
                      Closing Balance carries forward as Next Month Opening Balance
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="civet-card" style={{ border: '1px solid #000000', padding: '16px 20px', backgroundColor: '#DCFCE7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h2 className="text-h2">Monthly Fuel Quantity Intake</h2>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>Total Quantity</span>
                  <strong style={{ fontSize: '12.5px', color: '#10B981', fontWeight: '700' }}>{formatNumber(totalPrimaryVal2, 2)} Ltrs</strong>
                </div>
              </div>

              {(!primaryData || primaryData.length === 0) ? (
                <EmptyState message="No operational data available to plot fuel quantity." />
              ) : (
                <div>
                  <div style={{
                    backgroundColor: '#BBF7D0',
                    border: '1px solid #000000',
                    borderRadius: '6px',
                    padding: '10px 8px 4px 0',
                    marginBottom: '12px'
                  }}>
                    <div style={{ width: '100%', height: '220px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={primaryData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <defs>
                            <filter id="deptLine3d" x="-10%" y="-10%" width="120%" height="130%">
                              <feDropShadow dx="1" dy="3" stdDeviation="2" floodColor="#047857" floodOpacity="0.30" />
                            </filter>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#A7F3D0" />
                          <XAxis 
                            dataKey="month" 
                            interval={0} 
                            tickFormatter={(val, idx) => {
                              if (val && typeof val === 'string' && val.length <= 4) return val;
                              const p = primaryData[idx];
                              if (p?.month) return p.month;
                              if (p?.monthNum) {
                                const mNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                return mNames[p.monthNum - 1] || val;
                              }
                              return val;
                            }}
                            tickLine={{ stroke: '#000000' }} 
                            axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} 
                            tick={{ fontSize: 9.5, fill: '#0F2A4A' }} 
                          />
                          <YAxis tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k L` : `${v} L`} tickLine={{ stroke: '#000000' }} axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} tick={{ fontSize: 9.5, fill: '#059669' }} />
                          <Tooltip 
                            formatter={(val) => [`${formatNumber(val, 2)} Ltrs`, 'Fuel Quantity']}
                            contentStyle={{ fontSize: '11px', borderRadius: '4px' }} 
                          />
                          <Line type="monotone" dataKey="val2" stroke="#059669" strokeWidth={3.5} filter="url(#deptLine3d)" dot={{ fill: '#FFFFFF', stroke: '#059669', strokeWidth: 2.5, r: 4.5 }} activeDot={{ r: 6.5, fill: '#059669', stroke: '#FFFFFF', strokeWidth: 2.5 }} name="Quantity (Ltrs)" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #000000',
                    borderRadius: '4px',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '11px'
                  }}>
                    <div>
                      <span style={{ color: '#64748B', display: 'block' }}>Total Fuel Volume</span>
                      <strong style={{ color: '#10B981', fontSize: '12.5px' }}>
                        {formatNumber(totalPrimaryVal2, 2)} Ltrs
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', display: 'block' }}>Average Fuel Rate</span>
                      <strong style={{ color: '#0F2A4A', fontSize: '12px' }}>
                        {totalPrimaryVal2 > 0 ? `Rs. ${(totalPrimaryCost / totalPrimaryVal2).toFixed(2)} / Ltr` : 'Rs. 0.00 / Ltr'}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="civet-card" style={{ border: '1px solid #000000', padding: '16px 20px', backgroundColor: '#FEF3C7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h2 className="text-h2">Expenses by Fuel Type</h2>
                </div>
              </div>

              {(!secondaryData || secondaryData.length === 0) ? (
                <EmptyState message="No categorical distribution available for this period." />
              ) : (
                <div>
                  <div style={{
                    backgroundColor: '#FEF08A',
                    border: '1px solid #000000',
                    borderRadius: '6px',
                    padding: '10px 12px 4px 8px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ width: '100%', height: '200px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={secondaryData} layout="vertical" margin={{ top: 10, right: 10, left: 30, bottom: 0 }}>
                          <defs>
                            <filter id="deptSecBar3d" x="-10%" y="-10%" width="130%" height="130%">
                              <feDropShadow dx="2" dy="3" stdDeviation="2" floodColor="#0F2A4A" floodOpacity="0.20" />
                            </filter>
                            <linearGradient id="deptGradGreenH" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#34D399" />
                              <stop offset="100%" stopColor="#059669" />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" />
                          <XAxis type="number" tickFormatter={formatAxisINR} tickLine={{ stroke: '#000000' }} axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} tick={{ fontSize: 9.5, fill: '#0F2A4A' }} />
                          <YAxis dataKey="name" type="category" tickLine={{ stroke: '#000000' }} axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} tick={{ fontSize: 9.5, fill: '#0F2A4A' }} width={90} />
                          <Tooltip 
                            formatter={(val) => [formatINR(val), 'Amount']} 
                            contentStyle={{ fontSize: '11px', borderRadius: '4px' }}
                          />
                          <Bar dataKey="value" fill="url(#deptGradGreenH)" stroke="#047857" strokeWidth={1} filter="url(#deptSecBar3d)" radius={[0, 3, 3, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: '#FFFBEB',
                    border: '1px solid #000000',
                    borderRadius: '4px',
                    padding: '10px 12px'
                  }}>
                    <span style={{ fontSize: '10.5px', fontWeight: '700', color: '#0F2A4A', display: 'block', marginBottom: '4px' }}>
                      Top Breakdown Share:
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {secondaryData.slice(0, 3).map((item, idx) => (
                        <div key={item.name || idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px' }}>
                          <span style={{ color: '#1C2733' }}>{item.name}</span>
                          <strong style={{ color: '#2E9E6B' }}>{formatINR(item.value || 0)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {locationSpendingData.length > 0 && (
              <div className="civet-card" style={{ gridColumn: '1 / -1', border: '1px solid #000000', padding: '16px 20px', backgroundColor: '#F3E8FF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <h2 className="text-h2">Project Division Fuel Payments & All Project Divisions Ledger Breakdown</h2>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '11px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '10px', height: '10px', backgroundColor: '#6366F1', borderRadius: '2px', display: 'inline-block' }} />
                      <span style={{ color: '#64748B' }}>Opening Bal</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '10px', height: '10px', backgroundColor: '#0284C7', borderRadius: '2px', display: 'inline-block' }} />
                      <span style={{ color: '#64748B' }}>Total Cost</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '10px', height: '10px', backgroundColor: '#1F6FEB', borderRadius: '2px', display: 'inline-block' }} />
                      <span style={{ color: '#64748B' }}>Paid Amount</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '10px', height: '10px', backgroundColor: '#C8423A', borderRadius: '2px', display: 'inline-block' }} />
                      <span style={{ color: '#64748B' }}>Closing Bal</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{
                    backgroundColor: '#DDD6FE',
                    border: '1px solid #000000',
                    borderRadius: '6px',
                    padding: '12px 14px 10px 8px',
                    marginBottom: '16px',
                    overflowX: 'auto'
                  }}>
                    <div style={{ width: '100%', minWidth: '780px', height: `${Math.max(640, locationSpendingData.length * 40)}px` }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={locationSpendingData} layout="vertical" barCategoryGap="20%" barGap={2} margin={{ top: 10, right: 30, left: 10, bottom: 15 }}>
                          <defs>
                            <filter id="deptLocBar3d" x="-10%" y="-10%" width="130%" height="130%">
                              <feDropShadow dx="2" dy="3" stdDeviation="2" floodColor="#0F2A4A" floodOpacity="0.20" />
                            </filter>
                            <linearGradient id="deptLocGradPurple" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#A78BFA" />
                              <stop offset="100%" stopColor="#7C3AED" />
                            </linearGradient>
                            <linearGradient id="deptLocGradBlue" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#38BDF8" />
                              <stop offset="100%" stopColor="#0284C7" />
                            </linearGradient>
                            <linearGradient id="deptLocGradGreen" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#34D399" />
                              <stop offset="100%" stopColor="#059669" />
                            </linearGradient>
                            <linearGradient id="deptLocGradRose" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#FB7185" />
                              <stop offset="100%" stopColor="#BE123C" />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#EAEFF5" />
                          <XAxis type="number" domain={[0, 'auto']} tickFormatter={formatAxisINR} tickLine={{ stroke: '#000000' }} axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} tick={{ fontSize: 9.5, fill: '#0F2A4A' }} />
                          <YAxis dataKey="location" type="category" interval={0} tickLine={{ stroke: '#000000' }} axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} tick={{ fontSize: 10, fill: '#0F2A4A' }} width={150} />
                          <Tooltip 
                            cursor={{ fill: 'rgba(31, 111, 235, 0.04)' }}
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                const d = payload[0]?.payload || {};
                                return (
                                  <div style={{
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid #000000',
                                    borderRadius: '6px',
                                    padding: '10px 14px',
                                    fontSize: '11px',
                                    boxShadow: '0 4px 14px rgba(15, 42, 74, 0.15)',
                                    minWidth: '220px'
                                  }}>
                                    <div style={{ fontWeight: '700', color: '#0F2A4A', fontSize: '12px', marginBottom: '8px', borderBottom: '1px solid #E2E8F0', paddingBottom: '4px' }}>
                                      {label || d.location}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                                          <span style={{ width: '9px', height: '9px', backgroundColor: '#7C3AED', border: '1px solid #5B21B6', borderRadius: '2px', display: 'inline-block' }} />
                                          Opening Balance:
                                        </span>
                                        <strong style={{ color: '#7C3AED' }}>{formatINR(d.openingBalance || 0)}</strong>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                                          <span style={{ width: '9px', height: '9px', backgroundColor: '#0284C7', border: '1px solid #0369A1', borderRadius: '2px', display: 'inline-block' }} />
                                          Total Cost:
                                        </span>
                                        <strong style={{ color: '#0F2A4A' }}>{formatINR(d.totalCost || 0)}</strong>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                                          <span style={{ width: '9px', height: '9px', backgroundColor: '#059669', border: '1px solid #047857', borderRadius: '2px', display: 'inline-block' }} />
                                          Paid Amount:
                                        </span>
                                        <strong style={{ color: '#059669' }}>{formatINR(d.paidAmount || d.amount || 0)}</strong>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E2E8F0', paddingTop: '4px', marginTop: '2px' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#BE123C', fontWeight: '700' }}>
                                          <span style={{ width: '9px', height: '9px', backgroundColor: '#BE123C', border: '1px solid #9F1239', borderRadius: '2px', display: 'inline-block' }} />
                                          Closing Balance:
                                        </span>
                                        <strong style={{ color: '#BE123C' }}>{formatINR(d.closingBalance || 0)}</strong>
                                      </div>
                                      {d.quantity > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px', fontSize: '10.5px', color: '#059669' }}>
                                          <span>Total Quantity:</span>
                                          <strong>{formatNumber(d.quantity, 2)} Ltrs</strong>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="openingBalance" fill="url(#deptLocGradPurple)" stroke="#5B21B6" strokeWidth={1} filter="url(#deptLocBar3d)" name="Opening Balance" barSize={7} radius={[0, 2, 2, 0]} />
                          <Bar dataKey="totalCost" fill="url(#deptLocGradBlue)" stroke="#0369A1" strokeWidth={1} filter="url(#deptLocBar3d)" name="Total Cost" barSize={7} radius={[0, 2, 2, 0]} />
                          <Bar dataKey="paidAmount" fill="url(#deptLocGradGreen)" stroke="#047857" strokeWidth={1} filter="url(#deptLocBar3d)" name="Paid Amount" barSize={7} radius={[0, 2, 2, 0]} />
                          <Bar dataKey="closingBalance" fill="url(#deptLocGradRose)" stroke="#9F1239" strokeWidth={1} filter="url(#deptLocBar3d)" name="Closing Balance" barSize={7} radius={[0, 2, 2, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #000000',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    marginBottom: '12px'
                  }}>
                    <div style={{
                      backgroundColor: '#F8FAFD',
                      borderBottom: '1px solid #000000',
                      padding: '8px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <strong style={{ fontSize: '12px', color: '#0F2A4A' }}>
                        All Project Divisions Summary Table ({locationSpendingData.length} Project Divisions)
                      </strong>
                    </div>

                    <div style={{ overflowX: 'auto', maxHeight: '420px' }}>
                      <table className="civet-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#0F2A4A', color: '#FFFFFF' }}>
                            <th style={{ padding: '7px 10px', textAlign: 'center', width: '40px', border: '1px solid #000000' }}>#</th>
                            <th style={{ padding: '7px 10px', textAlign: 'left', border: '1px solid #000000' }}>Project Division</th>
                            <th style={{ padding: '7px 10px', textAlign: 'right', border: '1px solid #000000', backgroundColor: '#B45309' }}>Opening Balance</th>
                            <th style={{ padding: '7px 10px', textAlign: 'right', border: '1px solid #000000', backgroundColor: '#0369A1' }}>Total Cost (Without Op/Cl)</th>
                            <th style={{ padding: '7px 10px', textAlign: 'right', border: '1px solid #000000', backgroundColor: '#047857' }}>Paid Amount</th>
                            <th style={{ padding: '7px 10px', textAlign: 'right', border: '1px solid #000000', backgroundColor: '#B91C1C' }}>Closing Balance</th>
                            <th style={{ padding: '7px 10px', textAlign: 'right', border: '1px solid #000000', backgroundColor: '#6D28D9' }}>Quantity (Ltrs)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {locationSpendingData.map((loc, idx) => {
                            const op = Number(loc.openingBalance || 0);
                            const cost = Number(loc.totalCost || 0);
                            const paid = Number(loc.paidAmount || loc.amount || 0);
                            const cl = Number(loc.closingBalance || 0);
                            const qty = Number(loc.quantity || 0);
                            const isEven = idx % 2 === 0;
                            return (
                              <tr key={loc.location || idx} style={{ borderBottom: '1px solid #000000' }}>
                                <td style={{ padding: '6px 10px', textAlign: 'center', color: '#64748B', border: '1px solid #000000', backgroundColor: isEven ? '#FFFFFF' : '#F8FAFD' }}>{idx + 1}</td>
                                <td style={{ padding: '6px 10px', fontWeight: '600', color: '#0F2A4A', border: '1px solid #000000', backgroundColor: isEven ? '#FFFFFF' : '#F8FAFD' }}>{loc.location}</td>
                                <td style={{ padding: '6px 10px', textAlign: 'right', color: '#92400E', fontWeight: '600', border: '1px solid #000000', backgroundColor: isEven ? '#FEF9C3' : '#FEF08A' }}>{formatINR(op)}</td>
                                <td style={{ padding: '6px 10px', textAlign: 'right', color: '#0369A1', fontWeight: '600', border: '1px solid #000000', backgroundColor: isEven ? '#E0F2FE' : '#BAE6FD' }}>{formatINR(cost)}</td>
                                <td style={{ padding: '6px 10px', textAlign: 'right', color: '#047857', fontWeight: '700', border: '1px solid #000000', backgroundColor: isEven ? '#DCFCE7' : '#BBF7D0' }}>{formatINR(paid)}</td>
                                <td style={{ padding: '6px 10px', textAlign: 'right', color: '#B91C1C', fontWeight: '700', border: '1px solid #000000', backgroundColor: isEven ? '#FEE2E2' : '#FECDD3' }}>{formatINR(cl)}</td>
                                <td style={{ padding: '6px 10px', textAlign: 'right', color: '#6D28D9', fontWeight: '600', border: '1px solid #000000', backgroundColor: isEven ? '#F3E8FF' : '#DDD6FE' }}>{formatNumber(qty, 2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          {(() => {
                            const totOp = locationSpendingData.reduce((s, l) => s + Number(l.openingBalance || 0), 0);
                            const totCost = locationSpendingData.reduce((s, l) => s + Number(l.totalCost || 0), 0);
                            const totPaid = locationSpendingData.reduce((s, l) => s + Number(l.paidAmount || l.amount || 0), 0);
                            const totCl = locationSpendingData.reduce((s, l) => s + Number(l.closingBalance || 0), 0);
                            const totQty = locationSpendingData.reduce((s, l) => s + Number(l.quantity || 0), 0);
                            return (
                              <tr style={{ fontWeight: '700', borderTop: '2px solid #000000' }}>
                                <td colSpan={2} style={{ padding: '8px 10px', textAlign: 'left', color: '#FFFFFF', backgroundColor: '#0F2A4A', border: '1px solid #000000' }}>
                                  Total ({locationSpendingData.length} Project Divisions)
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#78350F', backgroundColor: '#FDE047', border: '1px solid #000000' }}>{formatINR(totOp)}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#0369A1', backgroundColor: '#7DD3FC', border: '1px solid #000000' }}>{formatINR(totCost)}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#047857', backgroundColor: '#86EFAC', border: '1px solid #000000' }}>{formatINR(totPaid)}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#9F1239', backgroundColor: '#FDA4AF', border: '1px solid #000000' }}>{formatINR(totCl)}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#5B21B6', backgroundColor: '#C4B5FD', border: '1px solid #000000' }}>{formatNumber(totQty, 2)}</td>
                              </tr>
                            );
                          })()}
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="civet-card" style={{ border: '1px solid #000000', padding: '16px 20px', backgroundColor: '#E0F2FE' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h2 className="text-h2">
                    {deptId === 'pm' ? 'Equipment Utilization & Operating Hours Trend' :
                     (deptId === 'mms' || deptId === 'stores') ? 'Materials Intake Trend (Spending vs Volume)' :
                     `${activeDeptProfile.title} Trend`}
                  </h2>
                </div>
              </div>

              {(!primaryData || primaryData.length === 0) ? (
                <EmptyState message="No operational data available to plot primary trend." />
              ) : (
                <div>
                  <div style={{
                    backgroundColor: '#BAE6FD',
                    border: '1px solid #000000',
                    borderRadius: '6px',
                    padding: '10px 8px 4px 0',
                    marginBottom: '12px'
                  }}>
                    <div style={{ width: '100%', height: '220px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={primaryData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <defs>
                            <filter id="deptOtherBar3d" x="-10%" y="-10%" width="130%" height="130%">
                              <feDropShadow dx="2" dy="3" stdDeviation="2" floodColor="#0F2A4A" floodOpacity="0.20" />
                            </filter>
                            <linearGradient id="deptOtherGradBlue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#38BDF8" />
                              <stop offset="100%" stopColor="#0284C7" />
                            </linearGradient>
                            <linearGradient id="deptOtherGradOrange" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#FB923C" />
                              <stop offset="100%" stopColor="#EA580C" />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" strokeOpacity={0.4} />
                          <XAxis 
                            dataKey="month" 
                            interval={0} 
                            tickFormatter={(val, idx) => {
                              if (val && typeof val === 'string' && val.length <= 4) return val;
                              const p = primaryData[idx];
                              if (p?.month) return p.month;
                              if (p?.monthNum) {
                                const mNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                return mNames[p.monthNum - 1] || val;
                              }
                              return val;
                            }}
                            tickLine={{ stroke: '#000000' }} 
                            axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} 
                            tick={{ fontSize: 9.5, fill: '#0F2A4A' }} 
                          />
                          <YAxis tickFormatter={formatAxisINR} tickLine={{ stroke: '#000000' }} axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} tick={{ fontSize: 9.5, fill: '#0F2A4A' }} />
                          <Tooltip 
                            formatter={(val) => [`Rs. ${Number(val).toLocaleString('en-IN')}`, 'Value']}
                            contentStyle={{ fontSize: '11px', borderRadius: '4px' }} 
                          />
                          <Bar dataKey="val1" fill="url(#deptOtherGradBlue)" stroke="#0369A1" strokeWidth={1} filter="url(#deptOtherBar3d)" name="Primary" radius={[2, 2, 0, 0]} />
                          {primaryData.some(p => p.val2 !== undefined) && (
                            <Bar dataKey="val2" fill="url(#deptOtherGradOrange)" stroke="#C2410C" strokeWidth={1} filter="url(#deptOtherBar3d)" name="Secondary" radius={[2, 2, 0, 0]} />
                          )}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: '#F0F9FF',
                    border: '1px solid #000000',
                    borderRadius: '4px',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '11px',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    <div>
                      <span style={{ color: '#64748B', display: 'block' }}>Primary Total</span>
                      <strong style={{ color: '#0F2A4A', fontSize: '12.5px' }}>
                        {formatINR(totalPrimaryVal1)}
                      </strong>
                    </div>
                    {totalPrimaryVal2 > 0 && (
                      <div>
                        <span style={{ color: '#64748B', display: 'block' }}>Secondary Total</span>
                        <strong style={{ color: '#10B981', fontSize: '12.5px' }}>
                          {Number(totalPrimaryVal2).toLocaleString('en-IN')} Units
                        </strong>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="civet-card" style={{ border: '1px solid #000000', padding: '16px 20px', backgroundColor: '#DCFCE7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h2 className="text-h2">
                    {deptId === 'pm' ? 'Equipment Breakdown by Asset Type' : 
                     (deptId === 'mms' || deptId === 'stores') ? 'Expenses by Material Category' :
                     `${activeDeptProfile.title} Distribution`}
                  </h2>
                </div>
              </div>

              {(!secondaryData || secondaryData.length === 0) ? (
                <EmptyState message="No categorical distribution available for this period." />
              ) : (
                <div>
                  <div style={{
                    backgroundColor: '#BBF7D0',
                    border: '1px solid #000000',
                    borderRadius: '6px',
                    padding: '10px 12px 4px 8px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ width: '100%', height: '200px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={secondaryData} layout="vertical" margin={{ top: 10, right: 10, left: 30, bottom: 0 }}>
                          <defs>
                            <filter id="deptOtherSec3d" x="-10%" y="-10%" width="130%" height="130%">
                              <feDropShadow dx="2" dy="3" stdDeviation="2" floodColor="#0F2A4A" floodOpacity="0.20" />
                            </filter>
                            <linearGradient id="deptOtherGradGreenH" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#34D399" />
                              <stop offset="100%" stopColor="#059669" />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#A7F3D0" />
                          <XAxis type="number" tickFormatter={formatAxisINR} tickLine={{ stroke: '#000000' }} axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} tick={{ fontSize: 9.5, fill: '#0F2A4A' }} />
                          <YAxis dataKey="name" type="category" tickLine={{ stroke: '#000000' }} axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} tick={{ fontSize: 9.5, fill: '#0F2A4A' }} width={90} />
                          <Tooltip 
                            formatter={(val) => [formatINR(val), 'Amount']} 
                            contentStyle={{ fontSize: '11px', borderRadius: '4px' }}
                          />
                          <Bar dataKey="value" fill="url(#deptOtherGradGreenH)" stroke="#047857" strokeWidth={1} filter="url(#deptOtherSec3d)" radius={[0, 3, 3, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #000000',
                    borderRadius: '4px',
                    padding: '10px 12px'
                  }}>
                    <span style={{ fontSize: '10.5px', fontWeight: '700', color: '#0F2A4A', display: 'block', marginBottom: '4px' }}>
                      Top Breakdown Share:
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {secondaryData.slice(0, 3).map((item, idx) => (
                        <div key={item.name || idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px' }}>
                          <span style={{ color: '#1C2733' }}>{item.name}</span>
                          <strong style={{ color: '#2E9E6B' }}>{formatINR(item.value || 0)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
