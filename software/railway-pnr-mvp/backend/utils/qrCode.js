const QRCode = require('qrcode');

// Every QR encodes a small JSON payload with the item/kit's real data, not
// just a bare code string - so scanning it (even offline) shows what it is.
// The `code` field is still the authoritative lookup key against the DB.

function itemPayload(item) {
  return JSON.stringify({
    type: item.linenCode === 3 ? 'PILLOW' : 'LINEN_ITEM',
    code: item.qrCode,
    lid: item.lid,
    itemType: item.itemType,
    regionCode: item.regionCode,
  });
}

function kitPayload(kit, itemLids) {
  return JSON.stringify({
    type: 'LINEN_KIT',
    code: kit.qrCode,
    itemCount: itemLids.length,
    itemLids,
  });
}

// Renders a PNG data URL (base64) for any payload string. Generated on
// demand rather than stored, so documents stay small - only the payload
// string itself is persisted.
async function toDataUrl(payload) {
  return QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', margin: 1, width: 240 });
}

module.exports = { itemPayload, kitPayload, toDataUrl };
