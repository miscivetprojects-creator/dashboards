const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/civet_dashboards');

async function run() {
  await client.connect();
  const db = client.db();
  const coll = db.collection('monthly_report_records');
  const fuelRecs = await coll.find({
    $or: [
      { report_type_id: 'FUEL_PURCHASE' },
      { category: 'Fuel' },
      { department_id: 'FUEL' },
      { 'data.fuel_type': { $exists: true, $ne: '' } }
    ]
  }).toArray();
  console.log('Total fuel records in DB:', fuelRecs.length);
  const byLoc = {};
  fuelRecs.forEach(r => {
    const loc = r.location_name || r.location_id || 'Unknown';
    if (!byLoc[loc]) byLoc[loc] = [];
    byLoc[loc].push(r);
  });
  Object.keys(byLoc).forEach(l => {
    console.log(l + ': ' + byLoc[l].length + ' records');
    const first = byLoc[l][0];
    console.log('   Sample fields opBal:', first.opening_balance, 'bal:', first.balance, 'cost:', first.total_cost, 'paid:', first.paid_amount);
  });
  await client.close();
}

run();
