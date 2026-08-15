# SRLMS Hardware — RFID Tag Read / Write / Erase Firmware

This folder contains the firmware that runs on the **demo / prototype**
hardware: an ESP8266 (NodeMCU) driving an RC522 (13.56 MHz, MIFARE) RFID
reader/writer. This is the piece that actually **puts a unique number on
each RFID tag** — see the main [`../README.md`](../README.md) for how this
fits into the rest of SRLMS.

## Files
- `arduino/SRLMS_RFID_ESP8266.ino` — the full sketch (Write/Register, Read,
  Erase, over the Serial Monitor).

## Bill of materials (prototype)
| Part | Approx. cost (INR) |
|---|---|
| RC522 RFID reader/writer module | ₹120 – ₹200 |
| ESP8266 NodeMCU (Wi-Fi + Bluetooth capable dev kit) | ₹300 – ₹500 |
| 13.56 MHz MIFARE RFID tag/keyfob | ₹15 – ₹40 |
| **Total** | **≈ ₹700 – ₹1,200** |

## Wiring (ESP8266 ↔ RC522)
| RC522 pin | ESP8266 pin |
|---|---|
| SDA / SS | GPIO4 |
| SCK | GPIO14 |
| MOSI | GPIO13 |
| MISO | GPIO12 |
| RST | GPIO5 |
| 3.3V | 3.3V |
| GND | GND |

> RC522 is a 3.3V module — do **not** power it from 5V.

## Arduino IDE setup
1. Install the **ESP8266 board package** (Boards Manager → search
   `esp8266` → install, or add
   `https://arduino.esp8266.com/stable/package_esp8266com_index.json` to
   *Additional Board Manager URLs*).
2. Install the **MFRC522** library by *miguelbalboa* (Library Manager →
   search `MFRC522`).
3. Select your board (e.g. `NodeMCU 1.0 (ESP-12E Module)`) and the correct
   COM port.
4. Open `arduino/SRLMS_RFID_ESP8266.ino`, wire the module as above, and
   upload.
5. Open the **Serial Monitor** at `115200` baud, line ending set to
   **Newline**.

## Using the firmware
On boot the ESP8266 prints a menu to the Serial Monitor:

```
1 = WRITE / REGISTER RFID
2 = READ RFID DATA
3 = ERASE RFID DATA
```

- **1 (Write/Register):** walks you through selecting a region (1 digit),
  a linen type (1 digit), then scanning a blank tag. It authenticates
  MIFARE block 4 with the default key (`FF FF FF FF FF FF`), checks the
  block is empty, auto-generates an 8-digit unique number (checked against
  numbers already used, stored in EEPROM so duplicates can't happen even
  after a reboot), shows you the full 10-digit **LID** for approval, then
  writes `SRLMS:<LID>` (16 bytes) to block 4 and reads it back to verify.
- **2 (Read):** scans any tag, authenticates, and prints the decoded LID
  (region, linen type, unique number) if it's SRLMS data, or reports
  "NOT REGISTERED" if it isn't.
- **3 (Erase):** clears the SRLMS data from block 4 only (the tag's
  factory UID is never touched), after a confirmation prompt and a final
  re-authentication.

## LID format
```
[1-digit region][1-digit linen type][8-digit unique number] = 10 digits

Example: 8 4 58372146
         │ │ └──────── unique asset number (auto-generated, deduplicated in EEPROM)
         │ └────────── linen type (1=Bed Sheet 1 … 6=Face Towel)
         └──────────── region (8/9 = Mumbai, 1 = Secunderabad, 2/3 = New Delhi, 4/5 = Chennai, 6/7 = Kolkata)
```

This is exactly the numbering scheme the software backend's
`lidGenerator.js` mirrors, so tags produced by real hardware and demo tags
generated in software are format-identical — see
[`../software/railway-pnr-mvp/backend/utils/lidGenerator.js`](../software/railway-pnr-mvp/backend/utils/lidGenerator.js).

## Path to production hardware
This RC522 setup is a **short-range (0–5 cm) prototype** for proving the
numbering/write/read/erase logic on the bench. The production design swaps
this for a **UHF (865–868 MHz) fixed-gate reader system** with a 3–7 m read
range, so linen can be detected through a bag without unpacking it — see
the hardware overview and gate-detection diagrams in
[`../docs/images/`](../docs/images/) and the write-up in the main README.
