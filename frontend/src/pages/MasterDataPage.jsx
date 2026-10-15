import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Wrench, 
  Package, 
  Users, 
  Layers, 
  Plus, 
  Edit2, 
  Trash2, 
  KeyRound,
  Fuel,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  Eye,
  CreditCard
} from 'lucide-react';
import Modal from '../components/Modal';
import SearchableSelect from '../components/SearchableSelect';
import TablePagination from '../components/TablePagination';
import RecordPreviewModal from '../components/RecordPreviewModal';
import { formatDateDisplay } from '../utils/dateUtils';
import { api } from '../services/api';

const CONFIGURATION_SECTIONS = [
  { id: 'departments', label: 'Departments', icon: Building2 },
  { id: 'locations', label: 'Cost Centers', icon: MapPin },
  { id: 'fuel-types', label: 'Fuel Types', icon: Fuel },
  { id: 'payment-types', label: 'Payment Types', icon: CreditCard },
  { id: 'equipment-types', label: 'Equipment Types', icon: Wrench },
  { id: 'assets', label: 'Assets & Machinery', icon: Wrench },
  { id: 'materials', label: 'Material Items', icon: Package },
  { id: 'vendors', label: 'Approved Vendors', icon: Users },
  { id: 'service-types', label: 'Service Types', icon: Layers },
  { id: 'users', label: 'User Accounts & Roles', icon: Users }
];

const USER_ROLES = [
  'Director',
  'Admin',
  'Management',
  'Site Incharge',
  'HOD',
  'Executive',
  'Data Entry'
];

function formatItemCode(item, tab, index) {
  const candidate = item.code || item.asset_code || item.item_code || item.report_type_id || item.id;
  if (candidate && !/^[0-9a-fA-F]{24}$/.test(String(candidate))) {
    return candidate;
  }
  const prefixMap = {
    vendors: 'VND',
    locations: 'LOC',
    'fuel-types': 'FUL',
    'payment-types': 'PAY',
    'equipment-types': 'EQP',
    assets: 'AST',
    materials: 'MAT',
    'service-types': 'SRV',
    departments: 'DPT'
  };
  const prefix = prefixMap[tab] || 'REF';
  return `${prefix}-${String(index + 1).padStart(4, '0')}`;
}

