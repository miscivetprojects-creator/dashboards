import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { formatINR, formatNumber } from '../utils/formatUtils';

export default function CashAndCarryChart({ data = [], analytics = {} }) {
  if (!analytics || !analytics.hasEntries || !analytics.totalRecords || analytics.totalRecords === 0) {
    return null;
  }

  const chartPoints = Array.isArray(data) ? data : [];
  if (chartPoints.length === 0 || !chartPoints.some(d => (d.quantity || 0) > 0 || (d.amount || 0) > 0)) {
    return null;
  }

  const totalQty = analytics.totalQuantity || chartPoints.reduce((acc, d) => acc + (Number(d.quantity) || 0), 0);
  const totalAmt = analytics.totalAmount || chartPoints.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
  const avgRate = totalQty > 0 ? Number((totalAmt / totalQty).toFixed(2)) : (analytics.avgRate || 0);
  const sharePct = analytics.sharePercentage || 0;

  const topLocations = Array.isArray(analytics.topLocations) && analytics.topLocations.length > 0
    ? analytics.topLocations.slice(0, 4)
    : [];

  const maxLocQty = topLocations.length > 0 ? Math.max(...topLocations.map(l => l.quantity || 1)) : 1;

  const formatShortAxisINR = (val) => {
    if (val >= 10000000) return `${(val / 10000000).toFixed(1)} Cr`;
    if (val >= 100000) return `${(val / 100000).toFixed(1)} L`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
    return val;
  };

  const formatShortAxisLtr = (val) => {
    if (val >= 100000) return `${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
    return val;
  };

  return (
    <div className="civet-card" style={{ padding: '16px 20px', border: '1px solid #000000', backgroundColor: '#FED7AA' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#0F2A4A', margin: 0 }}>
            Cash & Carry Fuel Expenses & Quantity Trend
          </h2>
          <span style={{ fontSize: '11px', color: '#64748B' }}>
            Direct cash & carry vendor transactions and fuel intake volume
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '11px', fontWeight: '600' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#1F6FEB' }}>
            <span style={{ width: '10px', height: '10px', backgroundColor: '#1F6FEB', borderRadius: '2px' }} />
            Payments Made (Rs.)
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#D97706' }}>
            <span style={{ width: '10px', height: '10px', backgroundColor: '#D97706', borderRadius: '50%' }} />
            Fuel Quantity (Ltrs)
          </span>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.9fr) minmax(280px, 1fr)',
        gap: '20px',
        alignItems: 'stretch'
      }}>
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #000000',
          borderRadius: '6px',
          padding: '14px 12px 6px 4px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ width: '100%', height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartPoints} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAEFF5" />
                <XAxis
                  dataKey="month"
                  interval={0}
                  tickLine={{ stroke: '#000000' }}
                  axisLine={{ stroke: '#000000', strokeWidth: 1.5 }}
                  tick={{ fontSize: 10, fill: '#0F2A4A', fontWeight: '600' }}
                />
                <YAxis
                  yAxisId="left"
                  tickLine={{ stroke: '#000000' }}
                  axisLine={{ stroke: '#000000', strokeWidth: 1.5 }}
                  tick={{ fontSize: 9.5, fill: '#0284C7' }}
                  tickFormatter={formatShortAxisINR}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickLine={{ stroke: '#000000' }}
                  axisLine={{ stroke: '#000000', strokeWidth: 1.5 }}
                  tick={{ fontSize: 9.5, fill: '#EA580C' }}
                  tickFormatter={formatShortAxisLtr}
                />
                <defs>
                  <filter id="ccBar3d" x="-10%" y="-10%" width="130%" height="130%">
                    <feDropShadow dx="2" dy="3" stdDeviation="2" floodColor="#0F2A4A" floodOpacity="0.20" />
                  </filter>
                  <filter id="ccLine3d" x="-10%" y="-10%" width="120%" height="130%">
                    <feDropShadow dx="1" dy="3" stdDeviation="2" floodColor="#C2410C" floodOpacity="0.30" />
                  </filter>
                  <linearGradient id="ccGradBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38BDF8" />
                    <stop offset="100%" stopColor="#0284C7" />
                  </linearGradient>
                </defs>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div style={{
                        backgroundColor: '#0F2A4A',
                        color: '#FFFFFF',
                        padding: '10px 14px',
                        borderRadius: '5px',
                        border: '1px solid #000000',
                        fontSize: '11px',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
                      }}>
                        <div style={{ fontWeight: '700', marginBottom: '5px', color: '#F8FAFC', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '3px' }}>
                          {d.label || `${d.month} ${d.year || 2025}`}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', marginBottom: '3px' }}>
                          <span style={{ color: '#93C5FD' }}>Payments Made:</span>
                          <strong style={{ color: '#FFFFFF' }}>{formatINR(d.amount || 0)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', marginBottom: '3px' }}>
                          <span style={{ color: '#FDE68A' }}>Intake Quantity:</span>
                          <strong style={{ color: '#FFFFFF' }}>{formatNumber(d.quantity || 0, 2)} Ltrs</strong>
                        </div>
                        {Number(d.quantity) > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', fontSize: '10.5px', color: '#94A3B8' }}>
                            <span>Average Rate:</span>
                            <span>Rs. {(Number(d.amount || 0) / Number(d.quantity)).toFixed(2)} / Ltr</span>
                          </div>
                        )}
                        {d.count ? (
                          <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '3px' }}>
                            {d.count} Cash & Carry Entries
                          </div>
                        ) : null}
                      </div>
                    );
                  }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="amount"
                  fill="url(#ccGradBlue)"
                  stroke="#0369A1"
                  strokeWidth={1.5}
                  filter="url(#ccBar3d)"
                  radius={[4, 4, 0, 0]}
                  name="Payments Made (Rs.)"
                  barSize={32}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="quantity"
                  stroke="#EA580C"
                  strokeWidth={3.5}
                  filter="url(#ccLine3d)"
                  name="Fuel Quantity (Ltrs)"
                  dot={{ r: 4.5, fill: '#FFFFFF', stroke: '#EA580C', strokeWidth: 2.5 }}
                  activeDot={{ r: 6.5, fill: '#EA580C', stroke: '#FFFFFF', strokeWidth: 2.5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            marginTop: '8px',
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            fontSize: '11px',
            color: '#64748B'
          }}>
            <span>Blended Cash & Carry Fuel Rate:</span>
            <strong style={{ color: '#0F2A4A' }}>Rs. {avgRate.toFixed(2)} / Ltr</strong>
          </div>
        </div>

        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #000000',
          borderRadius: '6px',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #000000',
            paddingBottom: '8px'
          }}>
            <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#0F2A4A', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={13} color="#1F6FEB" />
              Cash & Carry Breakdown Summary
            </h3>
            <span style={{
              fontSize: '10px',
              padding: '2px 6px',
              backgroundColor: '#DCFCE7',
              color: '#15803D',
              borderRadius: '3px',
              fontWeight: '600'
            }}>
              {sharePct}% Share
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px'
          }}>
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '4px',
              padding: '8px'
            }}>
              <span style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>Total C&C Payments</span>
              <strong style={{ fontSize: '12px', color: '#1F6FEB' }}>
                {formatINR(totalAmt)}
              </strong>
            </div>

            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '4px',
              padding: '8px'
            }}>
              <span style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>Total C&C Quantity</span>
              <strong style={{ fontSize: '12px', color: '#0F2A4A' }}>
                {formatNumber(totalQty, 2)} Ltrs
              </strong>
            </div>

            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '4px',
              padding: '8px'
            }}>
              <span style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>Average Rate</span>
              <strong style={{ fontSize: '12px', color: '#2E9E6B' }}>
                Rs. {avgRate.toFixed(2)} / Ltr
              </strong>
            </div>

            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '4px',
              padding: '8px'
            }}>
              <span style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>Total C&C Entries</span>
              <strong style={{ fontSize: '12px', color: '#0F2A4A' }}>
                {analytics.totalRecords || chartPoints.reduce((acc, d) => acc + (d.count || 0), 0)} logs
              </strong>
            </div>
          </div>

          <div style={{ marginTop: '2px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: '700', color: '#0F2A4A', display: 'block', marginBottom: '6px' }}>
              Top Cost Centers (Cash & Carry Intake):
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {topLocations.map(loc => {
                const pct = Math.round(((loc.quantity || 0) / maxLocQty) * 100);
                return (
                  <div key={loc.name} style={{ fontSize: '10.5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span style={{ color: '#1C2733', fontWeight: '500' }}>{loc.name}</span>
                      <strong style={{ color: '#0F2A4A' }}>{formatNumber(loc.quantity, 2)} Ltrs</strong>
                    </div>
                    <div style={{ width: '100%', height: '5px', backgroundColor: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', backgroundColor: '#2563EB', borderRadius: '3px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
