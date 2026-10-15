import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, LabelList 
} from 'recharts';
import { Menu, Eye } from 'lucide-react';
import TablePagination from '../components/TablePagination';
import RecordPreviewModal from '../components/RecordPreviewModal';
import { api } from '../services/api';
import { formatINR, formatNumber } from '../utils/formatUtils';

const DONUT_COLORS = ['#1F6FEB', '#2563EB', '#1D4ED8', '#3B82F6', '#60A5FA'];

export default function LocationDashboard({
  locationName = '',
  filters = {},
  onFilterChange,
  onNavigate,
  currentUser,
  onLogout,
  locations = [],
  departments = [],
  toggleSidebar
}) {
  const [loading, setLoading] = useState(true);
  const [locationAnalytics, setLocationAnalytics] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const [deptTablePage, setDeptTablePage] = useState(1);
  const [regTablePage, setRegTablePage] = useState(1);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRecord, setPreviewRecord] = useState(null);
  const [previewList, setPreviewList] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  const initialLoc = locationName || 'All';
  const [localFilters, setLocalFilters] = useState({
    location: initialLoc,
    from_date: filters?.from_date || '',
    to_date: filters?.to_date || ''
  });

  useEffect(() => {
    if (locationName && locationName !== localFilters.location) {
      setLocalFilters(prev => ({ ...prev, location: locationName }));
    }
  }, [locationName]);

  useEffect(() => {
    fetchSiteAnalytics();
  }, [localFilters.location, localFilters.from_date, localFilters.to_date]);

  async function fetchSiteAnalytics() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const activeLoc = localFilters.location;
      const apiFilterParams = {
        ...filters,
        from_date: localFilters.from_date,
        to_date: localFilters.to_date
      };
      const response = await api.getLocationDashboard(activeLoc, apiFilterParams);
      setLocationAnalytics(response);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(key, value) {
    const updated = { ...localFilters, [key]: value };
    setLocalFilters(updated);
    if (key === 'location' && onNavigate) {
      onNavigate({ view: 'dashboard-location', location: value });
    }
    if (onFilterChange && ['from_date', 'to_date'].includes(key)) {
      onFilterChange({ ...filters, [key]: value });
    }
  }

  function handleResetFilters() {
    const resetState = {
      location: initialLoc,
      from_date: '',
      to_date: '',
      department: 'All',
      service: 'All',
      reportCat: 'All'
    };
    setLocalFilters(resetState);
    if (onFilterChange) {
      onFilterChange({
        from_date: '',
        to_date: '',
        location: 'All',
        department: 'All'
      });
    }
  }

  const kpis = locationAnalytics?.kpis || {};
  const charts = locationAnalytics?.charts || {};
  const monthlySpending = charts?.monthlySpending || [];
  const departmentSpending = charts?.departmentSpending || charts?.deptBreakdown || [];
  const serviceSpending = charts?.serviceSpending || [];
  const vendorSpending = charts?.vendorSpending || charts?.ledgerSpending || [];
  const departmentOverview = locationAnalytics?.departmentOverview || [];
  const registerRecords = locationAnalytics?.registerRecords || [];

  const userInitials = (currentUser?.fullName || currentUser?.email || 'Management User')
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const activeDisplayLocation = localFilters.location;
  const hasSpendingData = monthlySpending.some(m => (m.amount || 0) > 0);

  return (
    <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#FFFFFF', minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {toggleSidebar && (
            <button
              onClick={toggleSidebar}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#0F2A4A',
                cursor: 'pointer',
                display: 'flex',
                padding: '4px',
                borderRadius: '4px'
              }}
              title="Toggle Navigation"
            >
              <Menu size={18} />
            </button>
          )}
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#0F2A4A', margin: 0 }}>Cost Centers Dashboard</h1>
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px',
        padding: '6px 10px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #D9DEE5',
        borderRadius: '4px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: '#576574' }}>Cost Center:</span>
          <select
            value={localFilters.location}
            onChange={e => handleFilterChange('location', e.target.value)}
            style={{
              height: '26px',
              padding: '0 6px',
              fontSize: '11px',
              fontWeight: '600',
              color: '#1D4ED8',
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #2563EB',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            <option value="All">All Cost Centers</option>
            {locations.map(loc => (
              <option key={loc.code || loc.name} value={loc.name || loc.code}>
                {loc.name || loc.code}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: '#576574' }}>From:</span>
          <input
            type="date"
            value={localFilters.from_date || ''}
            onChange={e => handleFilterChange('from_date', e.target.value)}
            style={{
              height: '26px',
              padding: '0 6px',
              fontSize: '11px',
              color: '#0F2A4A',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: '#576574' }}>To:</span>
          <input
            type="date"
            value={localFilters.to_date || ''}
            onChange={e => handleFilterChange('to_date', e.target.value)}
            style={{
              height: '26px',
              padding: '0 6px',
              fontSize: '11px',
              color: '#0F2A4A',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          />
        </div>

        {(localFilters.from_date || localFilters.to_date) && (
          <button
            type="button"
            onClick={() => {
              handleFilterChange('from_date', '');
              handleFilterChange('to_date', '');
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#1F6FEB',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              padding: '2px 6px'
            }}
          >
            Clear Dates
          </button>
        )}
      </div>

      <div className="grid-charts-3">
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #000000', borderLeft: '4px solid #1F6FEB', borderRadius: '6px', padding: '10px 14px' }}>
          <div style={{ fontSize: '10.5px', color: '#576574' }}>Total Amount</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#0F2A4A', marginTop: '2px' }}>
            {kpis.totalPayments?.formatted || formatINR(kpis.totalPayments?.value || 0)}
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #000000', borderLeft: '4px solid #1F6FEB', borderRadius: '6px', padding: '10px 14px' }}>
          <div style={{ fontSize: '10.5px', color: '#576574' }}>P&M Working Hours</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#0F2A4A', marginTop: '2px' }}>
            {kpis.operationalKPI?.formatted || kpis.pmHours?.formatted || '0 h'}
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #000000', borderLeft: '4px solid #1F6FEB', borderRadius: '6px', padding: '10px 14px' }}>
          <div style={{ fontSize: '10.5px', color: '#576574' }}>
            {localFilters.department === 'STORES' ? 'Stores Amount' : localFilters.department === 'PM' ? 'P&M Fuel Amount' : 'Stores & Fuel Amount'}
          </div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#0F2A4A', marginTop: '2px' }}>
            {localFilters.department === 'STORES' 
              ? (kpis.storesExp?.formatted || formatINR(kpis.storesExp?.value || 0)) 
              : localFilters.department === 'PM' 
              ? (kpis.fuelExp?.formatted || formatINR(kpis.fuelExp?.value || 0)) 
              : ((kpis.fuelExp?.value || 0) + (kpis.storesExp?.value || 0) > 0 
                  ? formatINR((kpis.fuelExp?.value || 0) + (kpis.storesExp?.value || 0)) 
                  : (kpis.fuelExp?.formatted || kpis.storesExp?.formatted || 'Rs. 0.00'))}
          </div>
        </div>
      </div>

      <div className="grid-charts-3">
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #000000', borderRadius: '4px', padding: '10px 12px' }}>
          <div style={{ fontSize: '11.5px', fontWeight: '600', color: '#0F2A4A', textAlign: 'center', marginBottom: '6px' }}>
            A. Monthly Cost Center Payments (INR)
          </div>
          <div style={{ width: '100%', height: '180px' }}>
            {monthlySpending.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '11px' }}>
                No payments recorded for this cost center.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySpending} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAEFF5" />
                  <XAxis dataKey="month" tickLine={{ stroke: '#000000' }} axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} tick={{ fontSize: 9.5, fill: '#0F2A4A' }} />
                  <YAxis tickLine={{ stroke: '#000000' }} axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} tick={{ fontSize: 9.5, fill: '#0F2A4A' }} />
                  <Tooltip formatter={(val, name, item) => [formatINR(item?.payload?.amountRaw ?? (Number(val) * 100000)), 'Spending']} />
                  <Bar dataKey="amount" fill="#1F6FEB" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #000000', borderRadius: '4px', padding: '10px 12px' }}>
          <div style={{ fontSize: '11.5px', fontWeight: '600', color: '#0F2A4A', textAlign: 'center', marginBottom: '6px' }}>
            B. Department-wise Amount (INR)
          </div>
          <div style={{ width: '100%', height: '180px' }}>
            {departmentSpending.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '11px' }}>
                No departmental payments recorded.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={departmentSpending} margin={{ top: 8, right: 48, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EAEFF5" />
                  <XAxis type="number" tickLine={{ stroke: '#000000' }} axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} tick={{ fontSize: 9.5, fill: '#0F2A4A' }} />
                  <YAxis dataKey="department" type="category" interval={0} tickLine={{ stroke: '#000000' }} axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} tick={{ fontSize: 10, fill: '#0F2A4A' }} width={110} />
                  <Tooltip formatter={(val, name, item) => [formatINR(item?.payload?.amountRaw ?? (Number(val) * 100000)), 'Amount']} />
                  <Bar dataKey="spending" fill="#1F6FEB" radius={[0, 2, 2, 0]} barSize={16}>
                    <LabelList dataKey="spending" position="right" formatter={(val) => `${val}L`} style={{ fontSize: 10, fill: '#0F2A4A', fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #000000', borderRadius: '4px', padding: '10px 12px' }}>
          <div style={{ fontSize: '11.5px', fontWeight: '600', color: '#0F2A4A', textAlign: 'center', marginBottom: '6px' }}>
            C. Fuel & Materials Distribution
          </div>
          <div style={{ display: 'flex', alignItems: 'center', height: '180px' }}>
            {serviceSpending.length === 0 ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '11px' }}>
                No fuel or materials recorded.
              </div>
            ) : (
              <>
                <div style={{ flex: 1, height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={serviceSpending}
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={62}
                        paddingAngle={2}
                        dataKey="percentage"
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {serviceSpending.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val, name, props) => [`${val}%`, props.payload.service]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ width: '90px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '10.5px', color: '#334155' }}>
                  {serviceSpending.map((entry, index) => (
                    <div key={entry.service} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '9px', height: '9px', backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length], display: 'inline-block' }} />
                      <span>{entry.service}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid-charts-3">
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #000000', borderRadius: '4px', padding: '10px 12px' }}>
          <div style={{ fontSize: '11.5px', fontWeight: '600', color: '#0F2A4A', marginBottom: '8px' }}>
            D. Department operational overview
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0F2A4A', color: '#FFFFFF', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px', fontWeight: 600 }}>Dept</th>
                  <th style={{ padding: '6px 8px', fontWeight: 600 }}>Measure</th>
                  <th style={{ padding: '6px 8px', fontWeight: 600 }}>Value</th>
                  <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {departmentOverview.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '14px', color: '#94A3B8' }}>
                      No operational logs recorded.
                    </td>
                  </tr>
                ) : (
                  departmentOverview.slice((deptTablePage - 1) * 5, deptTablePage * 5).map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #000000' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 600, color: '#0F2A4A' }}>{row.department}</td>
                      <td style={{ padding: '6px 8px', color: '#475569' }}>{row.measure}</td>
                      <td style={{ padding: '6px 8px', color: '#0F2A4A', fontWeight: 500 }}>{row.value}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ height: '20px', padding: '0 6px', fontSize: '9.5px', border: '1px solid #000000' }}
                          onClick={() => {
                            setPreviewRecord(row);
                            setPreviewList(departmentOverview);
                            setPreviewIndex((deptTablePage - 1) * 5 + idx);
                            setPreviewOpen(true);
                          }}
                        >
                          <Eye size={10} />
                          Preview
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <TablePagination
            currentPage={deptTablePage}
            totalItems={departmentOverview.length}
            pageSize={5}
            onPageChange={setDeptTablePage}
          />
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #000000', borderRadius: '4px', padding: '10px 12px' }}>
          <div style={{ fontSize: '11.5px', fontWeight: '600', color: '#0F2A4A', textAlign: 'center', marginBottom: '6px' }}>
            E. Top Supplier & Vendor Payments (INR)
          </div>
          <div style={{ width: '100%', height: '180px' }}>
            {(!vendorSpending || vendorSpending.length === 0) ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '11px' }}>
                No vendor payments recorded.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={vendorSpending.slice(0, 5)} margin={{ top: 8, right: 48, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EAEFF5" />
                  <XAxis type="number" tickLine={{ stroke: '#000000' }} axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} tick={{ fontSize: 9.5, fill: '#0F2A4A' }} />
                  <YAxis dataKey="vendor" type="category" interval={0} tickLine={{ stroke: '#000000' }} axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} tick={{ fontSize: 10, fill: '#0F2A4A' }} width={140} />
                  <Tooltip formatter={(val, name, item) => [formatINR(item?.payload?.amountRaw ?? (Number(val) * 100000)), 'Spending']} />
                  <Bar dataKey="amount" fill="#1F6FEB" radius={[0, 2, 2, 0]} barSize={16}>
                    <LabelList dataKey="amount" position="right" formatter={(val) => `${val}L`} style={{ fontSize: 10, fill: '#0F2A4A', fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #000000', borderRadius: '4px', padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: '600', color: '#0F2A4A', marginBottom: '8px' }}>
              F. Cost Center Report Register
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0F2A4A', color: '#FFFFFF', textAlign: 'left' }}>
                    <th style={{ padding: '6px 8px', fontWeight: 600 }}>Period</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600 }}>Dept</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600 }}>Report</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600 }}>Rec</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {registerRecords.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '14px', color: '#94A3B8' }}>
                        No records logged for this cost center.
                      </td>
                    </tr>
                  ) : (
                    registerRecords.slice((regTablePage - 1) * 5, regTablePage * 5).map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #000000' }}>
                        <td style={{ padding: '6px 8px', color: '#475569' }}>{row.period}</td>
                        <td style={{ padding: '6px 8px', fontWeight: 600, color: '#0F2A4A' }}>{row.dept}</td>
                        <td style={{ padding: '6px 8px', color: '#475569' }}>{row.report}</td>
                        <td style={{ padding: '6px 8px', color: '#1F6FEB', fontWeight: 600 }}>{row.rec}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ height: '20px', padding: '0 6px', fontSize: '9.5px', border: '1px solid #000000' }}
                            onClick={() => {
                              setPreviewRecord(row);
                              setPreviewList(registerRecords);
                              setPreviewIndex((regTablePage - 1) * 5 + idx);
                              setPreviewOpen(true);
                            }}
                          >
                            <Eye size={10} />
                            Preview
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination
              currentPage={regTablePage}
              totalItems={registerRecords.length}
              pageSize={5}
              onPageChange={setRegTablePage}
            />
          </div>

          <div
            onClick={() => onNavigate && onNavigate({ view: 'register', prefilterLocation: activeDisplayLocation })}
            style={{
              fontSize: '10px',
              color: '#64748B',
              cursor: 'pointer',
              marginTop: '10px',
              paddingTop: '6px',
              borderTop: '1px solid #F1F5F9'
            }}
          >
            Drill: Overview &gt; Cost Center &gt; Department &gt; Daily Cost Center Logs
          </div>
        </div>
      </div>

      <RecordPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        record={previewRecord}
        recordsList={previewList}
        currentIndex={previewIndex}
        onNavigateRecord={(newIdx) => {
          if (newIdx >= 0 && newIdx < previewList.length) {
            setPreviewIndex(newIdx);
            setPreviewRecord(previewList[newIdx]);
          }
        }}
        title={`${activeDisplayLocation} — Record Inspection`}
      />
    </div>
  );
}