export default function MasterDataPage({ currentUser, initialTab, openAdd }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'locations');
  const [entityItems, setEntityItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [deptOptions, setDeptOptions] = useState([]);
  const [locOptions, setLocOptions] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formFields, setFormFields] = useState({});

  const [resetUser, setResetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResetOpen, setIsResetOpen] = useState(false);

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkError, setBulkError] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [previewIndex, setPreviewIndex] = useState(null);

  useEffect(() => {
    setCurrentPage(1);
    fetchActiveSectionItems();
  }, [activeTab]);

  useEffect(() => {
    loadAuxOptions();
  }, []);

  useEffect(() => {
    if (openAdd) {
      handleOpenAdd();
    }
  }, [openAdd]);

  async function loadAuxOptions() {
    try {
      const [dList, lList] = await Promise.all([
        api.getMaster('departments').catch(() => []),
        api.getMaster('locations').catch(() => [])
      ]);
      setDeptOptions(dList.map(d => d.name || d.code).filter(Boolean));
      setLocOptions(lList.map(l => l.name || l.code).filter(Boolean));
    } catch {}
  }

  async function fetchActiveSectionItems() {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const res = await api.getUsers();
        setEntityItems(res);
      } else {
        const res = await api.getMaster(activeTab);
        setEntityItems(res);
      }
    } catch (err) {
      console.error('Failed loading master tab items:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenAdd = async () => {
    setEditingItem(null);
    let autoCode = '';
    if (activeTab !== 'users') {
      try {
        const next = await api.getMasterNextCode(activeTab);
        autoCode = next?.code || '';
      } catch (e) {
        const prefixMap = {
          vendors: 'VND',
          locations: 'LOC',
          'fuel-types': 'FUL',
          'payment-types': 'PAY',
          'equipment-types': 'EQP',
          assets: 'AST',
          materials: 'MAT',
          'service-types': 'SRV',
          departments: 'DPT'
        };
        const p = prefixMap[activeTab] || 'REF';
        autoCode = `${p}-${String(entityItems.length + 1).padStart(4, '0')}`;
      }
    }
    setFormFields({
      code: autoCode,
      role: 'Executive',
      department: 'All',
      location: 'All'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item, index = 0) => {
    setEditingItem(item);
    setFormFields({
      ...item,
      code: formatItemCode(item, activeTab, index),
      role: item.role || 'Executive',
      department: item.department_id || item.department || 'All',
      location: item.location_id || item.location || 'All'
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (activeTab === 'users') {
        if (editingItem) {
          await api.setUserStatus(editingItem._id, formFields.isActive);
        } else {
          await api.createUser(formFields);
        }
      } else {
        if (editingItem) {
          await api.updateMaster(activeTab, editingItem._id, formFields);
        } else {
          await api.createMaster(activeTab, formFields);
        }
      }
      setIsModalOpen(false);
      fetchActiveSectionItems();
      window.dispatchEvent(new CustomEvent('civet_master_updated'));
    } catch (err) {
      alert(err.message || 'Failed saving item');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this master data item?')) return;
    try {
      await api.deleteMaster(activeTab, id);
      fetchActiveSectionItems();
      window.dispatchEvent(new CustomEvent('civet_master_updated'));
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.resetUserPassword(resetUser._id, newPassword);
      alert('Password successfully reset.');
      setIsResetOpen(false);
      setNewPassword('');
    } catch (err) {
      alert('Reset failed: ' + err.message);
    }
  };

  const handleExportExcel = async () => {
    try {
      const blob = activeTab === 'users' ? await api.exportUsersExcel() : await api.exportMasterExcel(activeTab);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Civet_Master_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`;
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
      const blob = activeTab === 'users' ? await api.exportUsersPdf() : await api.exportMasterPdf(activeTab);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Civet_Master_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = activeTab === 'users' ? await api.getUsersTemplate() : await api.getMasterTemplate(activeTab);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Civet_${activeTab}_template.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      alert('Failed to download template: ' + err.message);
    }
  };

  const handleBulkImportSubmit = async (e) => {
    e.preventDefault();
    if (!bulkFile) {
      setBulkError('Please select an Excel (.xlsx) file to upload.');
      return;
    }
    setBulkUploading(true);
    setBulkError('');
    setBulkResult(null);
    try {
      const res = activeTab === 'users' ? await api.bulkImportUsers(bulkFile) : await api.bulkImportMaster(activeTab, bulkFile);
      setBulkResult(res);
      setBulkFile(null);
      fetchActiveSectionItems();
      window.dispatchEvent(new CustomEvent('civet_master_updated'));
    } catch (err) {
      setBulkError(err.message || 'Import failed');
    } finally {
      setBulkUploading(false);
    }
  };

  const currentTabLabel = CONFIGURATION_SECTIONS.find(t => t.id === activeTab)?.label || 'Entity';

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#0F2A4A' }}>Master Data & Configurations</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExportExcel} title="Export tab records to Excel">
            <FileSpreadsheet size={13} />
            Export to Excel
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleExportPdf} title="Export tab records to PDF">
            <FileText size={13} />
            Export to PDF
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setIsBulkModalOpen(true);
              setBulkResult(null);
              setBulkError('');
              setBulkFile(null);
            }}
            title="Bulk import from Excel"
          >
            <Upload size={13} />
            Bulk Import
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
            <Plus size={13} />
            Add New {currentTabLabel.slice(0, -1)}
          </button>
        </div>
      </div>

      <div className="civet-tab-bar">
        {CONFIGURATION_SECTIONS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`civet-tab-btn ${isActive ? 'active' : ''}`}
            >
              <Icon size={13} color={isActive ? '#1F6FEB' : '#576574'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="civet-card" style={{ padding: 0 }}>
        <div className="civet-table-container" style={{ border: 'none' }}>
          <table className="civet-table">
            <thead>
              <tr>
                {activeTab === 'users' ? (
                  <>
                    <th>Email Address</th>
                    <th>Full Name</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Location / Site</th>
                    <th>Created Date</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </>
                ) : (
                  <>
                    <th>Code / Identifier</th>
                    <th>Name / Description</th>
                    <th>Category / Type</th>
                    <th>Created Date</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#576574' }}>
                    Loading master data records...
                  </td>
                </tr>
              ) : entityItems.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#8395A7' }}>
                    No items in this master collection. Click "Add New" or "Bulk Import" above to configure.
                  </td>
                </tr>
              ) : (
                entityItems.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((item, index) => {
                  const globalIndex = (currentPage - 1) * pageSize + index;
                  return (
                    <tr key={item._id || globalIndex}>
                      {activeTab === 'users' ? (
                        <>
                          <td style={{ fontWeight: '600', color: '#0F2A4A' }}>{item.email}</td>
                          <td>{item.full_name || item.fullName}</td>
                          <td>{item.role}</td>
                          <td>{item.department_id || item.department || 'All'}</td>
                          <td>{item.location_id || item.location || 'All'}</td>
                          <td style={{ textAlign: 'center', color: '#576574' }}>
                            {formatDateDisplay(item.created_at || new Date())}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '4px' }}>
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ height: '22px', padding: '0 6px' }}
                                onClick={() => setPreviewIndex(globalIndex)}
                                title="Preview Details"
                              >
                                <Eye size={11} />
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ height: '22px', padding: '0 6px' }}
                                onClick={() => { setResetUser(item); setIsResetOpen(true); }}
                                title="Reset Password"
                              >
                                <KeyRound size={11} /> Reset Pwd
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ fontWeight: '600', color: '#0F2A4A' }}>
                            {formatItemCode(item, activeTab, globalIndex)}
                          </td>
                          <td>{item.name || item.full_name || item.report_name}</td>
                          <td style={{ color: '#576574' }}>{item.category || item.unit || item.department_id || '-'}</td>
                          <td style={{ textAlign: 'center', color: '#576574' }}>
                            {formatDateDisplay(item.created_at || new Date())}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '4px' }}>
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ height: '22px', padding: '0 6px' }}
                                onClick={() => setPreviewIndex(globalIndex)}
                                title="Preview Details"
                              >
                                <Eye size={11} />
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ height: '22px', padding: '0 6px' }}
                                onClick={() => handleOpenEdit(item, globalIndex)}
                              >
                                <Edit2 size={11} />
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                style={{ height: '22px', padding: '0 6px' }}
                                onClick={() => handleDelete(item._id)}
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <TablePagination
          currentPage={currentPage}
          totalRecords={entityItems.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`${editingItem ? 'Edit' : 'Add New'} ${currentTabLabel.slice(0, -1)}`}
        maxWidth="500px"
      >
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activeTab === 'users' ? (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>Email Address *</label>
                <input
                  type="email"
                  required
                  disabled={Boolean(editingItem)}
                  value={formFields.email || ''}
                  onChange={e => setFormFields({ ...formFields, email: e.target.value })}
                  style={{ width: '100%', height: '30px' }}
                />
              </div>
              {!editingItem && (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>Password *</label>
                  <input
                    type="password"
                    required
                    value={formFields.password || ''}
                    onChange={e => setFormFields({ ...formFields, password: e.target.value })}
                    style={{ width: '100%', height: '30px' }}
                  />
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={formFields.fullName || formFields.full_name || ''}
                  onChange={e => setFormFields({ ...formFields, fullName: e.target.value, full_name: e.target.value })}
                  style={{ width: '100%', height: '30px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>Role *</label>
                <SearchableSelect
                  value={formFields.role || 'Executive'}
                  onChange={val => {
                    const v = val?.target ? val.target.value : (val?.value !== undefined ? val.value : val);
                    setFormFields({ ...formFields, role: v });
                  }}
                  options={USER_ROLES}
                  placeholder="Select or search role..."
                  style={{ width: '100%', height: '30px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>Department Scope</label>
                <SearchableSelect
                  value={formFields.department || formFields.department_id || 'All'}
                  onChange={val => {
                    const v = val?.target ? val.target.value : (val?.value !== undefined ? val.value : val);
                    setFormFields({ ...formFields, department: v, department_id: v });
                  }}
                  options={['All', ...deptOptions]}
                  placeholder="Select or search department..."
                  style={{ width: '100%', height: '30px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>Location / Site Scope</label>
                <SearchableSelect
                  value={formFields.location || formFields.location_id || 'All'}
                  onChange={val => {
                    const v = val?.target ? val.target.value : (val?.value !== undefined ? val.value : val);
                    setFormFields({ ...formFields, location: v, location_id: v });
                  }}
                  options={['All', ...locOptions]}
                  placeholder="Select or search location..."
                  style={{ width: '100%', height: '30px' }}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>Code / Identifier (Auto-generated) *</label>
                <input
                  type="text"
                  required
                  value={formFields.code || formFields.asset_code || formFields.report_type_id || ''}
                  onChange={e => setFormFields({ ...formFields, code: e.target.value })}
                  placeholder="Auto-generated in 0001 series"
                  style={{ width: '100%', height: '30px', backgroundColor: '#F8FAFC' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>Name / Title *</label>
                <input
                  type="text"
                  required
                  value={formFields.name || formFields.report_name || ''}
                  onChange={e => setFormFields({ ...formFields, name: e.target.value })}
                  style={{ width: '100%', height: '30px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>Category / Notes</label>
                <input
                  type="text"
                  value={formFields.category || ''}
                  onChange={e => setFormFields({ ...formFields, category: e.target.value })}
                  style={{ width: '100%', height: '30px' }}
                />
              </div>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              Save
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        title={`Reset Password for ${resetUser?.email}`}
        maxWidth="400px"
      >
        <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>New Password *</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              style={{ width: '100%', height: '30px' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsResetOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              Set Password
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title={`Bulk Import: ${currentTabLabel}`}
        maxWidth="520px"
      >
        <form onSubmit={handleBulkImportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{
            padding: '12px 14px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #000000',
            borderRadius: '4px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#0F2A4A' }}>Download Official Template</div>
              <div style={{ fontSize: '11px', color: '#576574' }}>Contains the exact column structure for {currentTabLabel}</div>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleDownloadTemplate}
              style={{ height: '28px' }}
            >
              <Download size={13} />
              Template (.xlsx)
            </button>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '6px' }}>
              Select Excel File (.xlsx, .csv) *
            </label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={e => {
                setBulkFile(e.target.files?.[0] || null);
                setBulkError('');
                setBulkResult(null);
              }}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #000000',
                borderRadius: '4px',
                backgroundColor: '#FFFFFF',
                fontSize: '11.5px'
              }}
            />
            {bulkFile && (
              <div style={{ fontSize: '11px', color: '#1F6FEB', marginTop: '4px', fontWeight: '500' }}>
                Selected: {bulkFile.name} ({(bulkFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          {bulkResult && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              backgroundColor: '#EAF8F1',
              border: '1px solid #000000',
              borderRadius: '4px',
              color: '#2E9E6B',
              fontSize: '11.5px'
            }}>
              <CheckCircle2 size={16} />
              <span>{bulkResult.message || `Successfully processed: ${bulkResult.insertedCount} inserted.`}</span>
            </div>
          )}

          {bulkError && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              backgroundColor: '#FBEFEB',
              border: '1px solid #000000',
              borderRadius: '4px',
              color: '#C8423A',
              fontSize: '11.5px'
            }}>
              <AlertCircle size={16} />
              <span>{bulkError}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsBulkModalOpen(false)}
            >
              Close
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={bulkUploading || !bulkFile}
            >
              {bulkUploading ? 'Importing...' : 'Upload & Import Records'}
            </button>
          </div>
        </form>
      </Modal>

      <RecordPreviewModal
        isOpen={previewIndex !== null}
        onClose={() => setPreviewIndex(null)}
        records={entityItems}
        currentIndex={previewIndex !== null ? previewIndex : 0}
        onNavigate={setPreviewIndex}
        title={`${currentTabLabel} Record Details`}
      />
    </div>
  );
}
