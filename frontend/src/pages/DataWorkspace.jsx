import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  RefreshCw,
  Fuel,
  Eye
} from 'lucide-react';
import { api } from '../services/api';
import SearchableSelect from '../components/SearchableSelect';
import TablePagination from '../components/TablePagination';
import RecordPreviewModal from '../components/RecordPreviewModal';
import { formatDateDisplay } from '../utils/dateUtils';

const DEFAULT_TARGET_DEPTS = [
  'Plant & Machinery',
  'Administration',
  'Project Planning',
  'IT & MIS',
  'Civil & Construction',
  'Safety & Quality'
];

const DEFAULT_SERVICE_TYPES = [
  'Printing',
  'Equipment Rental & Dry Lease',
  'Fuel & Oil Supply',
  'Civil Subcontracting',
  'Maintenance & Spares',
  'Transportation & Logistics',
  'Security & Housekeeping',
  'Consulting & Structural Design',
  'IT & Office Automation',
  'Raw Materials & Cement',
  'Labour & Manpower',
  'Utilities & Water',
  'Other Services'
];

const DEFAULT_PAYMENT_CATEGORIES = [
  'Bank Transfer',
  'Cheque',
  'RTGS / NEFT',
  'Cash',
  'Advance Payment',
  'Running Account (RA) Bill',
  'Final Settlement',
  'Material Purchase',
  'Fuel Expense',
  'Equipment Hire',
  'Maintenance',
  'Utilities',
  'Staff Expense',
  'Statutory / Tax Payment',
  'Other'
];

const DEFAULT_EQUIPMENT_TYPES = [
  'Hydraulic Excavator',
  'Tipper Truck / Dumper',
  'Tower / Mobile Crane',
  'Silent Diesel Generator',
  'Soil Compactor Roller',
  'Transit Concrete Mixer',
  'Motor Grader',
  'Backhoe Loader',
  'Wheel Loader',
  'Crawler Tractor / Dozer',
  'Other Equipment'
];

const DEFAULT_MATERIAL_CATEGORIES = [
  'Fuel',
  'Raw Materials',
  'Concrete',
  'Lubricants',
  'Safety / PPE',
  'Spares',
  'Consumables',
  'Tools & Hardware',
  'Other'
];

const DEFAULT_UOM_LIST = [
  'MT',
  'Bags',
  'Ltrs',
  'Cum',
  'Nos',
  'Kgs',
  'Sq.m',
  'Rmt',
  'Trip',
  'Hours'
];

const DEFAULT_FUEL_TYPES = [
  'Diesel',
  'Petrol',
  'Both',
  'Diesel (HSD)',
  'Engine Oil',
  'Hydraulic Oil',
  'Lubricants / Grease'
];

const DEFAULT_PAYMENT_TYPES = [
  'Card Payment',
  'Cash and Carry',
  'Bank Transfer / NEFT',
  'Cheque'
];

const SITE_BUNKS_MAP = {
  'Almela': ['Shiddeshwar Petroleums'],
  'Amalapuram': ['Sathya Filling Station'],
  'Ankalgi': ['Shiv ganga', 'Nirwani Petroleums', 'Niwarini pertoliam'],
  'Borgaon': ['Aadisagar Petrolium'],
  'Chadchan': ['Khavekar Petrolium'],
  'Chellakere': ['Shivaganga Service Station', 'Chellakere Fuel Bunk', 'Sri Vishnu Baba Petroleum'],
  'Chennagiri': ['Chennagiri Fuel Bunk'],
  'Devarakhadra': ['Kurumurthy Swami  F/S', 'M/S. Sri Rama Filling Station', 'JSASFuel Genie India Pvt.Ltd'],
  'Dindi': ['Akarapu Balakistamma Fillling', 'Dindi Fuel Bunk'],
  'Gajendragada': ['Vanasri Petrol Pump'],
  'Ghattaprabha': ['Vivek Petrol Pump', 'Shri Deshpande Petrolum', 'Manikeri Petroleums'],
  'Gokak': ['AJ Petrolinks', 'Manikeri Petroleums'],
  'Guttal': ['Taware filling station'],
  'HO(DG)': ['JSASFuel Genie India Pvt.Ltd'],
  'Haveri': ['Shivalingeshwar Petroleum', 'M/s Magavi City Fuels'],
  'Hiriyur VJNL': ['Sri Balaji Agencies'],
  'Hiriyur': ['Sri Balaji Agencies'],
  'Hosadurga': ['Shree Veeraprathap Fuel', 'Merchant Petroliums'],
  'Jadcherla': ['JSASFuel Genie India Pvt.Ltd', 'Shree Poornima F/S', 'Sai Baba Fuel Station', 'ADHOC FILLING STATION STATION', 'Bhavani Filling Station', 'Uttara Enterprises', 'Bhavani  KSK Fuel Station-Nawabpet', 'Cash Purchase'],
  'Jedcherla': ['JSASFuel Genie India Pvt.Ltd', 'Shree Poornima F/S', 'Sai Baba Fuel Station', 'ADHOC FILLING STATION STATION', 'Bhavani Filling Station', 'Uttara Enterprises', 'Bhavani  KSK Fuel Station-Nawabpet', 'Cash Purchase'],
  'Jalgaon': ['Sri Sai Petrol Pump'],
  'Kabbur': ['Shri Jai Hanuman Petrolium'],
  'Kadur': ['Vishal Service Station'],
  'Khammam': ['Divya laxmi ganapathi', 'Jayasai union bunk', 'Lakshmi Manikanta Filling Station', 'Sri Ramakotaiah Fuel Point', 'Balaji Service Station'],
  'Khanapur': ['V.V.Varde', 'J K Makavi'],
  'Kumta': ['Krishma fuel station', 'Krishna fuel station'],
  'MKBD': ['Shree Sai Samarth Petroleum'],
  'Madanapalli': ['Madanapalli Fuel Bunk', 'Sri Mallikarjuna Traders'],
  'Malebennur': ['Sri Ramanjuneya Service Station'],
  'Molakamuru': ['Sri Lakshmi Venkateshwara Filling Station'],
  'Muddebihal': ['PS NAGATHAN PETROLIUM', 'Bhosle Service Station'],
  'Munavalli': ['Shri Daneshwari', 'Shahapur Petroleum'],
  'Nalatwad': ['Shri Pawad Basaweshwar Petroleums'],
  'Rattihali': ['Shiva Oil Traders', 'Shree Siri Gowari petroliam'],
  'Sangareddy': ['Sangareddy', 'Shree lakshmi ganapathi F/S', 'Sree Shiva Parvathi Filling Station', 'Sri Durgabhavani Filling Station', 'Laxmi Narasimha Enterprises F/S'],
  'Shankeshwar': ['SR Patil'],
  'Sindagi': ['G.P.PORWAL', 'Shiddeshwar Petroleums'],
  'Srirangapatna': ['Sri Chakra Fuel Station', 'Anupama F/S'],
  'Talikote': ['Raykar Oil Agencies'],
  'Ugar, Kudichi': ['Shiri Bhrhmanath Petrolium'],
  'YG Gudda': ['Pankaja HP Fuel Center', 'Pallavi Petrolium']
};

