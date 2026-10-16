import React, { useState, useEffect } from 'react';
import { 
  Search, 
  FileSpreadsheet, 
  FileText,
  Eye, 
  Edit3, 
  History, 
  ChevronLeft, 
  ChevronRight, 
  Filter 
} from 'lucide-react';
import Modal from '../components/Modal';
import SearchableSelect from '../components/SearchableSelect';
import TablePagination from '../components/TablePagination';
import { api } from '../services/api';
import { formatDateDisplay, formatDateTimeDisplay } from '../utils/dateUtils';

const REPORT_TYPE_LABELS = {
  FUEL_PURCHASE: 'Fuel Management',
  VEHICLE_UTILIZATION: 'Vehicle Utilization',
  STORES_PURCHASE: 'Stores & Inventory',
  ADMIN_EXPENSE: 'Admin Expenses',
  PLANNING_PROGRESS: 'Project Progress'
};

export default function DataRegister({ prefilterDept, prefilterLocation, onNavigate }) {
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 25, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [schemas, setSchemas] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState(prefilterDept || 'All');
  const [locationFilter, setLocationFilter] = useState(prefilterLocation || 'All');
  const [reportTypeFilter, setReportTypeFilter] = useState('All');

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedRecordIndex, setSelectedRecordIndex] = useState(null);
  const [recordSchema, setRecordSchema] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [revisionRecord, setRevisionRecord] = useState(null);
  const [revisionData, setRevisionData] = useState({});
  const [changeReason, setChangeReason] = useState('');
  const [revisionError, setRevisionError] = useState('');
  const [isRevising, setIsRevising] = useState(false);
  const [isReviseModalOpen, setIsReviseModalOpen] = useState(false);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    fetchRecords(1);
  }, [departmentFilter, locationFilter, reportTypeFilter]);

  async function loadFilterOptions() {
    try {
      const [dRes, lRes, sRes] = await Promise.all([
        api.getMaster('departments'),
        api.getMaster('locations'),
        api.getSchemas()
      ]);
      setDepartments((dRes || []).filter(d => !String(d.code || d.name || d.id || '').toUpperCase().includes('ACCOUNT')));
      setLocations(lRes || []);
      setSchemas((sRes || []).filter(s => !String(s.report_type_id || s.reportType || s.report_name || s.name || '').toUpperCase().includes('ACCOUNT')));
    } catch (err) {
      console.error('Failed loading filter options:', err);
    }
  }

  async function fetchRecords(targetPage = 1) {
    setLoading(true);
    try {
      const res = await api.getRegisterRecords({
        page: targetPage,
        limit: 25,
        search: searchQuery,
        department: departmentFilter,
        location: locationFilter,
        reportType: reportTypeFilter
      });
      setRecords(res.records || []);
      setPagination(res.pagination || { total: 0, page: 1, limit: 25, totalPages: 1 });
    } catch (err) {
      console.error('Failed fetching records:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRecords(1);
  };

  const handleViewDetail = async (id, index) => {
    try {
      if (index !== undefined) {
        setSelectedRecordIndex(index);
      }
      const res = await api.getRecordDetail(id);
      setSelectedRecord(res.record);
      setRecordSchema(res.schema);
      setIsDetailOpen(true);
    } catch (err) {
      alert('Failed loading record detail: ' + err.message);
    }
  };

  const handleNavigateDetail = (newIndex) => {
    if (newIndex >= 0 && newIndex < records.length) {
      handleViewDetail(records[newIndex]._id, newIndex);
    }
  };

  const handleOpenRevise = (record) => {
    setRevisionRecord(record);
    setRevisionData({ ...(record.data || {}) });
    setChangeReason('');
    setRevisionError('');
    setIsReviseModalOpen(true);
  };

  const handleSubmitRevision = async (e) => {
    e.preventDefault();
    setRevisionError('');

    if (!changeReason || changeReason.trim().length < 8) {
      setRevisionError('A mandatory change reason (min 8 characters) is required to document this audit revision.');
      return;
    }

    setIsRevising(true);
    try {
      await api.reviseRecord(revisionRecord._id, revisionData, changeReason);
      setIsReviseModalOpen(false);
      fetchRecords(pagination.page);
      alert('Record revision successfully recorded with new version.');
    } catch (err) {
      setRevisionError(err.message || 'Failed to submit revision');
    } finally {
      setIsRevising(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const blob = await api.exportRegisterExcel({
        department: departmentFilter,
        location: locationFilter,
        reportType: reportTypeFilter
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Civet_Data_Register_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  const handleExportPdf = async () => {
    try {
      const blob = await api.exportRegisterPdf({
        department: departmentFilter,
        location: locationFilter,
        reportType: reportTypeFilter
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Civet_Data_Register_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#0F2A4A' }}>Data Register</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExportExcel}>
            <FileSpreadsheet size={13} />
            Export to Excel (.xlsx)
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleExportPdf}>
            <FileText size={13} />
            Export to PDF (.pdf)
          </button>
        </div>
      </div>

      <div className="civet-card" style={{ padding: '12px 14px', border: '1px solid #000000', backgroundColor: '#F8FAFC' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <input
              type="text"
              placeholder="Search by author, project division, keyword..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', height: '30px', paddingLeft: '28px', boxSizing: 'border-box' }}
            />
            <Search size={14} color="#8395A7" style={{ position: 'absolute', left: '8px', top: '8px' }} />
          </div>

          <SearchableSelect
            value={departmentFilter}
            onChange={e => setDepartmentFilter(e?.target ? e.target.value : e)}
            style={{ minWidth: '150px' }}
            options={[
              { value: 'All', label: 'All Departments' },
              ...departments.map(d => ({ value: d.code || d.id, label: d.name }))
            ]}
          />

          <SearchableSelect
            value={locationFilter}
            onChange={e => setLocationFilter(e?.target ? e.target.value : e)}
            style={{ minWidth: '150px' }}
            options={[
              { value: 'All', label: 'All Project Divisions' },
              ...locations.map(l => ({ value: l.name || l.code, label: l.name || l.code }))
            ]}
          />

          <SearchableSelect
            value={reportTypeFilter}
            onChange={e => setReportTypeFilter(e?.target ? e.target.value : e)}
            style={{ minWidth: '170px' }}
            options={[
              { value: 'All', label: 'All Report Types' },
              ...schemas.map(s => ({ value: s.report_type_id || s.reportType, label: s.report_name || s.reportName }))
            ]}
          />

          <button type="submit" className="btn btn-primary btn-sm" style={{ height: '30px' }}>
            <Filter size={12} /> Apply Filter
          </button>
        </form>
      </div>

      <div className="civet-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid #000000' }}>
        <div style={{ padding: '12px 18px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #000000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
          <div>
            <strong style={{ color: '#0F2A4A' }}>Report Type:</strong> <span style={{ color: '#1F6FEB', fontWeight: '700' }}>{REPORT_TYPE_LABELS[reportTypeFilter] || (reportTypeFilter !== 'All' ? reportTypeFilter : 'Fuel Purchase Log')}</span>
            <span style={{ margin: '0 10px', color: '#CBD5E1' }}>|</span>
            <strong style={{ color: '#0F2A4A' }}>Department:</strong> <span style={{ color: '#334155', fontWeight: '600' }}>{departmentFilter !== 'All' ? departmentFilter : 'Plant & Machinery'}</span>
            <span style={{ margin: '0 10px', color: '#CBD5E1' }}>|</span>
            <strong style={{ color: '#0F2A4A' }}>Project Division:</strong> <span style={{ color: '#334155', fontWeight: '600' }}>{locationFilter !== 'All' ? locationFilter : 'All Project Divisions'}</span>
          </div>
          <div style={{ color: '#0F2A4A', fontWeight: '700' }}>
            {pagination.totalRecords || pagination.total || records.length} Records Found
          </div>
        </div>
        <div className="civet-table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="civet-table">
            <thead>
              <tr style={{ backgroundColor: '#0F2A4A', color: '#FFFFFF' }}>
                <th style={{ padding: '8px 10px', border: '1px solid #000000' }}>Date</th>
                <th style={{ padding: '8px 10px', border: '1px solid #000000' }}>Department</th>
                <th style={{ padding: '8px 10px', border: '1px solid #000000' }}>Project Division</th>
                <th style={{ padding: '8px 10px', border: '1px solid #000000' }}>Project Name</th>
                <th style={{ padding: '8px 10px', border: '1px solid #000000' }}>Ledger / Vendor</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', border: '1px solid #000000', backgroundColor: '#B45309' }}>Opening Bal (Rs.)</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', border: '1px solid #000000', backgroundColor: '#6D28D9' }}>Fuel Qty (Ltrs)</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', border: '1px solid #000000', backgroundColor: '#0369A1' }}>Total Cost (Rs.)</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', border: '1px solid #000000', backgroundColor: '#047857' }}>Amount Paid (Rs.)</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', border: '1px solid #000000', backgroundColor: '#B91C1C' }}>Closing Bal (Rs.)</th>
                <th style={{ textAlign: 'center', padding: '8px 10px', border: '1px solid #000000' }}>Payment Type</th>
                <th style={{ textAlign: 'center', padding: '8px 10px', border: '1px solid #000000' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="12" style={{ textAlign: 'center', padding: '24px', color: '#576574', border: '1px solid #000000' }}>
                    Loading register records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="12" style={{ textAlign: 'center', padding: '30px', color: '#8395A7', border: '1px solid #000000' }}>
                    No records found in Data Register matching active criteria.
                  </td>
                </tr>
              ) : (
                records.map((rec, index) => {
                  const pQ = Number(rec.petrol_quantity || (rec.data && rec.data.petrol_quantity) || 0);
                  const pR = Number(rec.petrol_rate || (rec.data && rec.data.petrol_rate) || 0);
                  const dQ = Number(rec.diesel_quantity || (rec.data && rec.data.diesel_quantity) || 0);
                  const dR = Number(rec.diesel_rate || (rec.data && rec.data.diesel_rate) || 0);
                  const fuelLitres = Number(rec.fuel_consumed_litres || (rec.data && rec.data.quantity) || 0);
                  const totalQty = (pQ + dQ) > 0 ? (pQ + dQ) : fuelLitres;
                  const totalRate = (pR + dR) > 0 ? (pR + dR) : Number(rec.rate || (rec.data && rec.data.rate) || 0);

                  const isFuelRec = rec.report_type_id === 'FUEL_PURCHASE' || rec.department_id === 'FUEL' || rec.category === 'Fuel' || Boolean(rec.fuel_type || (rec.data && rec.data.fuel_type));
                  const calculatedFuelCost = (pQ > 0 || dQ > 0) ? ((pQ * pR) + (dQ * dR)) : (totalQty > 0 && totalRate > 0 ? totalQty * totalRate : 0);

                  const hasExplicitPaid = (rec.paid_amount !== undefined && rec.paid_amount !== null && !isNaN(Number(rec.paid_amount))) ||
                    (rec.data && rec.data.paid_amount !== undefined && rec.data.paid_amount !== null && !isNaN(Number(rec.data.paid_amount)));
                  const explicitPaidVal = hasExplicitPaid ? Number(rec.paid_amount ?? rec.data?.paid_amount) : null;

                  const opBal = Number(rec.opening_balance ?? (rec.data && rec.data.opening_balance) ?? 0);
                  const totalCost = Number(rec.total_cost ?? (rec.data && rec.data.total_cost) ?? (calculatedFuelCost > 0 ? calculatedFuelCost : (explicitPaidVal ?? 0)));
                  const paidAmt = explicitPaidVal !== null ? explicitPaidVal : (isFuelRec ? 0 : totalCost);
                  const balanceAmt = Number(rec.closing_balance ?? rec.balance ?? rec.balance_amount ?? (rec.data && (rec.data.closing_balance ?? rec.data.balance ?? rec.data.balance_amount)) ?? Math.max(0, opBal + totalCost - paidAmt));

                  const fuelTypeStr = String(rec.fuel_type || (rec.data && rec.data.fuel_type) || '').trim().toLowerCase();
                  const isBoth = fuelTypeStr === 'both' || (pQ > 0 && dQ > 0);
                  const vendor = rec.vendor_name || (rec.data && (rec.data.ledger_type || rec.data.vendor_name || rec.data.vendor)) || '-';
                  const isMerchant = String(vendor).toLowerCase().includes('merchant');
                  const rawPType = rec.payment_type || (rec.data && rec.data.payment_type) || '';
                  const ccField = rec.cash_and_carry || (rec.data && rec.data.cash_and_carry) || '';
                  const isZeroQtyOrRate = paidAmt > 0 && (totalQty <= 0 || totalRate <= 0);
                  const isCC = isMerchant || String(rawPType).toLowerCase().includes('cash') || (ccField && !['no', 'false', '0', 'none', 'n/a', '-'].includes(String(ccField).trim().toLowerCase())) || isZeroQtyOrRate;
                  const paymentTypeVal = isCC ? 'Cash & Carry' : (rawPType ? (String(rawPType).toLowerCase().includes('card') ? 'Card Payment' : rawPType) : (paidAmt > 0 ? 'Regular / Ledger' : ''));
                  const isCashAndCarry = isCC;
                  const isEven = index % 2 === 0;

                  return (
                    <tr key={rec._id} style={{ borderBottom: '1px solid #000000' }}>
                      <td style={{ fontWeight: '600', whiteSpace: 'nowrap', backgroundColor: isEven ? '#FFFFFF' : '#F8FAFC', border: '1px solid #000000' }}>{formatDateDisplay(rec.report_date)}</td>
                      <td style={{ fontWeight: '600', color: '#0F2A4A', backgroundColor: isEven ? '#FFFFFF' : '#F8FAFC', border: '1px solid #000000' }}>{rec.department_name || rec.department_id || 'Plant & Machinery'}</td>
                      <td style={{ fontWeight: '600', backgroundColor: isEven ? '#FFFFFF' : '#EFF6FF', border: '1px solid #000000' }}>{rec.project_division || rec.location_name || rec.location_id}</td>
                      <td style={{ color: '#0F2A4A', backgroundColor: isEven ? '#FFFFFF' : '#F8FAFC', border: '1px solid #000000' }}>{rec.project_name || rec.site_name || (rec.data && (rec.data.project_name || rec.data.site_name)) || '-'}</td>
                      <td style={{ color: '#0F2A4A', backgroundColor: isEven ? '#FFFFFF' : '#F8FAFC', border: '1px solid #000000' }}>{vendor}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: '600', color: '#92400E', backgroundColor: isEven ? '#FEF9C3' : '#FEF08A', border: '1px solid #000000' }}>
                        {opBal > 0 ? ('Rs. ' + Math.round(opBal).toLocaleString('en-IN')) : '-'}
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: '600', color: '#6D28D9', backgroundColor: isEven ? '#F3E8FF' : '#DDD6FE', border: '1px solid #000000' }}>
                        {isBoth ? (
                          <span>P: {pQ.toLocaleString('en-IN')}L | D: {dQ.toLocaleString('en-IN')}L</span>
                        ) : totalQty > 0 ? (
                          `${totalQty.toLocaleString('en-IN')} L`
                        ) : '-'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '600', color: '#0369A1', fontVariantNumeric: 'tabular-nums', backgroundColor: isEven ? '#E0F2FE' : '#BAE6FD', border: '1px solid #000000' }}>
                        {totalCost > 0 ? ('Rs. ' + totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) : '-'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '700', color: '#047857', fontVariantNumeric: 'tabular-nums', backgroundColor: isEven ? '#DCFCE7' : '#BBF7D0', border: '1px solid #000000' }}>
                        {paidAmt > 0 ? ('Rs. ' + paidAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) : '-'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '700', color: '#B91C1C', fontVariantNumeric: 'tabular-nums', backgroundColor: isEven ? '#FEE2E2' : '#FECDD3', border: '1px solid #000000' }}>
                        {balanceAmt > 0 ? ('Rs. ' + balanceAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) : '-'}
                      </td>
                      <td style={{ textAlign: 'center', backgroundColor: isEven ? '#FFF7ED' : '#FED7AA', border: '1px solid #000000' }}>
                        {paymentTypeVal ? (
                          <span style={{ color: isCashAndCarry ? '#B45309' : '#0F2A4A', fontWeight: isCashAndCarry ? '700' : '600' }}>
                            {paymentTypeVal}
                          </span>
                        ) : '-'}
                      </td>
                      <td style={{ textAlign: 'center', backgroundColor: isEven ? '#FFFFFF' : '#F8FAFC', border: '1px solid #000000' }}>
                        <div style={{ display: 'inline-flex', gap: '4px' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0 6px', height: '22px' }}
                            title="View Details & Audit Trail"
                            onClick={() => handleViewDetail(rec._id, index)}
                          >
                            <Eye size={11} /> Detail
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0 6px', height: '22px' }}
                            title="Audited Revision"
                            onClick={() => handleOpenRevise(rec)}
                          >
                            <Edit3 size={11} /> Revise
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {records.length > 0 && (() => {
              const totalCost = records.reduce((sum, r) => {
                const isBoth = String(r.fuel_type || r.data?.fuel_type || '').toLowerCase().includes('both');
                const pQ = Number(r.petrol_quantity || r.data?.petrol_quantity || 0);
                const pR = Number(r.petrol_rate || r.data?.petrol_rate || 0);
                const dQ = Number(r.diesel_quantity || r.data?.diesel_quantity || 0);
                const dR = Number(r.diesel_rate || r.data?.diesel_rate || 0);
                const bothCost = (isBoth && (pQ > 0 || dQ > 0)) ? ((pQ * pR) + (dQ * dR)) : 0;
                const cost = Number(r.total_cost ?? r.data?.total_cost ?? (bothCost > 0 ? bothCost : (r.paid_amount ?? r.data?.paid_amount ?? 0)));
                return sum + cost;
              }, 0);

              const totalPaid = records.reduce((sum, r) => {
                if (r.paid_amount !== undefined && r.paid_amount !== null && !isNaN(Number(r.paid_amount))) {
                  return sum + Number(r.paid_amount);
                }
                if (r.data?.paid_amount !== undefined && r.data?.paid_amount !== null && !isNaN(Number(r.data?.paid_amount))) {
                  return sum + Number(r.data?.paid_amount);
                }
                const isFuel = r.report_type_id === 'FUEL_PURCHASE' || r.department_id === 'FUEL' || r.category === 'Fuel' || Boolean(r.fuel_type || r.data?.fuel_type);
                return sum + (isFuel ? 0 : Number(r.total_cost || r.data?.total_cost || r.cash_and_carry || 0));
              }, 0);

              const totalQty = records.reduce((sum, r) => {
                const pQ = Number(r.petrol_quantity || (r.data && r.data.petrol_quantity) || 0);
                const dQ = Number(r.diesel_quantity || (r.data && r.data.diesel_quantity) || 0);
                const combined = (pQ > 0 || dQ > 0) ? (pQ + dQ) : 0;
                return sum + Number(r.fuel_consumed_litres || combined || (r.data && r.data.quantity) || 0);
              }, 0);

              const totalOpBal = records.reduce((sum, r) => sum + Number(r.opening_balance ?? r.data?.opening_balance ?? 0), 0);
              const totalClosingBal = records.reduce((sum, r) => {
                const op = Number(r.opening_balance ?? r.data?.opening_balance ?? 0);
                const isBoth = String(r.fuel_type || r.data?.fuel_type || '').toLowerCase().includes('both');
                const pQ = Number(r.petrol_quantity || r.data?.petrol_quantity || 0);
                const pR = Number(r.petrol_rate || r.data?.petrol_rate || 0);
                const dQ = Number(r.diesel_quantity || r.data?.diesel_quantity || 0);
                const dR = Number(r.diesel_rate || r.data?.diesel_rate || 0);
                const bothCost = (isBoth && (pQ > 0 || dQ > 0)) ? ((pQ * pR) + (dQ * dR)) : 0;
                const cost = Number(r.total_cost ?? r.data?.total_cost ?? (bothCost > 0 ? bothCost : (r.paid_amount ?? r.data?.paid_amount ?? 0)));
                const paid = Number(r.paid_amount ?? r.data?.paid_amount ?? 0);
                const cl = Number(r.closing_balance ?? r.balance ?? r.data?.closing_balance ?? Math.max(0, op + cost - paid));
                return sum + cl;
              }, 0);

              return (
                <tfoot>
                  <tr style={{ backgroundColor: '#F1F5F9', borderTop: '2px solid #0F2A4A', fontWeight: '700' }}>
                    <td colSpan="5" style={{ color: '#0F2A4A' }}>FINAL TOTAL ({records.length} Records)</td>
                    <td style={{ textAlign: 'right', color: '#0F2A4A' }}>
                      {totalOpBal > 0 ? ('Rs. ' + Math.round(totalOpBal).toLocaleString('en-IN')) : '-'}
                    </td>
                    <td style={{ textAlign: 'right', color: '#0F2A4A' }}>
                      {totalQty > 0 ? `${Math.round(totalQty).toLocaleString('en-IN')} L` : '-'}
                    </td>
                    <td style={{ textAlign: 'right', color: '#0F2A4A' }}>
                      Rs. {totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'right', color: '#1F6FEB' }}>
                      Rs. {totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'right', color: '#0F2A4A' }}>
                      Rs. {totalClosingBal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'center', color: '#576574' }}>-</td>
                    <td style={{ textAlign: 'center', color: '#576574' }}>-</td>
                  </tr>
                </tfoot>
              );
            })()}
          </table>
        </div>

        <TablePagination
          currentPage={pagination.page}
          totalItems={pagination.total}
          pageSize={pagination.limit}
          onPageChange={(p) => fetchRecords(p)}
        />
      </div>

      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Record Detail & Audit Trail (Version ${selectedRecord?.version || 1})`}
        maxWidth="700px"
      >
        {selectedRecord && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 12px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #000000',
              borderRadius: '4px',
              fontSize: '11px'
            }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={selectedRecordIndex === null || selectedRecordIndex <= 0}
                onClick={() => handleNavigateDetail(selectedRecordIndex - 1)}
              >
                <ChevronLeft size={12} /> Previous Record
              </button>
              <span style={{ fontWeight: '700', color: '#0F2A4A' }}>
                Record {(selectedRecordIndex !== null ? selectedRecordIndex : 0) + 1} of {records.length}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={selectedRecordIndex === null || selectedRecordIndex >= records.length - 1}
                onClick={() => handleNavigateDetail(selectedRecordIndex + 1)}
              >
                Next Record <ChevronRight size={12} />
              </button>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
              gap: '8px',
              padding: '10px 12px',
              backgroundColor: '#F4F6F9',
              borderRadius: '4px',
              border: '1px solid #D9DEE5',
              fontSize: '11px'
            }}>
              <div>
                <span style={{ color: '#8395A7', display: 'block' }}>Report Date</span>
                <strong>{formatDateDisplay(selectedRecord.report_date)}</strong>
              </div>
              <div>
                <span style={{ color: '#8395A7', display: 'block' }}>Department</span>
                <strong>{selectedRecord.department_id}</strong>
              </div>
              <div>
                <span style={{ color: '#8395A7', display: 'block' }}>Project Division</span>
                <strong>{selectedRecord.project_division || selectedRecord.location_name || selectedRecord.location_id}</strong>
              </div>
              <div>
                <span style={{ color: '#8395A7', display: 'block' }}>Project Name</span>
                <strong>{selectedRecord.project_name || selectedRecord.site_name || (selectedRecord.data && (selectedRecord.data.project_name || selectedRecord.data.site_name)) || '-'}</strong>
              </div>
              <div>
                <span style={{ color: '#8395A7', display: 'block' }}>Created By</span>
                <strong style={{ fontSize: '10.5px' }}>{selectedRecord.created_by}</strong>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '12.5px', fontWeight: '600', color: '#0F2A4A', marginBottom: '8px' }}>
                Field Values
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '8px',
                padding: '12px',
                border: '1px solid #EAEFF5',
                borderRadius: '4px',
                backgroundColor: '#FFFFFF'
              }}>
                {Object.entries(selectedRecord.data || {})
                  .filter(([key]) => !['_id', 'id', 'history', 'created_at', 'updated_at', '__v', 'status', 'version', 'source', 'batch_id', 'is_latest'].includes(key))
                  .map(([key, val]) => {
                    let displayVal;
                    if (typeof val === 'object' && val !== null) {
                      displayVal = JSON.stringify(val);
                    } else if (key.includes('date')) {
                      displayVal = formatDateDisplay(val);
                    } else {
                      displayVal = String(val ?? '');
                    }
                    return (
                      <div key={key} style={{ fontSize: '11.5px' }}>
                        <span style={{ color: '#576574', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}:</span>{' '}
                        <strong style={{ color: '#0F2A4A' }}>{displayVal}</strong>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '12.5px', fontWeight: '600', color: '#0F2A4A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <History size={14} /> Version Audit History
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(selectedRecord.history || []).map((auditItem, idx) => (
                  <div key={idx} style={{
                    padding: '8px 12px',
                    borderLeft: '3px solid #1F6FEB',
                    backgroundColor: '#FAFCFE',
                    border: '1px solid #D9DEE5',
                    borderRadius: '3px',
                    fontSize: '11px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '600', color: '#0F2A4A' }}>Version {auditItem.version}</span>
                      <span style={{ color: '#8395A7' }}>{formatDateTimeDisplay(auditItem.modified_at || selectedRecord.created_at)}</span>
                    </div>
                    <div style={{ color: '#576574' }}>
                      Modified by: <strong>{auditItem.modified_by}</strong>
                    </div>
                    <div style={{ color: '#1C2733', marginTop: '4px', fontStyle: 'italic' }}>
                      Reason: "{auditItem.change_reason || 'Initial entry'}"
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isReviseModalOpen}
        onClose={() => setIsReviseModalOpen(false)}
        title={`Audited Revision: Record v${revisionRecord?.version || 1} -> v${(revisionRecord?.version || 1) + 1}`}
        maxWidth="620px"
      >
        {revisionRecord && (
          <form onSubmit={handleSubmitRevision} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '11.5px', color: '#576574' }}>
              All modifications are permanently logged with your user signature. Enter updated values and state a clear reason for the audit record.
            </p>

            {revisionError && (
              <div style={{ padding: '8px 10px', background: '#FBEFEB', color: '#C8423A', border: '1px solid #F3C3C0', borderRadius: '4px', fontSize: '11px' }}>
                {revisionError}
              </div>
            )}

            <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.keys(revisionData)
                .filter(k => !['_id', 'id', 'history', 'created_at', 'updated_at', '__v', 'status', 'version', 'source', 'batch_id', 'is_latest'].includes(k))
                .map(k => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ width: '140px', fontSize: '11px', fontWeight: '600', color: '#576574', textTransform: 'capitalize' }}>
                      {k.replace(/_/g, ' ')}:
                    </label>
                    <input
                      type="text"
                      value={typeof revisionData[k] === 'object' && revisionData[k] !== null ? JSON.stringify(revisionData[k]) : (revisionData[k] ?? '')}
                      onChange={e => setRevisionData({ ...revisionData, [k]: e.target.value })}
                      style={{ flex: 1, height: '28px' }}
                    />
                  </div>
                ))}
            </div>

            <div style={{ borderTop: '1px solid #EAEFF5', paddingTop: '10px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#0F2A4A', marginBottom: '4px' }}>
                Mandatory Change Reason <span style={{ color: '#C8423A' }}>*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="Explain the operational reason, correction details, or justification for modifying this record (min 8 characters)..."
                value={changeReason}
                onChange={e => setChangeReason(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsReviseModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={isRevising}
              >
                {isRevising ? 'Saving Revision...' : 'Save & Publish Revision'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
