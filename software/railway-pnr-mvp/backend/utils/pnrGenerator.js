// Generates demo PNRs that follow the real Indian Railways PNR structure:
//   digit 1        -> zone / PRS cluster
//   digits 2-3      -> PRS server/location node
//   digits 4-10 (7) -> unique sequential-looking counter, shuffled for realism
//
// This is for DEMO DATA ONLY. In production the PNR always comes from IRCTC
// at booking time - this app never generates real PNRs, it only simulates
// them so the coach-attendant / admin views have realistic-looking data to
// work with in the prototype.

const ZONE_MAP = {
  1: 'Secunderabad PRS (South Central Railway)',
  2: 'New Delhi PRS (Northern Railway)',
  3: 'New Delhi PRS (North Central / North Western / North Eastern Railway)',
  4: 'Chennai PRS (Southern Railway)',
  5: 'Chennai PRS (South Western / South Central Railway)',
  6: 'Kolkata PRS (Eastern Railway)',
  7: 'Kolkata PRS (South Eastern / East Central / East Coast / NE Frontier Railway)',
  8: 'Mumbai PRS (Central Railway)',
  9: 'Mumbai PRS (Western / West Central Railway)',
};

const usedPnrs = new Set();

function randomDigits(n) {
  let out = '';
  for (let i = 0; i < n; i++) out += Math.floor(Math.random() * 10);
  return out;
}

function generatePnr() {
  let pnr;
  do {
    const zoneDigit = String(1 + Math.floor(Math.random() * 9)); // 1-9
    const prsNode = String(Math.floor(Math.random() * 100)).padStart(2, '0'); // 00-99
    const counter = randomDigits(7);
    pnr = `${zoneDigit}${prsNode}${counter}`;
  } while (usedPnrs.has(pnr));
  usedPnrs.add(pnr);
  return pnr;
}

function zoneForPnr(pnr) {
  const zoneDigit = Number(pnr[0]);
  return ZONE_MAP[zoneDigit] || 'Unknown zone';
}

module.exports = { generatePnr, zoneForPnr, ZONE_MAP };