function formatRecordSummary(data) {
  if (!data || typeof data !== 'object') return '-';
  const parts = [];
  if (data.ledger_type || data.vendor_name || data.vendor) parts.push(String(data.ledger_type || data.vendor_name || data.vendor));
  if (data.item_name || data.material_name) parts.push(String(data.item_name || data.material_name));
  if (data.fuel_type) {
    const isBoth = String(data.fuel_type).toLowerCase().includes('both');
    if (isBoth && (data.petrol_quantity || data.diesel_quantity)) {
      parts.push(`Both [Petrol: ${data.petrol_quantity || 0}L @ Rs.${data.petrol_rate || 0} • Diesel: ${data.diesel_quantity || 0}L @ Rs.${data.diesel_rate || 0}]`);
    } else {
      parts.push(String(data.fuel_type));
    }
  }
  if (data.service_type || data.service) parts.push(String(data.service_type || data.service));
  if (data.department_beneficiary || data.target_department) parts.push(String(data.department_beneficiary || data.target_department));
  if (data.category) parts.push(String(data.category));
  if (data.equipment_type || data.asset_id) parts.push(String(data.equipment_type || data.asset_id));
  if (data.quantity && (data.rate || data.unit_cost)) {
    const r = data.rate || data.unit_cost;
    parts.push(`${data.quantity} × Rs. ${r} = Rs. ${(data.quantity * r).toLocaleString('en-IN')}`);
  } else if (data.paid_amount || data.total_cost) {
    const amt = Number(data.paid_amount || data.total_cost);
    if (!isNaN(amt) && amt > 0) parts.push(`Rs. ${amt.toLocaleString('en-IN')}`);
  } else if (data.working_hours) {
    parts.push(`${data.working_hours} hrs`);
  } else if (data.quantity) {
    parts.push(`${data.quantity} ${data.uom || 'units'}`);
  }
  if (parts.length > 0) return parts.join(' • ');

  const validEntries = Object.entries(data).filter(([k, v]) => !['_id', 'id', 'created_at', 'updated_at'].includes(k) && v !== null && v !== undefined && String(v).trim() !== '');
  if (validEntries.length > 0) {
    return validEntries.slice(0, 3).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`).join(' • ');
  }
  return '-';
}

export default function DataWorkspace({ currentUser, preselectDept, onNavigate }) {
  const [activeTab, setActiveTab] = useState('manual');
  const [schemas, setSchemas] = useState([]);
  const [selectedSchemaId, setSelectedSchemaId] = useState('');
  const [locations, setLocations] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [assets, setAssets] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [services, setServices] = useState([]);
  const [fuelTypes, setFuelTypes] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);

  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [isOpeningBalanceEditable, setIsOpeningBalanceEditable] = useState(false);
  const [previousBalanceInfo, setPreviousBalanceInfo] = useState(null);

  const [uploadFile, setUploadFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [excelError, setExcelError] = useState('');

  const [excelPreviewPage, setExcelPreviewPage] = useState(1);
  const [excelPreviewPageSize, setExcelPreviewPageSize] = useState(10);
  const [excelPreviewIndex, setExcelPreviewIndex] = useState(null);

  useEffect(() => {
    loadMasterData();
    const handleMasterUpdate = () => loadMasterData();
    window.addEventListener('civet_master_updated', handleMasterUpdate);
    return () => window.removeEventListener('civet_master_updated', handleMasterUpdate);
  }, []);

  async function loadMasterData() {
    try {
      const [sRes, lRes, vRes, aRes, dRes, srvRes, fuelRes, payRes] = await Promise.all([
        api.getSchemas(),
        api.getMaster('locations').catch(() => []),
        api.getMaster('vendors').catch(() => []),
        api.getMaster('assets').catch(() => []),
        api.getMaster('departments').catch(() => []),
        api.getMaster('service-types').catch(() => []),
        api.getMaster('fuel-types').catch(() => []),
        api.getMaster('payment-types').catch(() => [])
      ]);
      setSchemas(sRes);
      setLocations(lRes);
      setVendors(vRes);
      setAssets(aRes);
      setDepartments(dRes);
      setServices(srvRes);
      setFuelTypes(fuelRes);
      setPaymentTypes(payRes);

      if (sRes.length > 0) {
        if (preselectDept) {
          const match = sRes.find(s => s.department_id === preselectDept || s.department === preselectDept);
          setSelectedSchemaId(match ? match.report_type_id || match.reportType : sRes[0].report_type_id || sRes[0].reportType);
        } else if (!selectedSchemaId) {
          setSelectedSchemaId(sRes[0].report_type_id || sRes[0].reportType);
        }
      }
    } catch (err) {
      console.error('Failed to load schemas or master data:', err);
    }
  }

  const currentSchema = schemas.find(s => (s.report_type_id || s.reportType) === selectedSchemaId);
  const rawFields = currentSchema?.fields || currentSchema?.columns || [];
  const schemaFields = rawFields.filter(f => {
    const key = (f.name || f.key || '').toLowerCase();
    return !['location', 'location_id', 'report_date', 'date'].includes(key);
  });

  const isBothFuel = (selectedSchemaId || '').toUpperCase() === 'FUEL_PURCHASE' &&
    String(formData.fuel_type || '').toLowerCase().trim().includes('both');

  const hasCashAndCarry = String(formData.payment_type || '').toLowerCase().includes('cash');

  useEffect(() => {
    if ((selectedSchemaId || '').toUpperCase() === 'FUEL_PURCHASE' && formData.location) {
      let active = true;
      if (!formData.ledger_type) {
        setFormData(prev => ({ ...prev, opening_balance: 0 }));
        setIsOpeningBalanceEditable(true);
        return;
      }
      api.getPreviousBalance(formData.location, formData.report_date, formData.ledger_type)
        .then(res => {
          if (!active || !res) return;
          setPreviousBalanceInfo(res);
          setFormData(prev => ({
            ...prev,
            opening_balance: res.closingBalance !== undefined ? res.closingBalance : 0
          }));
          setIsOpeningBalanceEditable(Boolean(res.isFirstEntry));
        })
        .catch(() => {});
      return () => { active = false; };
    }
  }, [selectedSchemaId, formData.location, formData.report_date, formData.ledger_type]);

  const handleInputChange = (field, rawVal) => {
    let val = (rawVal && typeof rawVal === 'object' && rawVal.target && rawVal.target.value !== undefined)
      ? rawVal.target.value
      : ((rawVal && typeof rawVal === 'object' && rawVal.value !== undefined) ? rawVal.value : rawVal);
    if (field === 'cash_and_carry' && typeof val === 'string') {
      val = val.replace(/[^0-9.]/g, '');
    }
    setFormData(prev => {
      const next = { ...prev, [field]: val };
      if (field === 'location' && (selectedSchemaId || '').toUpperCase() === 'FUEL_PURCHASE') {
        next.ledger_type = '';
        next.opening_balance = 0;
      }
      if (field === 'quantity' || field === 'rate' || field === 'unit_cost') {
        const q = Number(field === 'quantity' ? val : next.quantity);
        const r = Number(field === 'rate' ? val : (next.rate ?? next.unit_cost));
        if (!isNaN(q) && !isNaN(r) && q > 0 && r > 0) {
          const total = Number((q * r).toFixed(2));
          next.total_cost = total;
          if (next.paid_amount !== undefined && next.paid_amount !== '' && next.paid_amount !== null) {
            next.balance = Math.max(0, Number((total - Number(next.paid_amount)).toFixed(2)));
          } else {
            next.balance = 0;
          }
        }
      } else if (['petrol_quantity', 'petrol_rate', 'diesel_quantity', 'diesel_rate'].includes(field)) {
        const pQ = Number(field === 'petrol_quantity' ? val : next.petrol_quantity) || 0;
        const pR = Number(field === 'petrol_rate' ? val : next.petrol_rate) || 0;
        const dQ = Number(field === 'diesel_quantity' ? val : next.diesel_quantity) || 0;
        const dR = Number(field === 'diesel_rate' ? val : next.diesel_rate) || 0;
        const pTotal = Number((pQ * pR).toFixed(2));
        const dTotal = Number((dQ * dR).toFixed(2));
        const combinedTotal = Number((pTotal + dTotal).toFixed(2));
        const combinedQty = Number((pQ + dQ).toFixed(2));
        next.petrol_total_cost = pTotal;
        next.diesel_total_cost = dTotal;
        if (combinedTotal > 0) {
          next.total_cost = combinedTotal;
          if (next.paid_amount !== undefined && next.paid_amount !== '' && next.paid_amount !== null) {
            next.balance = Math.max(0, Number((combinedTotal - Number(next.paid_amount)).toFixed(2)));
          } else {
            next.balance = 0;
          }
        }
        next.quantity = combinedQty;
        next.fuel_consumed_litres = combinedQty;
      } else if (field === 'total_cost') {
        const tc = Number(val) || 0;
        if (next.paid_amount !== undefined && next.paid_amount !== '' && next.paid_amount !== null) {
          next.balance = Math.max(0, Number((tc - Number(next.paid_amount)).toFixed(2)));
        } else {
          next.balance = 0;
        }
      } else if (field === 'paid_amount') {
        const tc = Number(next.total_cost) || 0;
        if (val !== undefined && val !== '' && val !== null) {
          next.balance = Math.max(0, Number((tc - Number(val)).toFixed(2)));
        } else {
          next.balance = 0;
        }
      }
      return next;
    });
    if (formErrors[field]) {
      setFormErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setSubmitSuccess(null);
    setFormErrors({});

    const isFuelPurchase = (selectedSchemaId || '').toUpperCase() === 'FUEL_PURCHASE';
    const errors = {};

    if (!formData.location || String(formData.location).trim() === '') {
      errors.location = 'Project Division is required';
    }

    if (isFuelPurchase) {
      if (!formData.report_date) {
        formData.report_date = new Date().toISOString().split('T')[0];
      }
      if (!formData.department && !formData.department_beneficiary) {
        formData.department = 'Plant & Machinery';
        formData.department_beneficiary = 'Plant & Machinery';
      }
      if (!formData.ledger_type) {
        formData.ledger_type = '-';
      }
      if (!formData.fuel_type) {
        formData.fuel_type = 'Diesel';
      }
      if (!formData.payment_type) {
        formData.payment_type = 'Regular';
      }
    } else {
      schemaFields.forEach(f => {
        const fName = f.name || f.key;
        const fLabel = f.label || fName;
        const val = formData[fName];
        if (f.required && (val === undefined || val === null || String(val).trim() === '')) {
          errors[fName] = `${fLabel} is required`;
        }
      });
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      let payload;
      if (isFuelPurchase) {
        let total = 0;
        let qty = 0;
        let rate = 0;
        let pQ = 0, pR = 0, dQ = 0, dR = 0, pTotal = 0, dTotal = 0;
        if (isBothFuel) {
          pQ = Number(formData.petrol_quantity || 0);
          pR = Number(formData.petrol_rate || 0);
          dQ = Number(formData.diesel_quantity || 0);
          dR = Number(formData.diesel_rate || 0);
          pTotal = Number((pQ * pR).toFixed(2));
          dTotal = Number((dQ * dR).toFixed(2));
          total = Number((pTotal + dTotal).toFixed(2));
          qty = Number((pQ + dQ).toFixed(2));
          rate = qty > 0 ? Number((total / qty).toFixed(2)) : 0;
          if (total === 0 && formData.total_cost) {
            total = Number(formData.total_cost);
          }
        } else {
          const hasQ = formData.quantity !== undefined && formData.quantity !== null && String(formData.quantity).trim() !== '';
          const hasR = formData.rate !== undefined && formData.rate !== null && String(formData.rate).trim() !== '';
          qty = hasQ ? Number(formData.quantity) : 0;
          rate = hasR ? Number(formData.rate) : 0;
          if (hasQ && hasR && qty > 0 && rate > 0) {
            total = Number((qty * rate).toFixed(2));
          } else if (formData.total_cost !== undefined && formData.total_cost !== null && String(formData.total_cost).trim() !== '' && !isNaN(Number(formData.total_cost))) {
            total = Number(formData.total_cost);
          }
        }
        let paid = total;
        if (formData.paid_amount !== undefined && formData.paid_amount !== null && String(formData.paid_amount).trim() !== '' && !isNaN(Number(formData.paid_amount))) {
          paid = Number(formData.paid_amount);
        }
        const balance = Math.max(0, Number((total - paid).toFixed(2)));
        payload = {
          ...formData,
          location: formData.location,
          location_id: formData.location,
          project_division: formData.project_division || formData.location,
          project_division_id: formData.location,
          project_name: formData.project_name || formData.site_name || '',
          ledger_type: formData.ledger_type,
          vendor_name: formData.ledger_type,
          department_beneficiary: formData.department || formData.department_beneficiary,
          department: formData.department || formData.department_beneficiary,
          fuel_type: formData.fuel_type,
          payment_type: formData.payment_type,
          report_date: formData.report_date,
          petrol_quantity: isBothFuel ? pQ : (formData.petrol_quantity ? Number(formData.petrol_quantity) : 0),
          petrol_rate: isBothFuel ? pR : (formData.petrol_rate ? Number(formData.petrol_rate) : 0),
          petrol_total_cost: isBothFuel ? pTotal : (formData.petrol_total_cost ? Number(formData.petrol_total_cost) : 0),
          diesel_quantity: isBothFuel ? dQ : (formData.diesel_quantity ? Number(formData.diesel_quantity) : 0),
          diesel_rate: isBothFuel ? dR : (formData.diesel_rate ? Number(formData.diesel_rate) : 0),
          diesel_total_cost: isBothFuel ? dTotal : (formData.diesel_total_cost ? Number(formData.diesel_total_cost) : 0),
          quantity: qty > 0 ? qty : null,
          fuel_consumed_litres: qty > 0 ? qty : 0,
          rate: rate > 0 ? rate : null,
          total_cost: total,
          paid_amount: paid,
          opening_balance: Number(formData.opening_balance || 0),
          closing_balance: Number(((Number(formData.opening_balance || 0) + total - paid)).toFixed(2)),
          balance: Number(((Number(formData.opening_balance || 0) + total - paid)).toFixed(2)),
          balance_amount: Number(((Number(formData.opening_balance || 0) + total - paid)).toFixed(2))
        };
      } else {
        payload = {
          ...formData,
          location: formData.location,
          location_id: formData.location,
          project_division: formData.project_division || formData.location,
          project_division_id: formData.location,
          project_name: formData.project_name || formData.site_name || '',
          report_date: formData.report_date || new Date().toISOString().split('T')[0]
        };
      }
      await api.submitManualEntry(selectedSchemaId, payload);
      setSubmitSuccess('Record successfully submitted and logged into Data Register.');
      setFormData(isFuelPurchase ? { location: formData.location, project_division: formData.project_division || formData.location, project_name: formData.project_name, report_date: formData.report_date } : {});
    } catch (err) {
      setFormErrors({ _general: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await api.downloadTemplate(selectedSchemaId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Civet_Template_${selectedSchemaId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      alert('Failed to download template: ' + err.message);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFile(file);
    setExcelError('');
    setPreviewData(null);
    setImportResult(null);

    const data = new FormData();
    data.append('file', file);
    data.append('reportType', selectedSchemaId);

    setUploading(true);
    try {
      const res = await api.previewImport(data);
      setPreviewData(res);
      setExcelPreviewPage(1);
    } catch (err) {
      setExcelError(err.message || 'Failed to process file');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData?.batchId) return;
    setImporting(true);
    try {
      const res = await api.confirmImport(previewData.batchId);
      setImportResult(res);
      setPreviewData(null);
      setUploadFile(null);
    } catch (err) {
      setExcelError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadErrors = async () => {
    if (!previewData?.batchId) return;
    try {
      const blob = await api.downloadErrorReport(previewData.batchId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Civet_Errors_${previewData.batchId.substring(0, 8)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      alert('Failed to download error report: ' + err.message);
    }
  };

  const targetDeptOptions = Array.from(new Set([
    ...DEFAULT_TARGET_DEPTS,
    ...departments.map(d => d.name || d.code).filter(Boolean)
  ]));

  const serviceOptions = Array.from(new Set([
    ...DEFAULT_SERVICE_TYPES,
    ...services.map(s => s.name).filter(Boolean)
  ]));

  const fuelTypeOptions = Array.from(new Set([
    ...(fuelTypes.length > 0 ? fuelTypes.map(f => f.name || f.code).filter(Boolean) : DEFAULT_FUEL_TYPES)
  ]));

  const paymentTypeOptions = Array.from(new Set([
    ...(paymentTypes.length > 0 ? paymentTypes.map(p => p.name || p.code).filter(Boolean) : DEFAULT_PAYMENT_TYPES)
  ]));

  const fuelBunkOptions = React.useMemo(() => {
    const allVendors = vendors.map(v => v.name || v.vendor_name).filter(Boolean);
    const locKey = String(formData.location || '').trim().toLowerCase();
    let siteBunks = [];
    if (locKey) {
      for (const [k, bunks] of Object.entries(SITE_BUNKS_MAP)) {
        if (k.toLowerCase() === locKey || locKey.includes(k.toLowerCase()) || k.toLowerCase().includes(locKey)) {
          siteBunks = bunks;
          break;
        }
      }
    }
    const prioritized = [];
    const added = new Set();
    siteBunks.forEach(b => {
      prioritized.push({
        value: b,
        label: `${b} (${formData.location} Bunk)`
      });
      added.add(b.toLowerCase());
    });
    allVendors.forEach(v => {
      if (!added.has(v.toLowerCase())) {
        prioritized.push({
          value: v,
          label: v
        });
        added.add(v.toLowerCase());
      }
    });
    return prioritized;
  }, [vendors, formData.location]);

  const projectNameOptions = React.useMemo(() => {
    const set = new Set();
    (locations || []).forEach(l => {
      const p = l.project_name || l.category;
      if (p && String(p).trim() && String(p).trim() !== '-' && String(p).trim().toLowerCase() !== 'project site') {
        set.add(String(p).trim());
      }
    });
    return Array.from(set).map(name => ({ value: name, label: name }));
  }, [locations]);

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#0F2A4A' }}>Data Workspace</h1>
      </div>

      <div className="civet-tab-bar" style={{ maxWidth: '540px' }}>
        <button
          onClick={() => {
            setActiveTab('manual');
            setSubmitSuccess(null);
            setFormErrors({});
          }}
          className={`civet-tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
        >
          <Plus size={14} color={activeTab === 'manual' ? '#1F6FEB' : '#576574'} />
          <span>Manual Form Entry</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('excel');
            setSubmitSuccess(null);
            setFormErrors({});
          }}
          className={`civet-tab-btn ${activeTab === 'excel' ? 'active' : ''}`}
        >
          <FileSpreadsheet size={14} color={activeTab === 'excel' ? '#1F6FEB' : '#576574'} />
          <span>Excel Bulk Import Wizard</span>
        </button>
      </div>

      <div className="civet-card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span style={{ fontSize: '11px', fontWeight: '600', color: '#576574', textTransform: 'uppercase' }}>
          Select Report Type:
        </span>
        <div style={{ minWidth: '280px' }}>
          <SearchableSelect
            value={selectedSchemaId}
            onChange={rawVal => {
              const val = (rawVal && typeof rawVal === 'object' && rawVal.target && rawVal.target.value !== undefined)
                ? rawVal.target.value
                : ((rawVal && typeof rawVal === 'object' && rawVal.value !== undefined) ? rawVal.value : rawVal);
              setSelectedSchemaId(String(val || ''));
              setFormData({});
              setPreviewData(null);
              setImportResult(null);
              setSubmitSuccess(null);
            }}
            options={schemas.map(s => ({
              value: s.report_type_id || s.reportType,
              label: s.report_name || s.reportName
            }))}
            placeholder="Search report type..."
            style={{ height: '30px', fontWeight: '600', color: '#0F2A4A' }}
          />
        </div>

        {currentSchema && (
          <span style={{ fontSize: '11px', color: '#8395A7' }}>
            {(currentSchema.report_type_id || currentSchema.reportType || '').toLowerCase() !== 'fuel_purchase' && (
              <>Department: <strong style={{ color: '#0F2A4A' }}>{currentSchema.department_id || currentSchema.department}</strong> • </>
            )}
            {schemaFields.length + 2} Fields
          </span>
        )}
      </div>

      {activeTab === 'manual' && (
        <div className="civet-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 className="text-h2">Record Form: {currentSchema?.report_name || currentSchema?.reportName}</h2>
            <span style={{ fontSize: '11px', color: '#8395A7' }}>Fields marked with (*) are required</span>
          </div>

          {submitSuccess && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              backgroundColor: '#EAF8F1',
              border: '1px solid #B5E5D0',
              borderRadius: '4px',
              color: '#2E9E6B',
              fontSize: '11.5px',
              marginBottom: '16px'
            }}>
              <CheckCircle2 size={16} />
              <span>{submitSuccess}</span>
            </div>
          )}

          {formErrors._general && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              backgroundColor: '#FBEFEB',
              border: '1px solid #F3C3C0',
              borderRadius: '4px',
              color: '#C8423A',
              fontSize: '11.5px',
              marginBottom: '16px'
            }}>
              <XCircle size={16} />
              <span>{formErrors._general}</span>
            </div>
          )}

          <form onSubmit={handleManualSubmit}>
            {(selectedSchemaId || '').toUpperCase() === 'FUEL_PURCHASE' ? (
              <div className="grid-form-4">
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#576574', marginBottom: '4px' }}>
                    Project Division <span style={{ color: '#C8423A' }}>*</span>
                  </label>
                  <SearchableSelect
                    value={formData.project_division || formData.location || ''}
                    onChange={val => {
                      handleInputChange('project_division', val);
                      handleInputChange('location', val);
                      const matchedLoc = (locations || []).find(l => (l.name || l.code) === val);
                      if (matchedLoc && (matchedLoc.project_name || matchedLoc.category)) {
                        const pVal = matchedLoc.project_name || matchedLoc.category;
                        handleInputChange('project_name', pVal);
                        handleInputChange('site_name', pVal);
                      }
                    }}
                    options={locations.map(l => ({ value: l.name || l.code, label: l.name || l.code }))}
                    placeholder="Search Project Division..."
                    style={{ width: '100%', height: '32px', borderColor: formErrors.location ? '#C8423A' : '#000000' }}
                  />
                  {formErrors.location && (
                    <span style={{ fontSize: '10.5px', color: '#C8423A', marginTop: '2px', display: 'block' }}>
                      {formErrors.location}
                    </span>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#576574', marginBottom: '4px' }}>
                    Project Name <span style={{ fontSize: '10px', color: '#8395A7', fontWeight: '400' }}>(Optional)</span>
                  </label>
                  <SearchableSelect
                    value={formData.project_name || formData.site_name || ''}
                    onChange={val => {
                      handleInputChange('project_name', val);
                      handleInputChange('site_name', val);
                    }}
                    options={projectNameOptions}
                    placeholder="Select or Search Project Name..."
                    style={{ width: '100%', height: '32px', borderColor: '#000000' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#576574', marginBottom: '4px' }}>
                    Ledger Type <span style={{ fontSize: '10px', color: '#8395A7', fontWeight: '400' }}>(Optional)</span>
                  </label>
                  <SearchableSelect
                    value={formData.ledger_type || ''}
                    onChange={val => handleInputChange('ledger_type', val)}
                    options={fuelBunkOptions}
                    placeholder="Search Ledger Type..."
                    style={{ width: '100%', height: '32px', borderColor: formErrors.ledger_type ? '#C8423A' : '#000000' }}
                  />
                  {formErrors.ledger_type && (
                    <span style={{ fontSize: '10.5px', color: '#C8423A', marginTop: '2px', display: 'block' }}>
                      {formErrors.ledger_type}
                    </span>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#576574', marginBottom: '4px' }}>
                    Department <span style={{ fontSize: '10px', color: '#8395A7', fontWeight: '400' }}>(Optional)</span>
                  </label>
                  <SearchableSelect
                    value={formData.department || formData.department_beneficiary || ''}
                    onChange={val => {
                      handleInputChange('department', val);
                      handleInputChange('department_beneficiary', val);
                    }}
                    options={targetDeptOptions}
                    placeholder="Search Department..."
                    style={{ width: '100%', height: '32px', borderColor: formErrors.department ? '#C8423A' : '#000000' }}
                  />
                  {formErrors.department && (
                    <span style={{ fontSize: '10.5px', color: '#C8423A', marginTop: '2px', display: 'block' }}>
                      {formErrors.department}
                    </span>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#576574', marginBottom: '4px' }}>
                    Fuel Type <span style={{ fontSize: '10px', color: '#8395A7', fontWeight: '400' }}>(Optional)</span>
                  </label>
                  <SearchableSelect
                    value={formData.fuel_type || ''}
                    onChange={val => handleInputChange('fuel_type', val)}
                    options={fuelTypeOptions}
                    placeholder="Search Fuel Type..."
                    style={{ width: '100%', height: '32px', borderColor: formErrors.fuel_type ? '#C8423A' : '#000000' }}
                  />
                  {formErrors.fuel_type && (
                    <span style={{ fontSize: '10.5px', color: '#C8423A', marginTop: '2px', display: 'block' }}>
                      {formErrors.fuel_type}
                    </span>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#576574', marginBottom: '4px' }}>
                    Payment Type <span style={{ fontSize: '10px', color: '#8395A7', fontWeight: '400' }}>(Optional)</span>
                  </label>
                  <SearchableSelect
                    value={formData.payment_type || ''}
                    onChange={val => handleInputChange('payment_type', val)}
                    options={paymentTypeOptions}
                    placeholder="Search Payment Type..."
                    style={{ width: '100%', height: '32px', borderColor: formErrors.payment_type ? '#C8423A' : '#000000' }}
                  />
                  {formErrors.payment_type && (
                    <span style={{ fontSize: '10.5px', color: '#C8423A', marginTop: '2px', display: 'block' }}>
                      {formErrors.payment_type}
                    </span>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#576574', marginBottom: '4px' }}>
                    Date <span style={{ fontSize: '10px', color: '#8395A7', fontWeight: '400' }}>(Optional)</span>
                  </label>
                  <input
                    type="date"
                    value={formData.report_date || ''}
                    onChange={e => handleInputChange('report_date', e.target.value)}
                    style={{ width: '100%', height: '32px', borderColor: formErrors.report_date ? '#C8423A' : '#D9DEE5' }}
                  />
                  {formErrors.report_date && (
                    <span style={{ fontSize: '10.5px', color: '#C8423A', marginTop: '2px', display: 'block' }}>
                      {formErrors.report_date}
                    </span>
                  )}
                </div>

                {isBothFuel ? (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#16A34A', marginBottom: '4px' }}>
                        Petrol Quantity (Ltrs) <span style={{ fontSize: '10px', color: '#8395A7', fontWeight: '400' }}>(Optional)</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="Petrol Qty (ltrs)"
                        value={formData.petrol_quantity ?? ''}
                        onChange={e => handleInputChange('petrol_quantity', e.target.value)}
                        style={{ width: '100%', height: '32px', borderColor: formErrors.petrol_quantity ? '#C8423A' : '#D9DEE5' }}
                      />
                      {formErrors.petrol_quantity && (
                        <span style={{ fontSize: '10.5px', color: '#C8423A', marginTop: '2px', display: 'block' }}>
                          {formErrors.petrol_quantity}
                        </span>
                      )}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#16A34A', marginBottom: '4px' }}>
                        Petrol Price (Rs. / Ltr) <span style={{ fontSize: '10px', color: '#8395A7', fontWeight: '400' }}>(Optional)</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="Petrol Rate (Rs. / ltr)"
                        value={formData.petrol_rate ?? ''}
                        onChange={e => handleInputChange('petrol_rate', e.target.value)}
                        style={{ width: '100%', height: '32px', borderColor: formErrors.petrol_rate ? '#C8423A' : '#D9DEE5' }}
                      />
                      {formErrors.petrol_rate && (
                        <span style={{ fontSize: '10.5px', color: '#C8423A', marginTop: '2px', display: 'block' }}>
                          {formErrors.petrol_rate}
                        </span>
                      )}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#2563EB', marginBottom: '4px' }}>
                        Diesel Quantity (Ltrs) <span style={{ fontSize: '10px', color: '#8395A7', fontWeight: '400' }}>(Optional)</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="Diesel Qty (ltrs)"
                        value={formData.diesel_quantity ?? ''}
                        onChange={e => handleInputChange('diesel_quantity', e.target.value)}
                        style={{ width: '100%', height: '32px', borderColor: formErrors.diesel_quantity ? '#C8423A' : '#D9DEE5' }}
                      />
                      {formErrors.diesel_quantity && (
                        <span style={{ fontSize: '10.5px', color: '#C8423A', marginTop: '2px', display: 'block' }}>
                          {formErrors.diesel_quantity}
                        </span>
                      )}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#2563EB', marginBottom: '4px' }}>
                        Diesel Price (Rs. / Ltr) <span style={{ fontSize: '10px', color: '#8395A7', fontWeight: '400' }}>(Optional)</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="Diesel Rate (Rs. / ltr)"
                        value={formData.diesel_rate ?? ''}
                        onChange={e => handleInputChange('diesel_rate', e.target.value)}
                        style={{ width: '100%', height: '32px', borderColor: formErrors.diesel_rate ? '#C8423A' : '#D9DEE5' }}
                      />
                      {formErrors.diesel_rate && (
                        <span style={{ fontSize: '10.5px', color: '#C8423A', marginTop: '2px', display: 'block' }}>
                          {formErrors.diesel_rate}
                        </span>
                      )}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#576574', marginBottom: '4px' }}>
                        Total Cost of Both <span style={{ fontSize: '10px', color: '#8395A7', fontWeight: '400' }}>(Optional)</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        readOnly={Boolean((Number(formData.petrol_quantity) > 0 && Number(formData.petrol_rate) > 0) || (Number(formData.diesel_quantity) > 0 && Number(formData.diesel_rate) > 0))}
                        value={formData.total_cost ?? ''}
                        onChange={e => handleInputChange('total_cost', e.target.value)}
                        placeholder={
                          ((Number(formData.petrol_quantity) > 0 && Number(formData.petrol_rate) > 0) || (Number(formData.diesel_quantity) > 0 && Number(formData.diesel_rate) > 0))
                            ? "Auto: (P Qty×Rate) + (D Qty×Rate)"
                            : "Enter Total Cost"
                        }
                        style={{
                          width: '100%',
                          height: '32px',
                          backgroundColor: Boolean((Number(formData.petrol_quantity) > 0 && Number(formData.petrol_rate) > 0) || (Number(formData.diesel_quantity) > 0 && Number(formData.diesel_rate) > 0)) ? '#F8FAFC' : '#FFFFFF',
                          cursor: Boolean((Number(formData.petrol_quantity) > 0 && Number(formData.petrol_rate) > 0) || (Number(formData.diesel_quantity) > 0 && Number(formData.diesel_rate) > 0)) ? 'not-allowed' : 'text',
                          fontWeight: '600',
                          color: '#0F2A4A',
                          borderColor: formErrors.total_cost ? '#C8423A' : '#D9DEE5'
                        }}
                      />
                      {formErrors.total_cost && (
                        <span style={{ fontSize: '10.5px', color: '#C8423A', marginTop: '2px', display: 'block' }}>
                          {formErrors.total_cost}
                        </span>
                      )}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#576574', marginBottom: '4px' }}>
                        Paid Amount <span style={{ fontSize: '10px', color: '#8395A7', fontWeight: '400' }}>(Optional)</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="Enter paid amount"
                        value={formData.paid_amount ?? ''}
                        onChange={e => handleInputChange('paid_amount', e.target.value)}
                        style={{ width: '100%', height: '32px', borderColor: formErrors.paid_amount ? '#C8423A' : '#D9DEE5' }}
                      />
                      {formErrors.paid_amount && (
                        <span style={{ fontSize: '10.5px', color: '#C8423A', marginTop: '2px', display: 'block' }}>
                          {formErrors.paid_amount}
                        </span>
                      )}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#576574' }}>
                          Opening Balance (Rs.)
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsOpeningBalanceEditable(prev => !prev)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#1F6FEB',
                            fontSize: '10.5px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          {isOpeningBalanceEditable ? 'Lock' : 'Edit'}
                        </button>
                      </div>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        readOnly={!isOpeningBalanceEditable}
                        placeholder="0.00"
                        value={formData.opening_balance !== undefined ? formData.opening_balance : ''}
                        onChange={e => handleInputChange('opening_balance', e.target.value)}
                        style={{
                          width: '100%',
                          height: '32px',
                          backgroundColor: !isOpeningBalanceEditable ? '#F8FAFC' : '#FFFFFF',
                          cursor: !isOpeningBalanceEditable ? 'not-allowed' : 'text',
                          fontWeight: '600',
                          color: '#0F2A4A',
                          borderColor: formErrors.opening_balance ? '#C8423A' : '#D9DEE5'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#576574', marginBottom: '4px' }}>
                        Closing Balance
                      </label>
                      <input
                        type="number"
                        readOnly
                        placeholder="0.00"
                        value={(() => {
                          const op = Number(formData.opening_balance || 0);
                          const tc = Number(formData.total_cost || 0);
                          const hasPa = formData.paid_amount !== undefined && formData.paid_amount !== null && String(formData.paid_amount).trim() !== '';
                          const pa = hasPa ? Number(formData.paid_amount || 0) : 0;
                          return Number((op + tc - pa).toFixed(2));
                        })()}
                        style={{
                          width: '100%',
                          height: '32px',
                          backgroundColor: '#F8FAFC',
                          cursor: 'not-allowed',
                          fontWeight: '600',
                          color: '#0F2A4A',
                          borderColor: '#D9DEE5'
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#576574', marginBottom: '4px' }}>
                        Qty <span style={{ fontSize: '10px', color: '#8395A7', fontWeight: '400' }}>(Optional)</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="Enter fuel quantity (ltrs)"
                        value={formData.quantity ?? ''}
                        onChange={e => handleInputChange('quantity', e.target.value)}
                        style={{ width: '100%', height: '32px', borderColor: formErrors.quantity ? '#C8423A' : '#D9DEE5' }}
                      />
                      {formErrors.quantity && (
                        <span style={{ fontSize: '10.5px', color: '#C8423A', marginTop: '2px', display: 'block' }}>
                          {formErrors.quantity}
                        </span>
                      )}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#576574', marginBottom: '4px' }}>
                        Rate <span style={{ fontSize: '10px', color: '#8395A7', fontWeight: '400' }}>(Optional)</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="Enter rate (Rs. / ltr)"
                        value={formData.rate ?? ''}
                        onChange={e => handleInputChange('rate', e.target.value)}
                        style={{ width: '100%', height: '32px', borderColor: formErrors.rate ? '#C8423A' : '#D9DEE5' }}
                      />
                      {formErrors.rate && (
                        <span style={{ fontSize: '10.5px', color: '#C8423A', marginTop: '2px', display: 'block' }}>
                          {formErrors.rate}
                        </span>
                      )}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#576574', marginBottom: '4px' }}>
                        Total Cost <span style={{ fontSize: '10px', color: '#8395A7', fontWeight: '400' }}>(Optional)</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        readOnly={Boolean(Number(formData.quantity) > 0 && Number(formData.rate) > 0)}
                        value={formData.total_cost ?? ''}
                        onChange={e => handleInputChange('total_cost', e.target.value)}
                        placeholder={
                          (Number(formData.quantity) > 0 && Number(formData.rate) > 0)
                            ? "Auto-calculated (Qty × Rate)"
                            : "Enter Total Cost"
                        }
                        style={{
                          width: '100%',
                          height: '32px',
                          backgroundColor: (Number(formData.quantity) > 0 && Number(formData.rate) > 0) ? '#F8FAFC' : '#FFFFFF',
                          cursor: (Number(formData.quantity) > 0 && Number(formData.rate) > 0) ? 'not-allowed' : 'text',
                          fontWeight: '600',
                          color: '#0F2A4A',
                          borderColor: formErrors.total_cost ? '#C8423A' : '#D9DEE5'
                        }}
                      />
                      {formErrors.total_cost && (
                        <span style={{ fontSize: '10.5px', color: '#C8423A', marginTop: '2px', display: 'block' }}>
                          {formErrors.total_cost}
                        </span>
                      )}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#576574', marginBottom: '4px' }}>
                        Paid Amount <span style={{ fontSize: '10px', color: '#8395A7', fontWeight: '400' }}>(Optional)</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="Enter paid amount"
                        value={formData.paid_amount ?? ''}
                        onChange={e => handleInputChange('paid_amount', e.target.value)}
                        style={{ width: '100%', height: '32px', borderColor: formErrors.paid_amount ? '#C8423A' : '#D9DEE5' }}
                      />
                      {formErrors.paid_amount && (
                        <span style={{ fontSize: '10.5px', color: '#C8423A', marginTop: '2px', display: 'block' }}>
                          {formErrors.paid_amount}
                        </span>
                      )}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#576574' }}>
                          Opening Balance (Rs.)
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsOpeningBalanceEditable(prev => !prev)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#1F6FEB',
                            fontSize: '10.5px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          {isOpeningBalanceEditable ? 'Lock' : 'Edit'}
                        </button>
                      </div>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        readOnly={!isOpeningBalanceEditable}
                        placeholder="0.00"
                        value={formData.opening_balance !== undefined ? formData.opening_balance : ''}
                        onChange={e => handleInputChange('opening_balance', e.target.value)}
                        style={{
                          width: '100%',
                          height: '32px',
                          backgroundColor: !isOpeningBalanceEditable ? '#F8FAFC' : '#FFFFFF',
                          cursor: !isOpeningBalanceEditable ? 'not-allowed' : 'text',
                          fontWeight: '600',
                          color: '#0F2A4A',
                          borderColor: formErrors.opening_balance ? '#C8423A' : '#D9DEE5'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#576574', marginBottom: '4px' }}>
                        Closing Balance
                      </label>
                      <input
                        type="number"
                        readOnly
                        placeholder="0.00"
                        value={(() => {
                          const op = Number(formData.opening_balance || 0);
                          const tc = Number(formData.total_cost || 0);
                          const hasPa = formData.paid_amount !== undefined && formData.paid_amount !== null && String(formData.paid_amount).trim() !== '';
                          const pa = hasPa ? Number(formData.paid_amount || 0) : 0;
                          return Number((op + tc - pa).toFixed(2));
                        })()}
                        style={{
                          width: '100%',
                          height: '32px',
                          backgroundColor: '#F8FAFC',
                          cursor: 'not-allowed',
                          fontWeight: '600',
                          color: '#0F2A4A',
                          borderColor: '#D9DEE5'
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '14px'
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#576574', marginBottom: '4px' }}>
                  Project Division <span style={{ color: '#C8423A' }}>*</span>
                </label>
                <SearchableSelect
                  value={formData.project_division || formData.location || ''}
                  onChange={val => {
                    handleInputChange('project_division', val);
                    handleInputChange('location', val);
                  }}
                  options={locations.map(l => ({ value: l.name || l.code, label: l.name || l.code }))}
                  placeholder="Search Project Division..."
                  style={{ width: '100%', height: '32px', borderColor: formErrors.location ? '#C8423A' : '#000000' }}
                />
                {formErrors.location && (
                  <span style={{ fontSize: '10.5px', color: '#C8423A', marginTop: '2px', display: 'block' }}>
                    {formErrors.location}
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#576574', marginBottom: '4px' }}>
                  Reporting Date
                </label>
                <input
                  type="date"
                  value={formData.report_date || ''}
                  onChange={e => handleInputChange('report_date', e.target.value)}
                  style={{ width: '100%', height: '32px', borderColor: '#D9DEE5' }}
                />
              </div>

              {schemaFields.map(f => {
                const fName = f.name || f.key;
                const fType = f.type || 'text';
                const isReq = Boolean(f.required);
                const hasErr = Boolean(formErrors[fName]);
                const lowerName = fName.toLowerCase();
                const lowerLabel = (f.label || fName).toLowerCase();

                const isFuelPurchase = (currentSchema?.report_type_id || currentSchema?.reportType || '').toLowerCase() === 'fuel_purchase';
                if (isFuelPurchase && (lowerName.includes('asset') || lowerName.includes('equipment') || lowerName.includes('vehicle'))) {
                  return null;
                }
                const isFuelTypeField = lowerName.includes('fuel_type') || lowerName === 'fuel' || lowerLabel.includes('fuel type');
                const isPaymentTypeField = lowerName.includes('payment_type') || lowerLabel.includes('payment type');

                const isVendorField = lowerName.includes('vendor') || lowerName.includes('ledger') || fType === 'ref:vendors';
                const fDisplayLabel = isVendorField ? 'Ledger Type' : (f.label || fName);
                const isDeptField = lowerName.includes('department') || lowerName.includes('beneficiary') || fType === 'ref:departments';
                const isServiceField = lowerName.includes('service') || fType === 'ref:service_types';
                const isCategoryField = (lowerName === 'category' || lowerName.includes('payment_category')) && currentSchema?.department_id !== 'stores';
                const isMatCategoryField = lowerName.includes('material_category');
                const isEqTypeField = lowerName.includes('equipment_type') || fType === 'ref:equipment_types';
                const isAssetField = lowerName.includes('asset') || fType === 'ref:assets';
                const isUomField = lowerName === 'uom';
                const hasRate = schemaFields.some(sf => {
                  const k = (sf.name || sf.key || '').toLowerCase();
                  return k === 'rate' || k === 'unit_cost';
                });
                const hasQty = schemaFields.some(sf => {
                  const k = (sf.name || sf.key || '').toLowerCase();
                  return k === 'quantity' || k === 'qty';
                });
                const isTotalCostField = (lowerName === 'total_cost' || lowerName === 'paid_amount') && hasRate && hasQty;

                return (
                  <div key={fName}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#576574', marginBottom: '4px' }}>
                      {fDisplayLabel} {isReq && <span style={{ color: '#C8423A' }}>*</span>}
                    </label>

                    {f.options && f.options.length > 0 ? (
                      <SearchableSelect
                        value={formData[fName] || ''}
                        onChange={val => handleInputChange(fName, val)}
                        options={f.options}
                        placeholder={`Search ${fDisplayLabel}...`}
                        style={{ width: '100%', height: '32px', borderColor: hasErr ? '#C8423A' : '#000000' }}
                      />
                    ) : isFuelTypeField ? (
                      <SearchableSelect
                        value={formData[fName] || ''}
                        onChange={val => handleInputChange(fName, val)}
                        options={fuelTypeOptions}
                        placeholder="Search Fuel Type..."
                        style={{ width: '100%', height: '32px', borderColor: hasErr ? '#C8423A' : '#000000' }}
                      />
                    ) : isPaymentTypeField ? (
                      <SearchableSelect
                        value={formData[fName] || ''}
                        onChange={val => handleInputChange(fName, val)}
                        options={paymentTypeOptions}
                        placeholder="Search Payment Type..."
                        style={{ width: '100%', height: '32px', borderColor: hasErr ? '#C8423A' : '#000000' }}
                      />
                    ) : isVendorField ? (
                      <SearchableSelect
                        value={formData[fName] || ''}
                        onChange={val => handleInputChange(fName, val)}
                        options={vendors.map(v => ({ value: v.name || v.vendor_name, label: v.name || v.vendor_name }))}
                        placeholder="Search Ledger Type..."
                        style={{ width: '100%', height: '32px', borderColor: hasErr ? '#C8423A' : '#000000' }}
                      />
                    ) : isDeptField ? (
                      <SearchableSelect
                        value={formData[fName] || ''}
                        onChange={val => handleInputChange(fName, val)}
                        options={targetDeptOptions}
                        placeholder="Search Target Department..."
                        style={{ width: '100%', height: '32px', borderColor: hasErr ? '#C8423A' : '#000000' }}
                      />
                    ) : isServiceField ? (
                      <SearchableSelect
                        value={formData[fName] || ''}
                        onChange={val => handleInputChange(fName, val)}
                        options={serviceOptions}
                        placeholder="Search Service Type..."
                        style={{ width: '100%', height: '32px', borderColor: hasErr ? '#C8423A' : '#000000' }}
                      />
                    ) : isCategoryField ? (
                      <SearchableSelect
                        value={formData[fName] || ''}
                        onChange={val => handleInputChange(fName, val)}
                        options={DEFAULT_PAYMENT_CATEGORIES}
                        placeholder="Search Payment Category..."
                        style={{ width: '100%', height: '32px', borderColor: hasErr ? '#C8423A' : '#000000' }}
                      />
                    ) : isMatCategoryField ? (
                      <SearchableSelect
                        value={formData[fName] || ''}
                        onChange={val => handleInputChange(fName, val)}
                        options={DEFAULT_MATERIAL_CATEGORIES}
                        placeholder="Search Material Category..."
                        style={{ width: '100%', height: '32px', borderColor: hasErr ? '#C8423A' : '#000000' }}
                      />
                    ) : isEqTypeField ? (
                      <SearchableSelect
                        value={formData[fName] || ''}
                        onChange={val => handleInputChange(fName, val)}
                        options={DEFAULT_EQUIPMENT_TYPES}
                        placeholder="Search Equipment Type..."
                        style={{ width: '100%', height: '32px', borderColor: hasErr ? '#C8423A' : '#000000' }}
                      />
                    ) : isAssetField ? (
                      <SearchableSelect
                        value={formData[fName] || ''}
                        onChange={val => handleInputChange(fName, val)}
                        options={assets.map(a => ({ value: a.name || a.asset_code || a.code, label: a.name || a.asset_code || a.code }))}
                        placeholder="Search Asset / Tag..."
                        style={{ width: '100%', height: '32px', borderColor: hasErr ? '#C8423A' : '#000000' }}
                      />
                    ) : isUomField ? (
                      <SearchableSelect
                        value={formData[fName] || ''}
                        onChange={val => handleInputChange(fName, val)}
                        options={DEFAULT_UOM_LIST}
                        placeholder="Search Unit of Measure..."
                        style={{ width: '100%', height: '32px', borderColor: hasErr ? '#C8423A' : '#000000' }}
                      />
                    ) : isTotalCostField ? (
                      <input
                        type="number"
                        readOnly={Boolean(Number(formData.quantity) > 0 && Number(formData.rate ?? formData.unit_cost) > 0)}
                        value={formData[fName] ?? ''}
                        onChange={e => handleInputChange(fName, e.target.value)}
                        placeholder={
                          (Number(formData.quantity) > 0 && Number(formData.rate ?? formData.unit_cost) > 0)
                            ? "Auto-calculated (Qty × Rate)"
                            : "Enter Total Cost"
                        }
                        style={{
                          width: '100%',
                          height: '32px',
                          backgroundColor: (Number(formData.quantity) > 0 && Number(formData.rate ?? formData.unit_cost) > 0) ? '#F8FAFC' : '#FFFFFF',
                          cursor: (Number(formData.quantity) > 0 && Number(formData.rate ?? formData.unit_cost) > 0) ? 'not-allowed' : 'text',
                          fontWeight: '600',
                          color: '#0F2A4A',
                          borderColor: hasErr ? '#C8423A' : '#D9DEE5'
                        }}
                      />
                    ) : (
                      <input
                        type={fType === 'number' || fType === 'currency' || fType === 'decimal' ? 'number' : fType === 'date' ? 'date' : 'text'}
                        step={fType === 'currency' || fType === 'decimal' ? '0.01' : 'any'}
                        value={formData[fName] ?? ''}
                        onChange={e => handleInputChange(fName, e.target.value)}
                        placeholder={`Enter ${fDisplayLabel.toLowerCase()}`}
                        style={{ width: '100%', height: '32px', borderColor: hasErr ? '#C8423A' : '#D9DEE5' }}
                      />
                    )}

                    {hasErr && (
                      <span style={{ fontSize: '10.5px', color: '#C8423A', marginTop: '2px', display: 'block' }}>
                        {formErrors[fName]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            )}

            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #EAEFF5', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setFormData({})}
                disabled={submitting}
              >
                Clear Form
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'excel' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="civet-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 className="text-h2">Step 1: Download Standard Excel Template</h2>
              <p style={{ fontSize: '11px', color: '#576574', marginTop: '2px' }}>
                Download the standardized `.xlsx` workbook containing pre-formatted header columns and data validations for {currentSchema?.report_name}.
              </p>
            </div>
            <button className="btn btn-secondary" onClick={handleDownloadTemplate}>
              <Download size={14} />
              Download Template (.xlsx)
            </button>
          </div>

          <div className="civet-card">
            <h2 className="text-h2" style={{ marginBottom: '10px' }}>Step 2: Upload Completed Excel Sheet</h2>
            
            <div style={{
              border: '2px dashed #D9DEE5',
              borderRadius: '4px',
              padding: '30px',
              textAlign: 'center',
              backgroundColor: '#FAFCFE',
              cursor: 'pointer'
            }}>
              <input
                type="file"
                id="excelFileInput"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <label htmlFor="excelFileInput" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <Upload size={28} color="#1F6FEB" />
                <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#0F2A4A' }}>
                  Click to select or drag & drop completed .xlsx file here
                </span>
                <span style={{ fontSize: '11px', color: '#8395A7' }}>
                  Supports Microsoft Excel 2007+ (.xlsx) up to 20MB
                </span>
              </label>
            </div>

            {uploadFile && (
              <div style={{ marginTop: '12px', fontSize: '11.5px', color: '#576574' }}>
                Selected file: <strong>{uploadFile.name}</strong> ({(uploadFile.size / 1024).toFixed(1)} KB)
              </div>
            )}

            {uploading && (
              <div style={{ marginTop: '10px', fontSize: '11.5px', color: '#1F6FEB' }}>
                Analyzing schema headers and validating records against database...
              </div>
            )}

            {excelError && (
              <div style={{ marginTop: '12px', padding: '10px', background: '#FBEFEB', border: '1px solid #F3C3C0', color: '#C8423A', borderRadius: '4px', fontSize: '11.5px' }}>
                {excelError}
              </div>
            )}
          </div>

          {previewData && (
            <div className="civet-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h2 className="text-h2">Step 3: Validation Summary & Record Preview</h2>
                  <p style={{ fontSize: '11px', color: '#576574' }}>Batch #{previewData.batchId?.substring(0, 8)}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {previewData.errorCount > 0 && (
                    <button className="btn btn-danger btn-sm" onClick={handleDownloadErrors}>
                      <Download size={13} />
                      Download Error Report ({previewData.errorCount})
                    </button>
                  )}
                  {previewData.validCount > 0 && (
                    <button className="btn btn-success btn-sm" onClick={handleConfirmImport} disabled={importing}>
                      <CheckCircle2 size={13} />
                      {importing ? 'Importing...' : `Commit Valid Records (${previewData.validCount})`}
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '14px' }}>
                <div style={{ padding: '8px 12px', background: '#F4F6F9', borderRadius: '3px', border: '1px solid #D9DEE5' }}>
                  <span style={{ fontSize: '10px', color: '#576574', textTransform: 'uppercase' }}>Total Rows</span>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#0F2A4A' }}>{previewData.totalRows}</div>
                </div>
                <div style={{ padding: '8px 12px', background: '#EAF8F1', borderRadius: '3px', border: '1px solid #B5E5D0' }}>
                  <span style={{ fontSize: '10px', color: '#2E9E6B', textTransform: 'uppercase' }}>Valid Rows</span>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#2E9E6B' }}>{previewData.validCount}</div>
                </div>
                <div style={{ padding: '8px 12px', background: '#FDF7EB', borderRadius: '3px', border: '1px solid #F5DEB3' }}>
                  <span style={{ fontSize: '10px', color: '#D99A1E', textTransform: 'uppercase' }}>Warnings</span>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#D99A1E' }}>{previewData.warningCount}</div>
                </div>
                <div style={{ padding: '8px 12px', background: '#FBEFEB', borderRadius: '3px', border: '1px solid #F3C3C0' }}>
                  <span style={{ fontSize: '10px', color: '#C8423A', textTransform: 'uppercase' }}>Error Rows</span>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#C8423A' }}>{previewData.errorCount}</div>
                </div>
              </div>

              <div className="civet-table-container">
                <table className="civet-table">
                  <thead>
                    <tr>
                      <th>Row #</th>
                      <th>Validation Issues</th>
                      <th>Data Snapshot</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(previewData.previewRows || [])
                      .slice((excelPreviewPage - 1) * excelPreviewPageSize, excelPreviewPage * excelPreviewPageSize)
                      .map((r, index) => {
                        const globalIndex = (excelPreviewPage - 1) * excelPreviewPageSize + index;
                        return (
                          <tr key={r.rowNumber}>
                            <td>#{r.rowNumber}</td>
                            <td>
                              {r.errors && r.errors.length > 0 ? (
                                <span style={{ color: '#C8423A', fontWeight: '600' }}>
                                  {r.errors.map(e => e.message).join('; ')}
                                </span>
                              ) : r.warnings && r.warnings.length > 0 ? (
                                <span style={{ color: '#D99A1E' }}>
                                  {r.warnings.map(w => w.message).join('; ')}
                                </span>
                              ) : (
                                <span style={{ color: '#2E9E6B' }}>All checks passed</span>
                              )}
                            </td>
                            <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {formatRecordSummary(r.data)}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ height: '22px', padding: '0 6px' }}
                                onClick={() => setExcelPreviewIndex(globalIndex)}
                                title="Preview Details"
                              >
                                <Eye size={11} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              <TablePagination
                currentPage={excelPreviewPage}
                totalRecords={(previewData.previewRows || []).length}
                pageSize={excelPreviewPageSize}
                onPageChange={setExcelPreviewPage}
              />
            </div>
          )}

          {importResult && (
            <div className="civet-card" style={{ background: '#EAF8F1', border: '1px solid #B5E5D0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2E9E6B', fontWeight: '600', fontSize: '13px' }}>
                <CheckCircle2 size={18} />
                <span>Import Batch Successful!</span>
              </div>
              <p style={{ fontSize: '11.5px', color: '#273444', marginTop: '6px' }}>
                Successfully imported and persisted <strong>{importResult.importedCount}</strong> records to the database.
              </p>
              <button
                className="btn btn-secondary btn-sm"
                style={{ marginTop: '10px' }}
                onClick={() => onNavigate({ view: 'register' })}
              >
                View Records in Data Register
              </button>
            </div>
          )}
        </div>
      )}

      {previewData && (
        <RecordPreviewModal
          isOpen={excelPreviewIndex !== null}
          onClose={() => setExcelPreviewIndex(null)}
          records={(previewData.previewRows || []).map(r => ({
            row_number: r.rowNumber,
            validation_status: (r.errors && r.errors.length > 0) ? r.errors.map(e => e.message).join('; ') : ((r.warnings && r.warnings.length > 0) ? r.warnings.map(w => w.message).join('; ') : 'Valid'),
            ...(r.data || {})
          }))}
          currentIndex={excelPreviewIndex !== null ? excelPreviewIndex : 0}
          onNavigate={setExcelPreviewIndex}
          title="Excel Upload Row Details"
        />
      )}
    </div>
  );
}
