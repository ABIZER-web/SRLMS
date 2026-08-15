// Mirrors the SRLMS ESP8266 + RC522 firmware's LID scheme exactly, so
// software-generated demo RFIDs are indistinguishable in format from ones
// actually written to hardware tags later.
//
// LID = 10 digits: [1-digit REGION][1-digit LINEN TYPE][8-digit UNIQUE]
// On the physical tag this is stored in MIFARE Block 4 as "SRLMS:" + LID
// (16 bytes total). We only model the LID string here - the software side
// never talks to a physical tag.

const REGION_NAMES = {
  1: 'Secunderabad Zone',
  2: 'New Delhi Zone',
  3: 'New Delhi Zone',
  4: 'Chennai Zone',
  5: 'Chennai Zone',
  6: 'Kolkata Zone',
  7: 'Kolkata Zone',
  8: 'Mumbai Zone',
  9: 'Mumbai Zone',
};

// Matches firmware's selectLinen() menu exactly (1-6 real, 7-9 reserved).
const LINEN_TYPES = {
  1: 'Bed Sheet 1',
  2: 'Bed Sheet 2',
  3: 'Pillow',
  4: 'Blanket',
  5: 'Pillow Cover',
  6: 'Face Towel',
};

// Items that ship pre-linked inside the sealed kit paper bag.
// Pillow (code 3) is deliberately excluded - it's scanned separately
// because it can't physically fit in the flat sealed bag.
const KIT_LINEN_CODES = [1, 2, 4, 5, 6];

const usedLids = new Set();

function randomUnique8() {
  return String(Math.floor(10000000 + Math.random() * 90000000));
}

function generateLid(regionCode, linenCode) {
  let lid;
  do {
    lid = `${regionCode}${linenCode}${randomUnique8()}`;
  } while (usedLids.has(lid));
  usedLids.add(lid);
  return lid;
}

function registerExistingLid(lid) {
  usedLids.add(lid);
}

function parseLid(lid) {
  if (!/^\d{10}$/.test(lid)) return null;
  const regionCode = Number(lid[0]);
  const linenCode = Number(lid[1]);
  return {
    lid,
    regionCode,
    region: REGION_NAMES[regionCode] || 'Unknown Region',
    linenCode,
    linenType: LINEN_TYPES[linenCode] || 'Reserved',
    uniqueNumber: lid.slice(2),
  };
}

module.exports = {
  REGION_NAMES,
  LINEN_TYPES,
  KIT_LINEN_CODES,
  generateLid,
  registerExistingLid,
  parseLid,
};
