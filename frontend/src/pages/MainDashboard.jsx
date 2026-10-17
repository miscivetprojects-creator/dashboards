import React, { useEffect, useState } from 'react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { TrendingUp, Layers, Building2, MapPin, Eye, Calendar, DollarSign, CheckCircle2, ShieldCheck, Users } from 'lucide-react';
import KPICard from '../components/KPICard';
import EmptyState from '../components/EmptyState';
import TablePagination from '../components/TablePagination';
import RecordPreviewModal from '../components/RecordPreviewModal';
import { api } from '../services/api';
import { formatINR, formatNumber } from '../utils/formatUtils';

const PALETTE = ['#0284C7', '#059669', '#EA580C', '#7C3AED', '#EAB308', '#BE123C'];
const PALETTE_STROKES = ['#0369A1', '#047857', '#C2410C', '#5B21B6', '#A16207', '#9F1239'];

function formatAxisINR(val) {
  if (val === 0) return '0';
  if (val >= 10000000) {
    const cr = val / 10000000;
    return Number.isInteger(cr) ? `${cr} Cr` : `${cr.toFixed(1)} Cr`;
  }
  if (val >= 100000) {
    const l = val / 100000;
    return Number.isInteger(l) ? `${l} L` : `${l.toFixed(1)} L`;
  }
  if (val >= 1000) return `${Math.round(val / 1000)}k`;
  return val;
}

