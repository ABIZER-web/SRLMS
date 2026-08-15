require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');
const PnrRecord = require('./models/PnrRecord');
const LinenItem = require('./models/LinenItem');
const LinenKit = require('./models/LinenKit');
const TheftIncident = require('./models/TheftIncident');
const BlacklistRecord = require('./models/BlacklistRecord');
const AuditLog = require('./models/AuditLog');
const { generatePnr, zoneForPnr } = require('./utils/pnrGenerator');
const { generateLid, KIT_LINEN_CODES, LINEN_TYPES } = require('./utils/lidGenerator');
const { itemPayload, kitPayload } = require('./utils/qrCode');

// Demo inventory is tagged for the Mumbai zone (region code 8), matching
// the seeded train's origin station (Mumbai Central).
const LINEN_REGION_CODE = 8;
const TOTAL_LINEN_KITS = 15; // kept small (10-20) for fast, easy-to-eyeball testing

const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Ishaan', 'Kabir', 'Arjun', 'Rohan', 'Karan',
  'Saanvi', 'Diya', 'Ananya', 'Priya', 'Neha', 'Riya', 'Zara', 'Meera',
  'Farhan', 'Imran', 'Abizer', 'Zainab', 'Nikhil', 'Sameer', 'Pooja', 'Kavya',
  'Rahul', 'Amit', 'Sunita', 'Deepak', 'Anjali', 'Rakesh',
];
const LAST_NAMES = [
  'Sharma', 'Verma', 'Iyer', 'Nair', 'Khan', 'Patel', 'Reddy', 'Gupta',
  'Saifee', 'Mehta', 'Joshi', 'Kulkarni', 'Bhat', 'Chatterjee', 'Singh', 'Rao',
];

const COACHES = [
  { coachNumber: 'B1', coachClass: '3A', totalSeats: 10, berthCycle: ['LB', 'MB', 'UB', 'SL', 'SU'] },
  { coachNumber: 'B2', coachClass: '2A', totalSeats: 10, berthCycle: ['LB', 'UB', 'SL', 'SU'] },
  { coachNumber: 'S4', coachClass: 'SL', totalSeats: 10, berthCycle: ['LB', 'MB', 'UB', 'SL', 'SU'] },
];

const TRAIN = { trainNumber: '12952', trainName: 'Mumbai Rajdhani Express' };
const ROUTE = { sourceStation: 'Mumbai Central (BCT)', destinationStation: 'New Delhi (NDLS)' };
const JOURNEY_DATE = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // 3 days out

const FARE_BY_CLASS = { '3A': 2145, '2A': 3010, SL: 785 };

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomMobile() {
  return '9' + String(Math.floor(100000000 + Math.random() * 899999999));
}

