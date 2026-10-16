import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { TrendingUp, Layers, Building2, MapPin, Eye, Calendar, DollarSign, CheckCircle2 } from 'lucide-react';
import KPICard from '../components/KPICard';
import EmptyState from '../components/EmptyState';
import TablePagination from '../components/TablePagination';
import RecordPreviewModal from '../components/RecordPreviewModal';
import { api } from '../services/api';
import { formatINR, formatNumber } from '../utils/formatUtils';

const PALETTE = ['#0284C7', '#059669', '#EA580C', '#7C3AED', '#EAB308', '#BE123C'];
const PALETTE_STROKES = ['#0369A1', '#047857', '#C2410C', '#5B21B6', '#A16207', '#9F1239'];

function formatAxisINR(val) {
  if (val >= 10000000) return `${(val / 10000000).toFixed(1)} Cr`;
  if (val >= 100000) return `${(val / 100000).toFixed(1)} L`;
  if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
  return val;
}

export default function MainDashboard({ filters, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRecord, setPreviewRecord] = useState(null);
  const [previewList, setPreviewList] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  useEffect(() => {
    fetchDashboardAnalytics();
  }, [filters]);

  async function fetchDashboardAnalytics() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await api.getMainDashboard(filters);
      setDashboardData(response);
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

  if (loading) {
    return (
      <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <div style={{ color: '#576574', fontSize: '12px' }}>Loading management analytics...</div>
      </div>
    );
  }

  if (errorMessage) {
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
  const complianceMatrix = (dashboardData?.coverageMatrix || []).map(row => {
    const copy = { ...row };
    if (copy.departments) {
      delete copy.departments.ACCOUNTS;
      delete copy.departments.accounts;
    }
    return copy;
  });

  const spendingTrend = charts.spendingTrend || [];
  const activeDeptSpending = (charts.departmentWiseSpending || []).filter(d => (d.amount || 0) > 0);
  const activeLocSpending = (charts.locationWiseSpending || []).filter(l => (l.amount || 0) > 0);
  const activeServiceSpending = (charts.serviceSpending || []).filter(s => (s.amount || 0) > 0);

  let peakSpendingMonth = spendingTrend[0];
  spendingTrend.forEach(m => {
    if ((m.amount || 0) > (peakSpendingMonth?.amount || 0)) {
      peakSpendingMonth = m;
    }
  });

  const totalPaymentsAmount = Number(kpis.totalPayments?.value || 0);
  const totalCostAmount = Number(kpis.totalCost?.value || 0);
  const totalOpeningAmount = Number(kpis.openingBalance?.value || 0);
  const totalClosingAmount = Number(kpis.closingBalance?.value || 0);
  const totalMonthsWithData = spendingTrend.filter(m => (m.amount || 0) > 0).length || 1;
  const avgMonthlySpending = totalPaymentsAmount > 0 ? Math.round(totalPaymentsAmount / totalMonthsWithData) : 0;

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

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="grid-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <KPICard 
          label="Total Paid Amount" 
          value={formatINR(totalPaymentsAmount)} 
          bg="#FFEDB9"
          borderLeftColor="#D99A1E"
        />
        <KPICard 
          label="Total Amount (Fuel Cost)" 
          value={formatINR(totalCostAmount)} 
          bg="#BAE6FD"
          borderLeftColor="#0284C7"
        />
        <KPICard 
          label="Opening Balance" 
          value={formatINR(totalOpeningAmount)} 
          bg="#BBF7D0"
          borderLeftColor="#16A34A"
        />
        <KPICard 
          label="Closing Balance" 
          value={formatINR(totalClosingAmount)} 
          bg="#FED7AA"
          borderLeftColor="#EA580C"
        />
        <KPICard 
          label="Active Cost Centers" 
          value={kpis.activeSites?.formatted || `${activeLocSpending.length || 39} Cost Centers`} 
          bg="#DDD6FE"
          borderLeftColor="#7C3AED"
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="civet-card" style={{ border: '1px solid #000000', padding: '16px 20px', backgroundColor: '#E0F2FE' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#0F2A4A', margin: 0 }}>Monthly Payments</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
              <span style={{ color: '#64748B' }}>Total Amount:</span>
              <strong style={{ color: '#0F2A4A', fontWeight: '700' }}>{formatINR(totalPaymentsAmount)}</strong>
            </div>
          </div>

          {(!spendingTrend || spendingTrend.length === 0) ? (
            <EmptyState message="No payment transactions recorded for monthly trend." />
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.9fr) minmax(280px, 1fr)',
              gap: '20px',
              alignItems: 'stretch'
            }}>
              <div style={{
                backgroundColor: '#BAE6FD',
                border: '1px solid #000000',
                borderRadius: '6px',
                padding: '14px 12px 8px 6px'
              }}>
                <div style={{ width: '100%', height: '240px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={spendingTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <filter id="mainBar3d" x="-10%" y="-10%" width="130%" height="130%">
                          <feDropShadow dx="2" dy="3" stdDeviation="2" floodColor="#0F2A4A" floodOpacity="0.20" />
                        </filter>
                        <linearGradient id="mainPaidGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#38BDF8" />
                          <stop offset="100%" stopColor="#0284C7" />
                        </linearGradient>
                        <linearGradient id="mainClosingGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FB7185" />
                          <stop offset="100%" stopColor="#BE123C" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" strokeOpacity={0.4} />
                      <XAxis dataKey="month" interval={0} tickLine={{ stroke: '#000000' }} axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} tick={{ fontSize: 10, fill: '#0F2A4A' }} />
                      <YAxis tickFormatter={formatAxisINR} tickLine={{ stroke: '#000000' }} axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} tick={{ fontSize: 10, fill: '#0F2A4A' }} />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const pData = payload[0]?.payload || {};
                            const tot = pData.amount || 0;
                            const bal = pData.balance || 0;
                            const cost = pData.totalCost || (tot + bal);
                            return (
                              <div style={{
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #D9DEE5',
                                borderRadius: '6px',
                                boxShadow: '0 4px 14px rgba(15, 42, 74, 0.10)',
                                padding: '10px 14px',
                                minWidth: '200px'
                              }}>
                                <div style={{
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  color: '#0F2A4A',
                                  marginBottom: '8px',
                                  borderBottom: '1px solid #F1F5F9',
                                  paddingBottom: '4px'
                                }}>
                                  {label} {pData.year || activeYear}
                                </div>
                                {(pData.openingBalance > 0 || bal > 0) && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', marginBottom: '4px' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#7C3AED' }}>
                                      <span style={{ width: '9px', height: '9px', borderRadius: '2px', backgroundColor: '#7C3AED', border: '1px solid #5B21B6' }}></span>
                                      Opening Balance
                                    </span>
                                    <strong style={{ color: '#7C3AED', fontWeight: '700' }}>{formatINR(pData.openingBalance || 0)}</strong>
                                  </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', marginBottom: '4px' }}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669' }}>
                                    <span style={{ width: '9px', height: '9px', borderRadius: '2px', backgroundColor: '#059669', border: '1px solid #047857' }}></span>
                                    Total Cost
                                  </span>
                                  <strong style={{ color: '#0F2A4A', fontWeight: '700' }}>{formatINR(cost)}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', marginBottom: '4px' }}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0284C7' }}>
                                    <span style={{ width: '9px', height: '9px', borderRadius: '2px', backgroundColor: '#0284C7', border: '1px solid #0369A1' }}></span>
                                    Paid Amount
                                  </span>
                                  <strong style={{ color: '#0F2A4A', fontWeight: '700' }}>{formatINR(tot)}</strong>
                                </div>
                                {(bal > 0 || pData.openingBalance > 0) && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', borderTop: '1px solid #F1F5F9', paddingTop: '4px' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#BE123C' }}>
                                      <span style={{ width: '9px', height: '9px', borderRadius: '2px', backgroundColor: '#BE123C', border: '1px solid #9F1239' }}></span>
                                      Closing Balance
                                    </span>
                                    <strong style={{ color: '#BE123C', fontWeight: '700' }}>{formatINR(bal)}</strong>
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="amount" fill="url(#mainPaidGrad)" stroke="#0369A1" strokeWidth={1} filter="url(#mainBar3d)" stackId="main" radius={[0, 0, 0, 0]} name="Paid Amount (Rs.)" />
                      <Bar dataKey="balance" fill="url(#mainClosingGrad)" stroke="#9F1239" strokeWidth={1} filter="url(#mainBar3d)" stackId="main" radius={[3, 3, 0, 0]} name="Closing Balance (Rs.)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{
                backgroundColor: '#F0F9FF',
                border: '1px solid #000000',
                borderRadius: '6px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#0F2A4A', margin: 0, borderBottom: '1px solid #000000', paddingBottom: '6px' }}>
                  Payment Summary
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ backgroundColor: '#E0F2FE', border: '1px solid #000000', borderRadius: '4px', padding: '6px 8px' }}>
                    <span style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>Peak Month</span>
                    <strong style={{ fontSize: '12px', color: '#0F2A4A' }}>{peakSpendingMonth?.month || 'Jan'}</strong>
                    <div style={{ fontSize: '10px', color: '#1F6FEB', fontWeight: '600' }}>
                      {formatINR(peakSpendingMonth?.amount || 0)}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#DCFCE7', border: '1px solid #000000', borderRadius: '4px', padding: '6px 8px' }}>
                    <span style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>Monthly Average</span>
                    <strong style={{ fontSize: '12px', color: '#2E9E6B' }}>
                      {formatINR(avgMonthlySpending)}
                    </strong>
                    <div style={{ fontSize: '10px', color: '#64748B' }}>Active Months: {totalMonthsWithData}</div>
                  </div>
                </div>

                <div style={{
                  backgroundColor: '#FEF3C7',
                  border: '1px solid #000000',
                  borderRadius: '4px',
                  padding: '8px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#0F2A4A' }}>Department Allocation</span>
                  </div>

                  {activeDeptSpending.map((d, idx) => (
                    <div key={d.name || idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px' }}>
                      <span style={{ color: '#64748B' }}>{d.name || d.id}</span>
                      <strong style={{ color: '#0F2A4A' }}>{formatINR(d.amount)}</strong>
                    </div>
                  ))}
                  {activeDeptSpending.length === 0 && (
                    <div style={{ fontSize: '10.5px', color: '#64748B' }}>No departmental spend logged</div>
                  )}
                </div>

                <div style={{ fontSize: '10.5px', marginTop: '2px' }}>
                  <span style={{ fontWeight: '700', color: '#0F2A4A', display: 'block', marginBottom: '4px' }}>Quarterly Highlights:</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', backgroundColor: '#FAF5FF', border: '1px solid #000000', borderRadius: '3px' }}>
                      <span>Q1 (Jan - Mar)</span>
                      <strong>{formatINR(spendingTrend.slice(0, 3).reduce((acc, m) => acc + (m.amount || 0), 0))}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', backgroundColor: '#FAF5FF', border: '1px solid #000000', borderRadius: '3px' }}>
                      <span>Q2 (Apr - Jun)</span>
                      <strong>{formatINR(spendingTrend.slice(3, 6).reduce((acc, m) => acc + (m.amount || 0), 0))}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', backgroundColor: '#FAF5FF', border: '1px solid #000000', borderRadius: '3px' }}>
                      <span>Q3 (Jul - Sep)</span>
                      <strong>{formatINR(spendingTrend.slice(6, 9).reduce((acc, m) => acc + (m.amount || 0), 0))}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', backgroundColor: '#FAF5FF', border: '1px solid #000000', borderRadius: '3px' }}>
                      <span>Q4 (Oct - Dec)</span>
                      <strong>{formatINR(spendingTrend.slice(9, 12).reduce((acc, m) => acc + (m.amount || 0), 0))}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="civet-card" style={{ border: '1px solid #000000', padding: '16px 20px', backgroundColor: '#F3E8FF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#0F2A4A', margin: 0 }}>Department Spending Share</h2>
            <span style={{ fontSize: '10.5px', color: '#8395A7', fontWeight: '600' }}>Distribution %</span>
          </div>

          {activeDeptSpending.length === 0 ? (
            <EmptyState message="No department spending recorded for this period." />
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.3fr) minmax(280px, 1.2fr)',
              gap: '20px',
              alignItems: 'center'
            }}>
              <div style={{
                backgroundColor: '#DDD6FE',
                border: '1px solid #000000',
                borderRadius: '6px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                position: 'relative'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px',
                  borderBottom: '1px solid #000000',
                  paddingBottom: '4px'
                }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#0F2A4A' }}>
                    Visual Allocation
                  </span>
                  <span style={{ fontSize: '10.5px', color: '#576574' }}>
                    {activeDeptSpending.length} {activeDeptSpending.length === 1 ? 'Department' : 'Departments'}
                  </span>
                </div>

                <div style={{ width: '100%', height: '220px', position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        <filter id="mainPie3d" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="2" dy="3" stdDeviation="2.5" floodColor="#0F2A4A" floodOpacity="0.22" />
                        </filter>
                      </defs>
                      <Pie
                        data={activeDeptSpending}
                        cx="50%"
                        cy="50%"
                        innerRadius={56}
                        outerRadius={86}
                        paddingAngle={2}
                        dataKey="amount"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={true}
                        filter="url(#mainPie3d)"
                      >
                        {activeDeptSpending.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={PALETTE[index % PALETTE.length]} 
                            stroke={PALETTE_STROKES[index % PALETTE_STROKES.length]}
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(val, name) => [`Rs. ${Number(val).toLocaleString('en-IN')}`, name]} 
                        contentStyle={{ fontSize: '11px', borderRadius: '4px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    pointerEvents: 'none'
                  }}>
                    <span style={{ fontSize: '9.5px', color: '#64748B', display: 'block', fontWeight: '600', textTransform: 'uppercase' }}>
                      Total Spend
                    </span>
                    <strong style={{ fontSize: '13px', fontWeight: '800', color: '#0F2A4A', display: 'block' }}>
                      {formatINR(totalPaymentsAmount)}
                    </strong>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  justifyContent: 'center',
                  marginTop: '4px',
                  paddingTop: '6px',
                  borderTop: '1px solid #000000'
                }}>
                  {activeDeptSpending.map((entry, index) => {
                    const total = activeDeptSpending.reduce((sum, d) => sum + d.amount, 0);
                    const pct = total > 0 ? (entry.amount / total) * 100 : 0;
                    return (
                      <div key={entry.name || index} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10.5px' }}>
                        <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: PALETTE[index % PALETTE.length], border: `1.5px solid ${PALETTE_STROKES[index % PALETTE_STROKES.length]}`, boxShadow: '0 1px 3px rgba(0,0,0,0.18)', display: 'inline-block' }} />
                        <span style={{ color: '#0F2A4A', fontWeight: '600' }}>{entry.name || entry.id}:</span>
                        <span style={{ color: '#1F6FEB', fontWeight: '700' }}>
                          {formatINR(entry.amount)}
                        </span>
                        <span style={{ color: '#576574' }}>({pct.toFixed(1)}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{
                backgroundColor: '#FAF5FF',
                border: '1px solid #000000',
                borderRadius: '6px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #000000', paddingBottom: '6px' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#0F2A4A', margin: 0 }}>
                    Ranked Department Allocation
                  </h3>
                  <span style={{ fontSize: '10px', color: '#64748B', fontWeight: '600' }}>
                    Share & Volume
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {activeDeptSpending.map((entry, index) => {
                    const total = activeDeptSpending.reduce((sum, d) => sum + d.amount, 0);
                    const pct = total > 0 ? (entry.amount / total) * 100 : 0;
                    const pctStr = pct < 0.01 && entry.amount > 0 ? '<0.01%' : `${pct.toFixed(1)}%`;
                    const formattedAmt = formatINR(entry.amount);
                    return (
                      <div key={entry.name || index} style={{
                        padding: '8px 10px',
                        backgroundColor: '#F3E8FF',
                        border: '1px solid #000000',
                        borderRadius: '4px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        fontSize: '11px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: PALETTE[index % PALETTE.length], border: `1.5px solid ${PALETTE_STROKES[index % PALETTE_STROKES.length]}`, boxShadow: '0 1px 3px rgba(0,0,0,0.18)' }} />
                            <strong style={{ color: '#0F2A4A' }}>{entry.name || entry.id}</strong>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#1F6FEB', fontWeight: '700' }}>{formattedAmt}</span>
                            <span style={{ fontSize: '10.5px', color: '#64748B', fontWeight: '600' }}>{pctStr}</span>
                          </div>
                        </div>
                        <div style={{ width: '100%', height: '6px', backgroundColor: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', backgroundColor: PALETTE[index % PALETTE.length], border: `1px solid ${PALETTE_STROKES[index % PALETTE_STROKES.length]}`, borderRadius: '3px', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
          gap: '16px'
        }}>
          <div className="civet-card" style={{ border: '1px solid #000000', padding: '16px 20px', backgroundColor: '#FEF3C7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h2 className="text-h2">Cost Center Payments</h2>
              </div>
            </div>
            {activeLocSpending.length === 0 ? (
              <EmptyState message="No cost center spending data recorded for this period." />
            ) : (
              <div>
                <div style={{
                  backgroundColor: '#FEF08A',
                  border: '1px solid #000000',
                  borderRadius: '6px',
                  padding: '10px 8px 4px 0',
                  marginBottom: '12px'
                }}>
                  <div style={{ width: '100%', height: '190px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={activeLocSpending} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <filter id="mainLocBar3d" x="-10%" y="-10%" width="130%" height="130%">
                            <feDropShadow dx="2" dy="3" stdDeviation="2" floodColor="#0F2A4A" floodOpacity="0.20" />
                          </filter>
                          <linearGradient id="mainLocBlueGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#38BDF8" />
                            <stop offset="100%" stopColor="#0284C7" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" />
                        <XAxis dataKey="location" tickLine={{ stroke: '#000000' }} axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} tick={{ fontSize: 9.5, fill: '#0F2A4A' }} />
                        <YAxis tickFormatter={formatAxisINR} tickLine={{ stroke: '#000000' }} axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} tick={{ fontSize: 9.5, fill: '#0F2A4A' }} />
                        <Tooltip formatter={(val) => [formatINR(val), 'Spending']} />
                        <Bar dataKey="amount" fill="url(#mainLocBlueGrad)" stroke="#0369A1" strokeWidth={1} filter="url(#mainLocBar3d)" radius={[3, 3, 0, 0]} />
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
                  <span style={{ fontSize: '10.5px', fontWeight: '700', color: '#0F2A4A', display: 'block', marginBottom: '6px' }}>
                    Top Cost Centers:
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {activeLocSpending.slice(0, 4).map(loc => {
                      const pct = Math.round(((loc.amount || 0) / maxLocAmt) * 100);
                      return (
                        <div key={loc.location} style={{ fontSize: '10.5px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                            <span style={{ color: '#1C2733' }}>{loc.location}</span>
                            <strong style={{ color: '#0F2A4A' }}>{formatINR(loc.amount)}</strong>
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

          <div className="civet-card" style={{ border: '1px solid #000000', padding: '16px 20px', backgroundColor: '#DCFCE7' }}>
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
                  backgroundColor: '#BBF7D0',
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
                          <linearGradient id="mainSrvGreenGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#34D399" />
                            <stop offset="100%" stopColor="#059669" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#A7F3D0" />
                        <XAxis type="number" tickFormatter={formatAxisINR} tickLine={{ stroke: '#000000' }} axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} tick={{ fontSize: 9.5, fill: '#0F2A4A' }} />
                        <YAxis dataKey="service" type="category" tickLine={{ stroke: '#000000' }} axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} tick={{ fontSize: 9.5, fill: '#0F2A4A' }} width={80} />
                        <Tooltip formatter={(val) => [formatINR(val), 'Amount']} />
                        <Bar dataKey="amount" fill="url(#mainSrvGreenGrad)" stroke="#047857" strokeWidth={1} filter="url(#mainSrvBar3d)" radius={[0, 3, 3, 0]} />
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
                            <div style={{ width: `${pct}%`, height: '100%', backgroundColor: '#059669', border: '1px solid #047857', borderRadius: '3px', boxShadow: '0 1px 2px rgba(0,0,0,0.12)' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
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