export default function MainDashboard({ filters, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [overallKpis, setOverallKpis] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [trendView, setTrendView] = useState('divisions');
  const [selectedEntity, setSelectedEntity] = useState('All');

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRecord, setPreviewRecord] = useState(null);
  const [previewList, setPreviewList] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  useEffect(() => {
    fetchDashboardAnalytics();
  }, [filters, selectedDepartment]);

  async function fetchDashboardAnalytics() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const activeFilters = {
        ...filters,
        department: selectedDepartment ? selectedDepartment : (filters?.department || 'All')
      };
      const response = await api.getMainDashboard(activeFilters);
      setDashboardData(response);
      if (!selectedDepartment) {
        setOverallKpis(response.kpis);
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenPreview = (record, list, index) => {
    setPreviewRecord(record);
    setPreviewList(list);
    setPreviewIndex(index);
    setPreviewOpen(true);
  };

  const handleNavigatePreview = (newIdx) => {
    if (newIdx >= 0 && newIdx < previewList.length) {
      setPreviewIndex(newIdx);
      setPreviewRecord(previewList[newIdx]);
    }
  };

  if (loading && !dashboardData) {
    return (
      <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <div style={{ color: '#576574', fontSize: '12px' }}>Loading management analytics...</div>
      </div>
    );
  }

  if (errorMessage && !dashboardData) {
    return (
      <div style={{ padding: '20px' }}>
        <div className="badge badge-danger" style={{ padding: '8px 12px', fontSize: '12px' }}>
          Error loading dashboard data: {errorMessage}
        </div>
      </div>
    );
  }

  const kpis = dashboardData?.kpis || {};
  const charts = dashboardData?.charts || {};
  const topDivisions = charts.topDivisions || [];
  const spendingTrend = charts.spendingTrend || [];
  const activeLocSpending = (charts.locationWiseSpending || []).filter(l => (l.amount || 0) > 0);
  const activeProjSpending = (charts.projectNameWiseSpending || []).filter(p => (p.amount || 0) > 0);
  const activeServiceSpending = (charts.serviceSpending || []).filter(s => (s.amount || 0) > 0);

  const chartMonthlyData = spendingTrend.map(s => {
    let plotVal = s.totalPaid || s.amount || 0;
    if (selectedEntity !== 'All') {
      if (s.divisions && s.divisions[selectedEntity] !== undefined) {
        plotVal = s.divisions[selectedEntity];
      } else if (s.projects && s.projects[selectedEntity] !== undefined) {
        plotVal = s.projects[selectedEntity];
      } else if (s[selectedEntity] !== undefined) {
        plotVal = s[selectedEntity];
      } else {
        plotVal = 0;
      }
    }
    return {
      ...s,
      plotAmount: Number(plotVal) || 0
    };
  });

  const complianceExpenses = charts.complianceExpenses || [
    { category: 'Insurance', name: 'Insurance', amount: 0, amountFormatted: 'Rs. 0.00' },
    { category: 'Maintenance', name: 'Maintenance', amount: 0, amountFormatted: 'Rs. 0.00' },
    { category: 'Tax', name: 'Tax', amount: 0, amountFormatted: 'Rs. 0.00' },
    { category: 'Permit', name: 'Permit', amount: 0, amountFormatted: 'Rs. 0.00' }
  ];

  const manpowerCosts = charts.manpowerCosts || [
    { category: 'Drivers', name: 'Drivers', amount: 0, amountFormatted: 'Rs. 0.00' },
    { category: 'Operators', name: 'Operators', amount: 0, amountFormatted: 'Rs. 0.00' }
  ];

  const totalComplianceAmount = complianceExpenses.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const totalManpowerAmount = manpowerCosts.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

  let peakSpendingMonth = spendingTrend[0];
  spendingTrend.forEach(m => {
    if ((m.amount || 0) > (peakSpendingMonth?.amount || 0)) {
      peakSpendingMonth = m;
    }
  });

  const displayTotalPaid = Number(overallKpis?.totalPaid?.value ?? kpis.totalPaid?.value ?? kpis.totalPayments?.value ?? 0);
  const displayPM = Number(overallKpis?.plantAndMachinery?.value ?? kpis.plantAndMachinery?.value ?? 0);
  const displayIT = Number(overallKpis?.itAndMis?.value ?? kpis.itAndMis?.value ?? 0);
  const displayAdmin = Number(overallKpis?.admin?.value ?? kpis.admin?.value ?? 0);

  const totalFilteredPaid = Number(kpis.totalPayments?.value || kpis.totalPaid?.value || 0);
  const totalMonthsWithData = spendingTrend.filter(m => (m.amount || 0) > 0).length || 1;
  const avgMonthlySpending = totalFilteredPaid > 0 ? Math.round(totalFilteredPaid / totalMonthsWithData) : 0;

  const maxLocAmt = Math.max(...activeLocSpending.map(l => l.amount || 1), 1);
  const maxSrvAmt = Math.max(...activeServiceSpending.map(s => s.amount || 1), 1);

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
    if (dashboardData?.year) return String(dashboardData.year);
    return '2025';
  })();

  const isTrendMultiYear = spendingTrend.some(s => s.year && s.year !== spendingTrend[0]?.year);
  const isPlantOrAll = !selectedDepartment || selectedDepartment === 'Plant & Machinery';

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="grid-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div 
          onClick={() => setSelectedDepartment(null)}
          style={{ 
            cursor: 'pointer',
            borderRadius: '6px'
          }}
          title="Click to view overall data across all departments"
        >
          <KPICard 
            label="Total Paid Amount" 
            value={formatINR(displayTotalPaid)} 
            bg="#FFEDB9"
            borderLeftColor="#D99A1E"
          />
        </div>

        <div 
          onClick={() => setSelectedDepartment('Plant & Machinery')}
          style={{ 
            cursor: 'pointer',
            borderRadius: '6px'
          }}
          title="Click to drill down into Plant & Machinery"
        >
          <KPICard 
            label="Plant & Machinery" 
            value={formatINR(displayPM)} 
            bg="#BAE6FD"
            borderLeftColor="#0284C7"
          />
        </div>

        <div 
          onClick={() => setSelectedDepartment('IT & MIS')}
          style={{ 
            cursor: 'pointer',
            borderRadius: '6px'
          }}
          title="Click to drill down into IT & MIS"
        >
          <KPICard 
            label="IT & MIS" 
            value={formatINR(displayIT)} 
            bg="#DDD6FE"
            borderLeftColor="#7C3AED"
          />
        </div>

        <div 
          onClick={() => setSelectedDepartment('Admin')}
          style={{ 
            cursor: 'pointer',
            borderRadius: '6px'
          }}
          title="Click to drill down into Admin"
        >
          <KPICard 
            label="Admin" 
            value={formatINR(displayAdmin)} 
            bg="#BBF7D0"
            borderLeftColor="#16A34A"
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="civet-card" style={{ border: '1px solid #000000', padding: '16px 20px', backgroundColor: '#E0F2FE' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#0F2A4A', margin: 0 }}>
                  Project Division Spending Trend
                </h2>
                {selectedDepartment && (
                  <span style={{ fontSize: '11px', color: '#0284C7', fontWeight: '600' }}>
                    Showing: {selectedDepartment}
                  </span>
                )}
              </div>
              <div style={{ display: 'inline-flex', borderRadius: '4px', border: '1px solid #000000', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
                <button
                  type="button"
                  onClick={() => setTrendView('divisions')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: trendView === 'divisions' ? '700' : '500',
                    backgroundColor: trendView === 'divisions' ? '#0F2A4A' : '#FFFFFF',
                    color: trendView === 'divisions' ? '#FFFFFF' : '#0F2A4A',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Project Divisions ({activeLocSpending.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTrendView('monthly')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: trendView === 'monthly' ? '700' : '500',
                    backgroundColor: trendView === 'monthly' ? '#0F2A4A' : '#FFFFFF',
                    color: trendView === 'monthly' ? '#FFFFFF' : '#0F2A4A',
                    border: 'none',
                    borderLeft: '1px solid #000000',
                    cursor: 'pointer'
                  }}
                >
                  Monthly Trend
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', flexWrap: 'wrap' }}>
              {trendView === 'monthly' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#576574', fontWeight: '600' }}>Filter:</span>
                  <select
                    value={selectedEntity}
                    onChange={e => setSelectedEntity(e.target.value)}
                    style={{
                      height: '26px',
                      fontSize: '11px',
                      fontWeight: '600',
                      color: '#0F2A4A',
                      border: '1px solid #000000',
                      borderRadius: '4px',
                      padding: '0 6px',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="All">All Divisions (Total Paid)</option>
                    <optgroup label="Project Divisions">
                      {activeLocSpending.map(d => (
                        <option key={d.location || d.name} value={d.location || d.name}>
                          {d.location || d.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#64748B' }}>Total Paid:</span>
                <strong style={{ color: '#0F2A4A', fontWeight: '700' }}>{formatINR(totalFilteredPaid)}</strong>
              </div>
            </div>
          </div>

          {(!spendingTrend || spendingTrend.length === 0) ? (
            <EmptyState message="No payment transactions recorded for spending trend." />
          ) : (
            <div>
              <div style={{
                backgroundColor: '#BAE6FD',
                border: '1px solid #000000',
                borderRadius: '6px',
                padding: '14px 12px 10px 10px',
                overflowX: 'auto',
                overflowY: 'hidden',
                scrollbarWidth: 'thin'
              }}>
                <div style={{
                  minWidth: trendView === 'divisions'
                    ? Math.max(1000, activeLocSpending.length * 52) + 'px'
                    : (isTrendMultiYear ? Math.max(900, spendingTrend.length * 75) + 'px' : '100%'),
                  height: '340px'
                }}>
                  <ResponsiveContainer width="100%" height="100%">
                    {trendView === 'divisions' ? (
                      <BarChart data={activeLocSpending} margin={{ top: 14, right: 14, left: 10, bottom: 65 }}>
                        <defs>
                          <filter id="divBar3d" x="-10%" y="-10%" width="130%" height="130%">
                            <feDropShadow dx="2" dy="3" stdDeviation="2" floodColor="#0F2A4A" floodOpacity="0.20" />
                          </filter>
                          <linearGradient id="divBlueGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#38BDF8" />
                            <stop offset="100%" stopColor="#0284C7" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" strokeOpacity={0.6} />
                        <XAxis 
                          dataKey="location" 
                          interval={0} 
                          angle={-45} 
                          textAnchor="end" 
                          height={70} 
                          tickLine={{ stroke: '#000000' }} 
                          axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} 
                          tick={{ fontSize: 9.5, fill: '#0F2A4A', fontWeight: '600' }} 
                        />
                        <YAxis 
                          domain={[0, 500000000]}
                          ticks={[0, 50000000, 100000000, 150000000, 200000000, 250000000, 300000000, 350000000, 400000000, 450000000, 500000000]}
                          tickFormatter={formatAxisINR} 
                          tickLine={{ stroke: '#000000' }} 
                          axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} 
                          tick={{ fontSize: 10, fill: '#0F2A4A' }} 
                        />
                        <Tooltip 
                          formatter={(val) => [formatINR(val), 'Total Paid']}
                          labelFormatter={(label) => `Project Division: ${label}`}
                        />
                        <Bar dataKey="amount" fill="url(#divBlueGrad)" stroke="#0369A1" strokeWidth={1} filter="url(#divBar3d)" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    ) : (
                      <LineChart data={chartMonthlyData} margin={{ top: 14, right: 20, left: 0, bottom: isTrendMultiYear ? 24 : 10 }}>
                        <defs>
                          <filter id="mainLine3d" x="-10%" y="-10%" width="130%" height="130%">
                            <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodColor="#0F2A4A" floodOpacity="0.25" />
                          </filter>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" strokeOpacity={0.4} />
                        <XAxis 
                          dataKey={isTrendMultiYear ? 'shortPeriodLabel' : 'month'} 
                          interval={0} 
                          tickLine={{ stroke: '#000000' }} 
                          axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} 
                          angle={isTrendMultiYear ? -35 : 0}
                          textAnchor={isTrendMultiYear ? 'end' : 'middle'}
                          height={isTrendMultiYear ? 44 : 26}
                          tick={{ fontSize: isTrendMultiYear ? 9.5 : 10, fill: '#0F2A4A' }} 
                        />
                        <YAxis 
                          tickFormatter={formatAxisINR} 
                          tickLine={{ stroke: '#000000' }} 
                          axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} 
                          tick={{ fontSize: 10, fill: '#0F2A4A' }} 
                        />
                        <Tooltip 
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const pData = payload[0]?.payload || {};
                              const amt = Number(pData.plotAmount ?? pData.totalPaid ?? pData.amount ?? 0);
                              return (
                                <div style={{
                                  backgroundColor: '#FFFFFF',
                                  border: '1px solid #000000',
                                  borderRadius: '6px',
                                  boxShadow: '0 4px 14px rgba(15, 42, 74, 0.15)',
                                  padding: '10px 14px',
                                  minWidth: '200px'
                                }}>
                                  <div style={{
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    color: '#0F2A4A',
                                    marginBottom: '6px',
                                    borderBottom: '1px solid #F1F5F9',
                                    paddingBottom: '4px'
                                  }}>
                                    {pData.periodLabel || `${label} ${pData.year || activeYear}`}
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                                    <span style={{ color: '#576574', fontWeight: '600' }}>
                                      {selectedEntity === 'All' ? 'Total Paid:' : `${selectedEntity}:`}
                                    </span>
                                    <strong style={{ color: '#0F2A4A', fontWeight: '800' }}>{formatINR(amt)}</strong>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="plotAmount" 
                          name={selectedEntity === 'All' ? 'Total Paid' : selectedEntity} 
                          stroke="#0F2A4A" 
                          strokeWidth={3} 
                          dot={{ r: 4, fill: '#0F2A4A' }} 
                          activeDot={{ r: 6 }} 
                          filter="url(#mainLine3d)"
                        />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{
                backgroundColor: '#F0F9FF',
                border: '1px solid #000000',
                borderRadius: '6px',
                padding: '12px 16px',
                marginTop: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #000000', paddingBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                  <h3 style={{ fontSize: '12.5px', fontWeight: '700', color: '#0F2A4A', margin: 0 }}>
                    Payment Summary
                  </h3>
                  <span style={{ fontSize: '11px', color: '#576574' }}>
                    Annual Financial & Seasonal Performance Highlights
                  </span>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '10px'
                }}>
                  <div style={{ backgroundColor: '#E0F2FE', border: '1px solid #000000', borderRadius: '4px', padding: '8px 10px' }}>
                    <span style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>Peak Month</span>
                    <strong style={{ fontSize: '13px', color: '#0F2A4A' }}>{peakSpendingMonth?.month || 'Jan'}</strong>
                    <div style={{ fontSize: '10.5px', color: '#1F6FEB', fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>
                      {formatINR(peakSpendingMonth?.amount || 0)}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#DCFCE7', border: '1px solid #000000', borderRadius: '4px', padding: '8px 10px' }}>
                    <span style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>Monthly Average</span>
                    <strong style={{ fontSize: '13px', color: '#2E9E6B', fontVariantNumeric: 'tabular-nums' }}>
                      {formatINR(avgMonthlySpending)}
                    </strong>
                    <div style={{ fontSize: '10px', color: '#64748B' }}>Active Months: {totalMonthsWithData}</div>
                  </div>
                  <div style={{ backgroundColor: '#FAF5FF', border: '1px solid #000000', borderRadius: '4px', padding: '8px 10px' }}>
                    <span style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>Q1 (Jan - Mar)</span>
                    <strong style={{ fontSize: '12.5px', color: '#0F2A4A', fontVariantNumeric: 'tabular-nums' }}>
                      {formatINR(spendingTrend.slice(0, 3).reduce((acc, m) => acc + (m.amount || 0), 0))}
                    </strong>
                  </div>
                  <div style={{ backgroundColor: '#FAF5FF', border: '1px solid #000000', borderRadius: '4px', padding: '8px 10px' }}>
                    <span style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>Q2 (Apr - Jun)</span>
                    <strong style={{ fontSize: '12.5px', color: '#0F2A4A', fontVariantNumeric: 'tabular-nums' }}>
                      {formatINR(spendingTrend.slice(3, 6).reduce((acc, m) => acc + (m.amount || 0), 0))}
                    </strong>
                  </div>
                  <div style={{ backgroundColor: '#FAF5FF', border: '1px solid #000000', borderRadius: '4px', padding: '8px 10px' }}>
                    <span style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>Q3 (Jul - Sep)</span>
                    <strong style={{ fontSize: '12.5px', color: '#0F2A4A', fontVariantNumeric: 'tabular-nums' }}>
                      {formatINR(spendingTrend.slice(6, 9).reduce((acc, m) => acc + (m.amount || 0), 0))}
                    </strong>
                  </div>
                  <div style={{ backgroundColor: '#FAF5FF', border: '1px solid #000000', borderRadius: '4px', padding: '8px 10px' }}>
                    <span style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>Q4 (Oct - Dec)</span>
                    <strong style={{ fontSize: '12.5px', color: '#0F2A4A', fontVariantNumeric: 'tabular-nums' }}>
                      {formatINR(spendingTrend.slice(9, 12).reduce((acc, m) => acc + (m.amount || 0), 0))}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {isPlantOrAll && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '16px'
          }}>
          <div className="civet-card" style={{ border: '1px solid #000000', padding: '16px 20px', backgroundColor: '#FEF3C7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h2 className="text-h2" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} color="#D97706" />
                  Compliance Expenses
                </h2>
                <span style={{ fontSize: '10.5px', color: '#78350F' }}>Insurance, Maintenance, Tax, Permit</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '10px', color: '#78350F', display: 'block' }}>Total Compliance</span>
                <strong style={{ fontSize: '12.5px', color: '#92400E' }}>{formatINR(totalComplianceAmount)}</strong>
              </div>
            </div>

            <div style={{
              backgroundColor: '#FEF08A',
              border: '1px solid #000000',
              borderRadius: '6px',
              padding: '12px 10px 6px 0',
              marginBottom: '10px'
            }}>
              <div style={{ width: '100%', height: '190px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={complianceExpenses} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <filter id="compBar3d" x="-10%" y="-10%" width="130%" height="130%">
                        <feDropShadow dx="2" dy="3" stdDeviation="2" floodColor="#0F2A4A" floodOpacity="0.20" />
                      </filter>
                      <linearGradient id="compAmberGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FBBF24" />
                        <stop offset="100%" stopColor="#D97706" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" />
                    <XAxis dataKey="category" tickLine={{ stroke: '#000000' }} axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} tick={{ fontSize: 10, fill: '#0F2A4A' }} />
                    <YAxis tickFormatter={formatAxisINR} tickLine={{ stroke: '#000000' }} axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} tick={{ fontSize: 9.5, fill: '#0F2A4A' }} />
                    <Tooltip formatter={(val) => [formatINR(val), 'Disbursement']} />
                    <Bar dataKey="amount" fill="url(#compAmberGrad)" stroke="#B45309" strokeWidth={1} filter="url(#compBar3d)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{
              backgroundColor: '#FFFBEB',
              border: '1px solid #000000',
              borderRadius: '4px',
              padding: '8px 12px'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                {complianceExpenses.map(item => (
                  <div key={item.category} style={{ fontSize: '10.5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span style={{ color: '#78350F', fontWeight: '600' }}>{item.category}:</span>
                      <strong style={{ color: '#0F2A4A' }}>{formatINR(item.amount)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="civet-card" style={{ border: '1px solid #000000', padding: '16px 20px', backgroundColor: '#DCFCE7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h2 className="text-h2" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={16} color="#059669" />
                  Manpower Cost
                </h2>
                <span style={{ fontSize: '10.5px', color: '#065F46' }}>Drivers & Operators</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '10px', color: '#065F46', display: 'block' }}>Total Manpower</span>
                <strong style={{ fontSize: '12.5px', color: '#065F46' }}>{formatINR(totalManpowerAmount)}</strong>
              </div>
            </div>

            <div style={{
              backgroundColor: '#BBF7D0',
              border: '1px solid #000000',
              borderRadius: '6px',
              padding: '12px 10px 6px 0',
              marginBottom: '10px'
            }}>
              <div style={{ width: '100%', height: '190px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={manpowerCosts} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <filter id="manpowerBar3d" x="-10%" y="-10%" width="130%" height="130%">
                        <feDropShadow dx="2" dy="3" stdDeviation="2" floodColor="#0F2A4A" floodOpacity="0.20" />
                      </filter>
                      <linearGradient id="manpowerGreenGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34D399" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#A7F3D0" />
                    <XAxis dataKey="category" tickLine={{ stroke: '#000000' }} axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} tick={{ fontSize: 10, fill: '#0F2A4A' }} />
                    <YAxis tickFormatter={formatAxisINR} tickLine={{ stroke: '#000000' }} axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} tick={{ fontSize: 9.5, fill: '#0F2A4A' }} />
                    <Tooltip formatter={(val) => [formatINR(val), 'Disbursement']} />
                    <Bar dataKey="amount" fill="url(#manpowerGreenGrad)" stroke="#047857" strokeWidth={1} filter="url(#manpowerBar3d)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{
              backgroundColor: '#F0FDF4',
              border: '1px solid #000000',
              borderRadius: '4px',
              padding: '8px 12px'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                {manpowerCosts.map(item => (
                  <div key={item.category} style={{ fontSize: '10.5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span style={{ color: '#065F46', fontWeight: '600' }}>{item.category}:</span>
                      <strong style={{ color: '#0F2A4A' }}>{formatINR(item.amount)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

        {isPlantOrAll && (
          <div className="civet-card" style={{ border: '1px solid #000000', padding: '16px 20px', backgroundColor: '#BAE6FD' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h2 className="text-h2">Fuel & Operational Breakdown</h2>
              </div>
            </div>
            {activeServiceSpending.length === 0 ? (
              <EmptyState message="No service-type payments recorded for this period." />
            ) : (
              <div>
                <div style={{
                  backgroundColor: '#E0F2FE',
                  border: '1px solid #000000',
                  borderRadius: '6px',
                  padding: '10px 14px 4px 10px',
                  marginBottom: '12px'
                }}>
                  <div style={{ width: '100%', height: '190px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={activeServiceSpending} layout="vertical" margin={{ top: 10, right: 10, left: 30, bottom: 0 }}>
                        <defs>
                          <filter id="mainSrvBar3d" x="-10%" y="-10%" width="130%" height="130%">
                            <feDropShadow dx="2" dy="3" stdDeviation="2" floodColor="#0F2A4A" floodOpacity="0.20" />
                          </filter>
                          <linearGradient id="mainSrvBlueGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#38BDF8" />
                            <stop offset="100%" stopColor="#0284C7" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#BAE6FD" />
                        <XAxis type="number" tickFormatter={formatAxisINR} tickLine={{ stroke: '#000000' }} axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} tick={{ fontSize: 9.5, fill: '#0F2A4A' }} />
                        <YAxis dataKey="service" type="category" tickLine={{ stroke: '#000000' }} axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} tick={{ fontSize: 9.5, fill: '#0F2A4A' }} width={80} />
                        <Tooltip formatter={(val) => [formatINR(val), 'Amount']} />
                        <Bar dataKey="amount" fill="url(#mainSrvBlueGrad)" stroke="#0369A1" strokeWidth={1} filter="url(#mainSrvBar3d)" radius={[0, 3, 3, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div style={{
                  backgroundColor: '#F0F9FF',
                  border: '1px solid #000000',
                  borderRadius: '4px',
                  padding: '10px 12px'
                }}>
                  <span style={{ fontSize: '10.5px', fontWeight: '700', color: '#0F2A4A', display: 'block', marginBottom: '6px' }}>
                    Service Category Allocation:
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {activeServiceSpending.slice(0, 4).map(srv => {
                      const pct = Math.round(((srv.amount || 0) / maxSrvAmt) * 100);
                      return (
                        <div key={srv.service} style={{ fontSize: '10.5px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                            <span style={{ color: '#1C2733' }}>{srv.service}</span>
                            <strong style={{ color: '#0F2A4A' }}>{formatINR(srv.amount)}</strong>
                          </div>
                          <div style={{ width: '100%', height: '5px', backgroundColor: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', backgroundColor: '#0284C7', border: '1px solid #0369A1', borderRadius: '3px', boxShadow: '0 1px 2px rgba(0,0,0,0.12)' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <RecordPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        record={previewRecord}
        recordsList={previewList}
        currentIndex={previewIndex}
        onNavigateRecord={handleNavigatePreview}
        title="Record Preview"
      />
    </div>
  );
}