async function run() {
  await connectDB();

  console.log('[seed] clearing existing demo data...');
  await User.deleteMany({});
  await PnrRecord.deleteMany({});
  await LinenItem.deleteMany({});
  await LinenKit.deleteMany({});
  await TheftIncident.deleteMany({});
  await BlacklistRecord.deleteMany({});
  await AuditLog.deleteMany({});

  // --- Admin ---
  const admin = new User({
    name: 'System Admin',
    role: 'admin',
    empId: process.env.SEED_ADMIN_EMPID || 'ADM001',
  });
  await admin.setPassword(process.env.SEED_ADMIN_PASSWORD || 'Admin@123');
  await admin.save();

  const credentialsTable = [];
  credentialsTable.push(['admin', admin.empId, process.env.SEED_ADMIN_PASSWORD || 'Admin@123']);

  // --- Coach attendants + PNR records, one coach at a time ---
  let empCounter = 1;
  const passengerPool = []; // {pnr, name, coachNumber} - used below to seed a demo incident
  for (const coach of COACHES) {
    const empId = `CA${String(empCounter).padStart(3, '0')}`;
    const attendant = new User({
      name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      role: 'coach_attendant',
      empId,
      assignedCoachNumber: coach.coachNumber,
    });
    const attendantPassword = 'Attendant@123';
    await attendant.setPassword(attendantPassword);
    await attendant.save();
    credentialsTable.push([`coach_attendant (${coach.coachNumber})`, empId, attendantPassword]);
    empCounter += 1;

    for (let seat = 1; seat <= coach.totalSeats; seat++) {
      const pnr = generatePnr();
      const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
      const mobile = randomMobile();

      const record = new PnrRecord({
        pnr,
        zone: zoneForPnr(pnr),
        passengerName: name,
        age: 18 + Math.floor(Math.random() * 55),
        gender: pick(['M', 'F']),
        mobile,
        trainNumber: TRAIN.trainNumber,
        trainName: TRAIN.trainName,
        sourceStation: ROUTE.sourceStation,
        destinationStation: ROUTE.destinationStation,
        journeyDate: JOURNEY_DATE,
        coachNumber: coach.coachNumber,
        coachClass: coach.coachClass,
        seatNumber: seat,
        berthType: coach.berthCycle[(seat - 1) % coach.berthCycle.length],
        bookingStatus: 'Confirmed',
        fare: FARE_BY_CLASS[coach.coachClass],
      });
      await record.save();
      passengerPool.push({ pnr, name, coachNumber: coach.coachNumber });

      // Also create a passenger login for the first 2 seats of each coach,
      // so the passenger dashboard has something to log into and demo.
      if (seat <= 2) {
        const passengerUser = new User({
          name,
          role: 'passenger',
          mobile,
        });
        const passengerPassword = 'Passenger@123';
        await passengerUser.setPassword(passengerPassword);
        await passengerUser.save();
        credentialsTable.push([`passenger (PNR ${pnr})`, mobile, passengerPassword]);
      }
    }
  }

  // --- Linen Ops staff (the private laundry contractor's own account) ---
  const linenOp = new User({
    name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    role: 'linen_operator',
    empId: 'LOP001',
  });
  const linenOpPassword = 'LinenOps@123';
  await linenOp.setPassword(linenOpPassword);
  await linenOp.save();
  credentialsTable.push(['linen_operator', linenOp.empId, linenOpPassword]);

  // --- Linen inventory: sealed kits (2 bedsheets + blanket + pillow cover
  //     + towel, each individually RFID/QR-tagged, then grouped under one
  //     Kit QR) and standalone pillows (their own separate QR), exactly
  //     as the private contractor's registration flow produces them. ---
  console.log(`\n[seed] generating ${TOTAL_LINEN_KITS} linen kits + ${TOTAL_LINEN_KITS} pillows (LID + QR tagged)...`);

  const firstKitQrCodes = [];
  const seedYear = new Date().getFullYear();
  let demoMissingItem = null; // one item from the first kit, used to seed a demo incident below

  for (let n = 1; n <= TOTAL_LINEN_KITS; n++) {
    const kitItemIds = [];
    for (const linenCode of KIT_LINEN_CODES) {
      const lid = generateLid(LINEN_REGION_CODE, linenCode);
      const qrCode = `LINEN-${lid}`;
      const item = new LinenItem({
        lid,
        regionCode: LINEN_REGION_CODE,
        linenCode,
        itemType: LINEN_TYPES[linenCode],
        qrCode,
        status: 'in_kit',
        registeredByEmpId: linenOp.empId,
      });
      item.qrPayload = itemPayload(item);
      await item.save();
      kitItemIds.push(item._id);
    }

    const kitQrCode = `KIT-${seedYear}-${String(n).padStart(6, '0')}`;
    const kit = new LinenKit({
      qrCode: kitQrCode,
      items: kitItemIds,
      status: 'sealed',
      registeredByEmpId: linenOp.empId,
    });
    const kitItemDocs = await LinenItem.find({ _id: { $in: kitItemIds } });
    kit.qrPayload = kitPayload(kit, kitItemDocs.map((i) => i.lid));
    await kit.save();
    if (n <= 3) firstKitQrCodes.push(kitQrCode);
    if (n === 1) demoMissingItem = kitItemDocs[0]; // e.g. Bed Sheet 1

    const pillowLid = generateLid(LINEN_REGION_CODE, 3);
    const pillowQrCode = `LINEN-${pillowLid}`;
    const pillow = new LinenItem({
      lid: pillowLid,
      regionCode: LINEN_REGION_CODE,
      linenCode: 3,
      itemType: LINEN_TYPES[3],
      qrCode: pillowQrCode,
      status: 'available',
      registeredByEmpId: linenOp.empId,
    });
    pillow.qrPayload = itemPayload(pillow);
    await pillow.save();
  }

  console.log(`[seed] linen inventory ready. First ${firstKitQrCodes.length} kit QR codes for demo scanning:`);
  for (const code of firstKitQrCodes) console.log(`  ${code}`);
  console.log('[seed] matching pillow QR codes are each item\'s own LINEN-<lid> code (see linenitems collection).');

  // --- Railway Officer (the railway department's own account) ---
  const railwayOfficer = new User({
    name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    role: 'railway_officer',
    empId: 'RLY001',
  });
  const railwayOfficerPassword = 'Railway@123';
  await railwayOfficer.setPassword(railwayOfficerPassword);
  await railwayOfficer.save();
  credentialsTable.push(['railway_officer', railwayOfficer.empId, railwayOfficerPassword]);

  // --- Demo incident + blacklist-under-review + audit trail, so the ---
  // --- Railway dashboard has real data to show on first login. ---
  // This simulates: item was assigned to a passenger, then caught by an
  // exit gate scan while still checked out (never returned) - the same
  // path routes/gates.js:POST /scan produces for real.
  if (demoMissingItem && passengerPool.length > 0) {
    const demoPassenger = passengerPool[0];

    await LinenItem.updateOne({ _id: demoMissingItem._id }, { $set: { status: 'missing', assignedPnr: demoPassenger.pnr } });

    const incident = await TheftIncident.create({
      lid: demoMissingItem.lid,
      itemType: demoMissingItem.itemType,
      pnr: demoPassenger.pnr,
      passengerName: demoPassenger.name,
      coachNumber: demoPassenger.coachNumber,
      gateId: 'EXIT-GATE-1',
      status: 'open',
    });

    const blacklist = await BlacklistRecord.create({
      recordId: 'BL-000001',
      passengerName: demoPassenger.name,
      pnr: demoPassenger.pnr,
      incident: incident._id,
      reasonCategory: 'Linen not returned / suspected theft',
      status: 'under_review',
      createdByEmpId: railwayOfficer.empId,
    });

    await AuditLog.insertMany([
      {
        actorEmpId: 'EXIT-GATE-1',
        actorRole: 'gate',
        action: 'incident.create',
        entityType: 'TheftIncident',
        entityId: String(incident._id),
        description: `Gate EXIT-GATE-1 flagged ${demoMissingItem.itemType} (${demoMissingItem.lid}) still checked out — PNR ${demoPassenger.pnr}`,
      },
      {
        actorEmpId: railwayOfficer.empId,
        actorRole: 'railway_officer',
        action: 'blacklist.propose',
        entityType: 'BlacklistRecord',
        entityId: String(blacklist._id),
        description: `Blacklist proposed for ${demoPassenger.name} (PNR ${demoPassenger.pnr}) — BL-000001`,
      },
    ]);

    console.log(`\n[seed] demo incident + blacklist-under-review seeded for PNR ${demoPassenger.pnr} (${demoPassenger.name}), item ${demoMissingItem.lid}.`);
  }

  console.log('\n[seed] done. Demo login credentials:\n');
  console.log('ROLE'.padEnd(28), 'LOGIN ID'.padEnd(14), 'PASSWORD');
  console.log('-'.repeat(60));
  for (const [role, id, pw] of credentialsTable) {
    console.log(role.padEnd(28), String(id).padEnd(14), pw);
  }
  console.log(`\n[seed] ${COACHES.length} coaches, ${COACHES.length * COACHES[0].totalSeats} PNR records created.`);
  console.log('[seed] open MongoDB Compass on mongodb://127.0.0.1:27017/railway-pnr-tracker to browse the data.');

  process.exit(0);
}

run().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
