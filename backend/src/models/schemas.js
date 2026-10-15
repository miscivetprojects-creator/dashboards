const bcrypt = require('bcryptjs');
const { getCollection } = require('../db/mongoClient');

function getQuarter(month) {
  const m = Number(month);
  if (m >= 1 && m <= 3) return 'Q1';
  if (m >= 4 && m <= 6) return 'Q2';
  if (m >= 7 && m <= 9) return 'Q3';
  if (m >= 10 && m <= 12) return 'Q4';
  return 'Q1';
}

function getMonthName(month) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const m = Number(month);
  return months[m - 1] || 'Jan';
}

async function initializeMasterData() {
  const usersColl = getCollection('users');
  const existingAdmin = await usersColl.findOne({ email: 'mis@civetprojects.com' });
  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('Civet@111', salt);
    await usersColl.insertOne({
      id: 'USR_MIS',
      name: 'MIS Administrator',
      email: 'mis@civetprojects.com',
      password_hash: hash,
      role: 'admin',
      status: 'active',
      department: 'All',
      location: 'All',
      created_at: new Date()
    });
  }

  const reportTypesColl = getCollection('report_types');
  const repCount = await reportTypesColl.countDocuments();
  if (repCount === 0) {
    const defaultReportTypes = [
      {
        id: 'VEHICLE_UTILIZATION',
        department_id: 'PM',
        name: 'Vehicle Utilization',
        frequency: 'monthly',
        entry_fields: [
          { key: 'equipment_type', label: 'Equipment Type', type: 'ref:equipment_types', required: true },
          { key: 'asset_id', label: 'Asset Code / Equipment Tag', type: 'ref:assets', required: true },
          { key: 'working_hours', label: 'Working Hours', type: 'decimal', min: 0, max: 744, required: true },
          { key: 'idle_hours', label: 'Idle Hours', type: 'decimal', min: 0, max: 744, required: false },
          { key: 'breakdown_hours', label: 'Breakdown Hours', type: 'decimal', min: 0, max: 744, required: false },
          { key: 'available_hours', label: 'Available Hours', type: 'decimal', min: 0, max: 744, required: false },
          { key: 'paid_amount', label: 'Paid Amount (Rs.)', type: 'currency', min: 0, required: false },
          { key: 'remarks', label: 'Remarks', type: 'string', required: false }
        ],
        register_columns: [
          'reporting_period', 'location', 'equipment_type', 'asset_id', 'working_hours', 'idle_hours', 'breakdown_hours', 'available_hours', 'paid_amount', 'source'
        ]
      },
      {
        id: 'FUEL_PURCHASE',
        department_id: 'PM',
        name: 'Fuel Management',
        frequency: 'monthly',
        entry_fields: [
          { key: 'ledger_type', label: 'Ledger Type', type: 'ref:vendors', required: true },
          { key: 'department_beneficiary', label: 'Department', type: 'ref:departments', required: false },
          { key: 'fuel_type', label: 'Fuel Type', type: 'select', options: ['Diesel', 'Petrol', 'Both', 'Diesel (HSD)', 'Engine Oil', 'Hydraulic Oil', 'Lubricants / Grease'], required: false },
          { key: 'payment_type', label: 'Payment Type', type: 'ref:payment_types', required: true },
          { key: 'petrol_quantity', label: 'Petrol Quantity (Ltrs)', type: 'decimal', min: 0, required: false },
          { key: 'petrol_rate', label: 'Petrol Price (Rs. / Ltr)', type: 'decimal', min: 0, required: false },
          { key: 'diesel_quantity', label: 'Diesel Quantity (Ltrs)', type: 'decimal', min: 0, required: false },
          { key: 'diesel_rate', label: 'Diesel Price (Rs. / Ltr)', type: 'decimal', min: 0, required: false },
          { key: 'quantity', label: 'Fuel Quantity (Ltrs)', type: 'decimal', min: 0, required: true },
          { key: 'rate', label: 'Rate (Rs. / Ltr)', type: 'decimal', min: 0, required: true },
          { key: 'paid_amount', label: 'Total Cost (Rs.)', type: 'currency', min: 0, required: true, computed: true },
          { key: 'cash_and_carry', label: 'Cash and Carry', type: 'string', required: false }
        ],
        register_columns: [
          'reporting_period', 'location', 'ledger_type', 'department_beneficiary', 'fuel_type', 'payment_type', 'petrol_quantity', 'petrol_rate', 'diesel_quantity', 'diesel_rate', 'quantity', 'rate', 'paid_amount', 'cash_and_carry', 'source'
        ]
      },
      {
        id: 'STORES_PURCHASE',
        department_id: 'STORES',
        name: 'Material Purchase',
        frequency: 'monthly',
        entry_fields: [
          { key: 'ledger_type', label: 'Ledger Type', type: 'ref:vendors', required: true },
          { key: 'item_name', label: 'Material Description', type: 'string', required: true },
          { key: 'quantity', label: 'Quantity', type: 'decimal', min: 0, required: true },
          { key: 'rate', label: 'Rate (Rs.)', type: 'decimal', min: 0, required: true },
          { key: 'paid_amount', label: 'Total Cost (Rs.)', type: 'currency', min: 0, required: true, computed: true }
        ],
        register_columns: [
          'reporting_period', 'location', 'ledger_type', 'item_name', 'quantity', 'rate', 'paid_amount', 'source'
        ]
      },
      {
        id: 'ADMIN_EXPENSE',
        department_id: 'ADMIN',
        name: 'Admin Expenses',
        frequency: 'monthly',
        entry_fields: [
          { key: 'category', label: 'Expense Category', type: 'string', required: true },
          { key: 'ledger_type', label: 'Ledger Type', type: 'string', required: true },
          { key: 'paid_amount', label: 'Paid Amount (Rs.)', type: 'currency', min: 0.01, required: true },
          { key: 'remarks', label: 'Remarks', type: 'string', required: false }
        ],
        register_columns: [
          'reporting_period', 'location', 'category', 'ledger_type', 'paid_amount', 'source'
        ]
      },
      {
        id: 'PLANNING_PROGRESS',
        department_id: 'PLANNING',
        name: 'Monthly Project Progress',
        frequency: 'monthly',
        entry_fields: [
          { key: 'work_package', label: 'Work Package', type: 'string', required: true },
          { key: 'activity', label: 'Activity Name', type: 'string', required: true },
          { key: 'planned_progress', label: 'Planned Progress (%)', type: 'decimal', min: 0, max: 100, required: true },
          { key: 'actual_progress', label: 'Actual Progress (%)', type: 'decimal', min: 0, max: 100, required: true },
          { key: 'quantity_achieved', label: 'Quantity Achieved', type: 'decimal', min: 0, required: false },
          { key: 'uom', label: 'Unit of Measure', type: 'string', required: false }
        ],
        register_columns: [
          'reporting_period', 'location', 'work_package', 'activity', 'planned_progress', 'actual_progress', 'quantity_achieved', 'uom', 'source'
        ]
      }
    ];
    await reportTypesColl.insertMany(defaultReportTypes);
  }
}

module.exports = {
  getQuarter,
  getMonthName,
  initializeMasterData
};
