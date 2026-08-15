#include <SPI.h>
#include <MFRC522.h>
#include <EEPROM.h>

// ============================================================
// SRLMS RFID MANAGEMENT SYSTEM
// ESP8266 + RC522
//
// MENU
// 1 = WRITE / REGISTER
// 2 = READ
// 3 = ERASE
//
// RFID DATA IS STORED IN MIFARE BLOCK 4
//
// LID FORMAT:
// [REGION 1 DIGIT][LINEN 1 DIGIT][UNIQUE 8 DIGITS]
// Example:
// 8458372146
//
// 8 = Mumbai
// 4 = Blanket
// 58372146 = Unique Asset Number
// ============================================================


// ============================================================
// RC522 CONNECTION
// ============================================================
//
// ESP8266 GPIO:
//
// RC522 SDA/SS  -> GPIO4
// RC522 RST     -> GPIO5
// RC522 SCK     -> GPIO14
// RC522 MISO    -> GPIO12
// RC522 MOSI    -> GPIO13
// RC522 3.3V    -> 3.3V
// RC522 GND     -> GND
//
// ============================================================

#define RFID_SS   4
#define RFID_RST  5

MFRC522 rfid(RFID_SS, RFID_RST);


// ============================================================
// RFID MEMORY
// ============================================================

#define DATA_BLOCK 4

// 16 bytes exactly:
//
// S R L M S : 8 4 5 8 3 7 2 1 4 6
//
// "SRLMS:" = 6 bytes
// LID      = 10 bytes
//
// Total = 16 bytes

const char DATA_PREFIX[] = "SRLMS:";


// ============================================================
// MIFARE DEFAULT KEY
// ============================================================

MFRC522::MIFARE_Key key;


// ============================================================
// EEPROM DATABASE
//
// We keep previously generated 8-digit numbers here.
// This prevents the same unique number being generated
// again even after ESP8266 restart.
//
// EEPROM size = 512 bytes
// ============================================================

#define EEPROM_SIZE 512

#define EEPROM_MAGIC_ADDRESS 0
#define EEPROM_COUNT_ADDRESS 4
#define EEPROM_DATA_ADDRESS 6

#define EEPROM_MAGIC 0x53524C4DUL   // "SRLM"

#define MAX_STORED_NUMBERS 120

uint16_t storedNumberCount = 0;


// ============================================================
// SETUP
// ============================================================

void setup() {

  Serial.begin(115200);

  delay(1500);

  Serial.println();
  Serial.println();
  Serial.println("==============================================");
  Serial.println("       SRLMS RFID MANAGEMENT SYSTEM");
  Serial.println("==============================================");

  Serial.println();
  Serial.println("Starting ESP8266...");

  // ----------------------------------------------------------
  // EEPROM
  // ----------------------------------------------------------

  EEPROM.begin(EEPROM_SIZE);

  initializeEEPROM();

  // ----------------------------------------------------------
  // RFID
  // ----------------------------------------------------------

  SPI.begin();

  rfid.PCD_Init();

  delay(100);

  // ----------------------------------------------------------
  // DEFAULT KEY
  // ----------------------------------------------------------

  for (byte i = 0; i < 6; i++) {
    key.keyByte[i] = 0xFF;
  }

  Serial.println();
  Serial.println("RFID Reader : RC522");
  Serial.println("Controller : ESP8266");
  Serial.println("Data Block : 4");
  Serial.println("Key A      : FF FF FF FF FF FF");

  Serial.println();
  Serial.println("SYSTEM READY");

  delay(1000);

  printMainMenu();
}


// ============================================================
// MAIN LOOP
// ============================================================

void loop() {

  if (Serial.available()) {

    String command = Serial.readStringUntil('\n');

    command.trim();

    if (command.length() == 0) {
      return;
    }

    if (command == "1") {

      writeMode();

    }

    else if (command == "2") {

      readMode();

    }

    else if (command == "3") {

      eraseMode();

    }

    else {

      Serial.println();
      Serial.println("Invalid option.");
      Serial.println("Please enter 1, 2 or 3.");
      Serial.println();

      printMainMenu();
    }
  }
}


// ============================================================
// MAIN MENU
// ============================================================

void printMainMenu() {

  Serial.println();
  Serial.println();
  Serial.println("==============================================");
  Serial.println("              SRLMS MAIN MENU");
  Serial.println("==============================================");

  Serial.println();
  Serial.println("1 = WRITE / REGISTER RFID");
  Serial.println("2 = READ RFID DATA");
  Serial.println("3 = ERASE RFID DATA");

  Serial.println();
  Serial.println("----------------------------------------------");
  Serial.println("Enter option:");
}


// ============================================================
// EEPROM INITIALIZATION
// ============================================================

void initializeEEPROM() {

  uint32_t magic = 0;

  EEPROM.get(EEPROM_MAGIC_ADDRESS, magic);

  if (magic != EEPROM_MAGIC) {

    Serial.println();
    Serial.println("EEPROM database not initialized.");
    Serial.println("Creating new local SRLMS database...");

    magic = EEPROM_MAGIC;

    EEPROM.put(EEPROM_MAGIC_ADDRESS, magic);

    storedNumberCount = 0;

    EEPROM.put(
      EEPROM_COUNT_ADDRESS,
      storedNumberCount
    );

    EEPROM.commit();

    Serial.println("EEPROM database created.");
  }

  else {

    EEPROM.get(
      EEPROM_COUNT_ADDRESS,
      storedNumberCount
    );

    if (storedNumberCount > MAX_STORED_NUMBERS) {
      storedNumberCount = 0;
    }

    Serial.print("Existing unique numbers in database: ");
    Serial.println(storedNumberCount);
  }
}


// ============================================================
// WRITE / REGISTER MODE
// ============================================================

void writeMode() {

  Serial.println();
  Serial.println();
  Serial.println("==============================================");
  Serial.println("         WRITE / REGISTER RFID");
  Serial.println("==============================================");

  // ----------------------------------------------------------
  // STEP 1
  // ----------------------------------------------------------

  int region = selectRegion();

  if (region == 0) {

    Serial.println("Registration cancelled.");

    delay(1000);

    printMainMenu();

    return;
  }


  // ----------------------------------------------------------
  // STEP 2
  // ----------------------------------------------------------

  int linen = selectLinen();

  if (linen == 0) {

    Serial.println("Registration cancelled.");

    delay(1000);

    printMainMenu();

    return;
  }


  // ----------------------------------------------------------
  // STEP 3
  // ----------------------------------------------------------

  Serial.println();
  Serial.println("==============================================");
  Serial.println("STEP 3 - SCAN RFID TAG");
  Serial.println("==============================================");

  Serial.println();
  Serial.println("Place a NEW RFID tag on the RC522 reader.");
  Serial.println("Waiting for RFID...");

  if (!waitForCard()) {

    Serial.println("RFID scan failed.");

    printMainMenu();

    return;
  }


  String uid = getUIDString();

  Serial.println();
  Serial.println("RFID DETECTED");
  Serial.println("----------------------------------------------");

  Serial.print("RFID UID    : ");
  Serial.println(uid);

  printCardType();


  // ----------------------------------------------------------
  // STEP 4
  // ----------------------------------------------------------

  Serial.println();
  Serial.println("==============================================");
  Serial.println("STEP 4 - AUTHENTICATION CHECK");
  Serial.println("==============================================");

  Serial.println();
  Serial.println("Testing authentication on Block 4...");
  delay(1000);

  if (!authenticateBlock(DATA_BLOCK)) {

    Serial.println();
    Serial.println("AUTHENTICATION FAILED.");

    Serial.println();
    Serial.println("The tag cannot be safely written.");

    stopRFID();

    Serial.println();
    Serial.println("Returning to main menu...");

    delay(1500);

    printMainMenu();

    return;
  }

  Serial.println();
  Serial.println("AUTHENTICATION SUCCESS!");
  Serial.println("Default Key A works.");
  Serial.println("Block 4 can be accessed.");

  delay(800);


  // ----------------------------------------------------------
  // STEP 5
  // CHECK EXISTING DATA
  // ----------------------------------------------------------

  Serial.println();
  Serial.println("==============================================");
  Serial.println("STEP 5 - CHECK EXISTING DATA");
  Serial.println("==============================================");

  byte existingData[18];

  if (!readBlock(DATA_BLOCK, existingData)) {

    Serial.println();
    Serial.println("Could not read Block 4.");

    stopRFID();

    delay(1000);

    printMainMenu();

    return;
  }


  if (isSRLMSData(existingData)) {

    String oldLID = "";

    for (int i = 6; i < 16; i++) {
      oldLID += (char)existingData[i];
    }

    Serial.println();
    Serial.println("WARNING!");
    Serial.println("This RFID already contains SRLMS data.");

    Serial.print("Existing LID : ");
    Serial.println(oldLID);

    Serial.println();
    Serial.println("To use this tag again:");
    Serial.println("1. Return to main menu");
    Serial.println("2. Choose option 3");
    Serial.println("3. Erase the existing SRLMS data");
    Serial.println("4. Then register the tag again.");

    stopRFID();

    delay(1500);

    printMainMenu();

    return;
  }


  if (!isBlockEmpty(existingData)) {

    Serial.println();
    Serial.println("WARNING!");
    Serial.println("Block 4 contains data.");
    Serial.println("SRLMS will NOT overwrite unknown data.");

    Serial.println();
    Serial.println("Use option 3 only if you are certain");
    Serial.println("that this tag should be erased.");

    stopRFID();

    delay(1500);

    printMainMenu();

    return;
  }

  Serial.println();
  Serial.println("Block 4 is EMPTY.");
  Serial.println("Tag is ready for SRLMS registration.");

  delay(1000);


  // ----------------------------------------------------------
  // STEP 6
  // GENERATE UNIQUE NUMBER
  // ----------------------------------------------------------

  Serial.println();
  Serial.println("==============================================");
  Serial.println("STEP 6 - GENERATE UNIQUE NUMBER");
  Serial.println("==============================================");

  String uniqueNumber = generateUniqueNumber();

  if (uniqueNumber == "") {

    Serial.println();
    Serial.println("ERROR:");
    Serial.println("Could not generate unique number.");

    stopRFID();

    delay(1000);

    printMainMenu();

    return;
  }


  // ----------------------------------------------------------
  // STEP 7
  // CREATE LID
  // ----------------------------------------------------------

  String lid =
    String(region) +
    String(linen) +
    uniqueNumber;


  Serial.println();
  Serial.println("==============================================");
  Serial.println("STEP 7 - LID GENERATED");
  Serial.println("==============================================");

  Serial.println();

  Serial.print("Region Code    : ");
  Serial.println(region);

  Serial.print("Region         : ");
  Serial.println(getRegionName(region));

  Serial.print("Linen Code     : ");
  Serial.println(linen);

  Serial.print("Linen Type     : ");
  Serial.println(getLinenName(linen));

  Serial.print("Unique Number  : ");
  Serial.println(uniqueNumber);

  Serial.println();

  Serial.print("FINAL 10-DIGIT LID: ");
  Serial.println(lid);

  Serial.println();


  // ----------------------------------------------------------
  // STEP 8
  // USER APPROVAL
  // ----------------------------------------------------------

  Serial.println("==============================================");
  Serial.println("STEP 8 - APPROVE LID");
  Serial.println("==============================================");

  Serial.println();
  Serial.println("The RFID has NOT been written yet.");

  Serial.println();
  Serial.print("LID: ");
  Serial.println(lid);

  Serial.println();

  Serial.println("Enter:");
  Serial.println("1 = APPROVE and continue");
  Serial.println("0 = CANCEL");

  Serial.println();
  Serial.println("Your choice:");

  String approval = readSerialLine();

  if (approval != "1") {

    Serial.println();
    Serial.println("WRITE CANCELLED.");
    Serial.println("Nothing was written to the RFID.");

    stopRFID();

    delay(1200);

    printMainMenu();

    return;
  }


  // ----------------------------------------------------------
  // STEP 9
  // RE-AUTHENTICATE
  // ----------------------------------------------------------

  Serial.println();
  Serial.println("==============================================");
  Serial.println("STEP 9 - FINAL AUTHENTICATION");
  Serial.println("==============================================");

  Serial.println();
  Serial.println("Re-authenticating RFID before writing...");
  delay(1000);

  if (!authenticateBlock(DATA_BLOCK)) {

    Serial.println();
    Serial.println("FINAL AUTHENTICATION FAILED.");
    Serial.println("WRITE ABORTED.");

    stopRFID();

    delay(1200);

    printMainMenu();

    return;
  }

  Serial.println();
  Serial.println("FINAL AUTHENTICATION SUCCESS!");
  Serial.println("Writing is now authorized.");

  delay(1000);


  // ----------------------------------------------------------
  // SAFETY CHECK BEFORE WRITE
  // ----------------------------------------------------------

  byte checkBeforeWrite[18];

  if (!readBlock(DATA_BLOCK, checkBeforeWrite)) {

    Serial.println();
    Serial.println("Could not perform final safety check.");
    Serial.println("WRITE ABORTED.");

    stopRFID();

    delay(1200);

    printMainMenu();

    return;
  }


  if (!isBlockEmpty(checkBeforeWrite)) {

    Serial.println();
    Serial.println("SAFETY STOP!");
    Serial.println("Block 4 is no longer empty.");
    Serial.println("WRITE ABORTED.");

    stopRFID();

    delay(1200);

    printMainMenu();

    return;
  }


  // ----------------------------------------------------------
  // STEP 10
  // WRITE
  // ----------------------------------------------------------

  Serial.println();
  Serial.println("==============================================");
  Serial.println("STEP 10 - WRITING RFID");
  Serial.println("==============================================");

  Serial.println();
  Serial.println("Writing SRLMS LID to Block 4...");
  Serial.println("Please DO NOT REMOVE the RFID tag.");

  delay(1500);


  byte dataBlock[16];

  memset(dataBlock, 0, 16);

  String dataToWrite = "SRLMS:" + lid;

  for (int i = 0; i < 16; i++) {
    dataBlock[i] = dataToWrite[i];
  }


  MFRC522::StatusCode status =
    rfid.MIFARE_Write(
      DATA_BLOCK,
      dataBlock,
      16
    );


  if (status != MFRC522::STATUS_OK) {

    Serial.println();
    Serial.println("==============================================");
    Serial.println("WRITE FAILED");
    Serial.println("==============================================");

    Serial.print("RFID Error: ");
    Serial.println(rfid.GetStatusCodeName(status));

    stopRFID();

    delay(1500);

    printMainMenu();

    return;
  }


  Serial.println();
  Serial.println("WRITE COMMAND SUCCESSFUL.");

  delay(1200);


  // ----------------------------------------------------------
  // STEP 11
  // READ BACK
  // ----------------------------------------------------------

  Serial.println();
  Serial.println("==============================================");
  Serial.println("STEP 11 - READ BACK VERIFICATION");
  Serial.println("==============================================");

  Serial.println();
  Serial.println("Reading Block 4 again...");
  delay(1000);


  if (!authenticateBlock(DATA_BLOCK)) {

    Serial.println();
    Serial.println("Authentication failed during verification.");
    Serial.println("DO NOT ASSUME REGISTRATION SUCCESS.");

    stopRFID();

    delay(1200);

    printMainMenu();

    return;
  }


  byte verifyData[18];

  if (!readBlock(DATA_BLOCK, verifyData)) {

    Serial.println();
    Serial.println("Could not read data for verification.");

    stopRFID();

    delay(1200);

    printMainMenu();

    return;
  }


  String verifiedData = "";

  for (int i = 6; i < 16; i++) {
    verifiedData += (char)verifyData[i];
  }


  Serial.print("Written LID : ");
  Serial.println(lid);

  Serial.print("Read LID    : ");
  Serial.println(verifiedData);


  // ----------------------------------------------------------
  // STEP 12
  // VERIFY
  // ----------------------------------------------------------

  if (verifiedData != lid) {

    Serial.println();
    Serial.println("==============================================");
    Serial.println("REGISTRATION FAILED");
    Serial.println("==============================================");

    Serial.println();
    Serial.println("Data mismatch detected.");
    Serial.println("The RFID must NOT be used.");

    stopRFID();

    delay(1500);

    printMainMenu();

    return;
  }


  // ----------------------------------------------------------
  // STEP 13
  // SAVE UNIQUE NUMBER
  // ----------------------------------------------------------

  addUsedNumber(uniqueNumber);


  // ----------------------------------------------------------
  // SUCCESS
  // ----------------------------------------------------------

  Serial.println();
  Serial.println();
  Serial.println("==============================================");
  Serial.println("       REGISTRATION SUCCESS");
  Serial.println("==============================================");

  Serial.println();

  Serial.print("RFID UID    : ");
  Serial.println(uid);

  Serial.print("LID         : ");
  Serial.println(lid);

  Serial.print("Region      : ");
  Serial.println(getRegionName(region));

  Serial.print("Linen       : ");
  Serial.println(getLinenName(linen));

  Serial.println("Status      : REGISTERED");

  Serial.println();
  Serial.println("RFID DATA VERIFIED SUCCESSFULLY.");

  Serial.println();
  Serial.println("The tag is now ready for use.");

  stopRFID();

  delay(2500);

  printMainMenu();
}


// ============================================================
// READ MODE
// ============================================================

void readMode() {

  Serial.println();
  Serial.println();
  Serial.println("==============================================");
  Serial.println("             READ RFID DATA");
  Serial.println("==============================================");

  Serial.println();
  Serial.println("Place RFID tag on reader.");
  Serial.println("Waiting for RFID...");


  if (!waitForCard()) {

    Serial.println("RFID scan failed.");

    printMainMenu();

    return;
  }


  String uid = getUIDString();


  Serial.println();
  Serial.println("RFID DETECTED");
  Serial.println("----------------------------------------------");

  Serial.print("RFID UID : ");
  Serial.println(uid);


  // ----------------------------------------------------------
  // AUTHENTICATION
  // ----------------------------------------------------------

  Serial.println();
  Serial.println("Checking authentication...");
  delay(800);


  if (!authenticateBlock(DATA_BLOCK)) {

    Serial.println();
    Serial.println("AUTHENTICATION FAILED.");
    Serial.println("Cannot read SRLMS data.");

    stopRFID();

    delay(1200);

    printMainMenu();

    return;
  }


  Serial.println();
  Serial.println("AUTHENTICATION SUCCESS.");

  delay(800);


  // ----------------------------------------------------------
  // READ BLOCK
  // ----------------------------------------------------------

  byte buffer[18];

  if (!readBlock(DATA_BLOCK, buffer)) {

    Serial.println();
    Serial.println("Could not read Block 4.");

    stopRFID();

    delay(1200);

    printMainMenu();

    return;
  }


  // ----------------------------------------------------------
  // CHECK SRLMS DATA
  // ----------------------------------------------------------

  Serial.println();
  Serial.println("==============================================");
  Serial.println("              RFID INFORMATION");
  Serial.println("==============================================");


  if (!isSRLMSData(buffer)) {

    Serial.println();
    Serial.println("This RFID does not contain SRLMS data.");

    Serial.println();
    Serial.println("Status: NOT REGISTERED");

    stopRFID();

    delay(1500);

    printMainMenu();

    return;
  }


  String lid = "";

  for (int i = 6; i < 16; i++) {
    lid += (char)buffer[i];
  }


  // ----------------------------------------------------------
  // DISPLAY INFORMATION
  // ----------------------------------------------------------

  int region = lid.substring(0, 1).toInt();
  int linen = lid.substring(1, 2).toInt();

  String uniqueNumber =
    lid.substring(2, 10);


  Serial.println();

  Serial.print("RFID UID       : ");
  Serial.println(uid);

  Serial.print("LID            : ");
  Serial.println(lid);

  Serial.print("Region Code    : ");
  Serial.println(region);

  Serial.print("Region         : ");
  Serial.println(getRegionName(region));

  Serial.print("Linen Code     : ");
  Serial.println(linen);

  Serial.print("Linen Type     : ");
  Serial.println(getLinenName(linen));

  Serial.print("Unique Number  : ");
  Serial.println(uniqueNumber);

  Serial.println();
  Serial.println("Status         : REGISTERED");

  Serial.println();
  Serial.println("READ COMPLETE.");

  stopRFID();

  delay(2000);

  printMainMenu();
}


// ============================================================
// ERASE MODE
// ============================================================

void eraseMode() {

  Serial.println();
  Serial.println();
  Serial.println("==============================================");
  Serial.println("              ERASE RFID DATA");
  Serial.println("==============================================");

  Serial.println();
  Serial.println("IMPORTANT:");
  Serial.println("This operation erases SRLMS data from");
  Serial.println("Block 4 only.");
  Serial.println();
  Serial.println("The RFID UID is NOT erased.");
  Serial.println("The RFID manufacturer data is NOT erased.");

  Serial.println();
  Serial.println("Place RFID tag on reader.");
  Serial.println("Waiting for RFID...");


  if (!waitForCard()) {

    Serial.println("RFID scan failed.");

    printMainMenu();

    return;
  }


  String uid = getUIDString();


  Serial.println();
  Serial.println("RFID DETECTED");

  Serial.print("RFID UID : ");
  Serial.println(uid);


  // ----------------------------------------------------------
  // AUTHENTICATION
  // ----------------------------------------------------------

  Serial.println();
  Serial.println("Checking authentication...");
  delay(800);


  if (!authenticateBlock(DATA_BLOCK)) {

    Serial.println();
    Serial.println("AUTHENTICATION FAILED.");
    Serial.println("Erase cannot continue.");

    stopRFID();

    delay(1200);

    printMainMenu();

    return;
  }


  Serial.println();
  Serial.println("AUTHENTICATION SUCCESS.");

  delay(800);


  // ----------------------------------------------------------
  // READ CURRENT DATA
  // ----------------------------------------------------------

  byte currentData[18];

  if (!readBlock(DATA_BLOCK, currentData)) {

    Serial.println();
    Serial.println("Could not read current data.");

    stopRFID();

    delay(1200);

    printMainMenu();

    return;
  }


  if (!isSRLMSData(currentData)) {

    Serial.println();
    Serial.println("No SRLMS registration found.");

    Serial.println();
    Serial.println("Nothing to erase.");

    stopRFID();

    delay(1500);

    printMainMenu();

    return;
  }


  String oldLID = "";

  for (int i = 6; i < 16; i++) {
    oldLID += (char)currentData[i];
  }


  Serial.println();
  Serial.println("==============================================");
  Serial.println("CURRENT RFID DATA");
  Serial.println("==============================================");

  Serial.print("RFID UID : ");
  Serial.println(uid);

  Serial.print("LID      : ");
  Serial.println(oldLID);

  Serial.println();
  Serial.println("This SRLMS registration will be erased.");


  // ----------------------------------------------------------
  // ERASE CONFIRMATION
  // ----------------------------------------------------------

  Serial.println();
  Serial.println("==============================================");
  Serial.println("              ERASE CONFIRMATION");
  Serial.println("==============================================");

  Serial.println();

  Serial.println("Are you sure you want to erase this data?");

  Serial.println();
  Serial.println("1 = YES, ERASE");
  Serial.println("0 = CANCEL");

  Serial.println();
  Serial.println("Your choice:");

  String confirmation = readSerialLine();


  if (confirmation != "1") {

    Serial.println();
    Serial.println("ERASE CANCELLED.");
    Serial.println("No data was changed.");

    stopRFID();

    delay(1200);

    printMainMenu();

    return;
  }


  // ----------------------------------------------------------
  // RE-AUTHENTICATE
  // ----------------------------------------------------------

  Serial.println();
  Serial.println("==============================================");
  Serial.println("FINAL ERASE AUTHENTICATION");
  Serial.println("==============================================");

  Serial.println();
  Serial.println("Re-authenticating before erase...");
  delay(1000);


  if (!authenticateBlock(DATA_BLOCK)) {

    Serial.println();
    Serial.println("FINAL AUTHENTICATION FAILED.");
    Serial.println("ERASE ABORTED.");

    stopRFID();

    delay(1200);

    printMainMenu();

    return;
  }


  Serial.println();
  Serial.println("FINAL AUTHENTICATION SUCCESS.");
  Serial.println("Erase is authorized.");

  delay(1000);


  // ----------------------------------------------------------
  // ERASE BLOCK 4
  // ----------------------------------------------------------

  Serial.println();
  Serial.println("==============================================");
  Serial.println("ERASING SRLMS DATA");
  Serial.println("==============================================");

  Serial.println();
  Serial.println("Clearing Block 4...");
  Serial.println("Please DO NOT REMOVE the RFID tag.");

  delay(1200);


  byte emptyData[16];

  for (int i = 0; i < 16; i++) {
    emptyData[i] = 0x00;
  }


  MFRC522::StatusCode status =
    rfid.MIFARE_Write(
      DATA_BLOCK,
      emptyData,
      16
    );


  if (status != MFRC522::STATUS_OK) {

    Serial.println();
    Serial.println("ERASE FAILED.");

    Serial.print("RFID Error: ");
    Serial.println(rfid.GetStatusCodeName(status));

    stopRFID();

    delay(1500);

    printMainMenu();

    return;
  }


  Serial.println();
  Serial.println("Erase command successful.");

  delay(1200);


  // ----------------------------------------------------------
  // VERIFY ERASE
  // ----------------------------------------------------------

  Serial.println();
  Serial.println("==============================================");
  Serial.println("VERIFYING ERASE");
  Serial.println("==============================================");

  Serial.println();
  Serial.println("Reading Block 4 again...");
  delay(1000);


  if (!authenticateBlock(DATA_BLOCK)) {

    Serial.println();
    Serial.println("Authentication failed during erase verification.");

    stopRFID();

    delay(1200);

    printMainMenu();

    return;
  }


  byte verifyErase[18];

  if (!readBlock(DATA_BLOCK, verifyErase)) {

    Serial.println();
    Serial.println("Could not verify erase.");

    stopRFID();

    delay(1200);

    printMainMenu();

    return;
  }


  if (!isBlockEmpty(verifyErase)) {

    Serial.println();
    Serial.println("==============================================");
    Serial.println("ERASE VERIFICATION FAILED");
    Serial.println("==============================================");

    Serial.println();
    Serial.println("Data is still present.");
    Serial.println("DO NOT use this tag until checked.");

    stopRFID();

    delay(1500);

    printMainMenu();

    return;
  }


  // ----------------------------------------------------------
  // ERASE SUCCESS
  // ----------------------------------------------------------

  Serial.println();
  Serial.println();
  Serial.println("==============================================");
  Serial.println("             ERASE SUCCESS");
  Serial.println("==============================================");

  Serial.println();

  Serial.print("RFID UID : ");
  Serial.println(uid);

  Serial.println("SRLMS data : CLEARED");
  Serial.println("Block 4    : EMPTY");

  Serial.println();
  Serial.println("The RFID can now be registered again.");

  stopRFID();

  delay(2000);

  printMainMenu();
}


// ============================================================
// REGION SELECTION
// ============================================================

int selectRegion() {

  while (true) {

    Serial.println();
    Serial.println("==============================================");
    Serial.println("STEP 1 - SELECT REGION");
    Serial.println("==============================================");

    Serial.println();

    Serial.println("1 = Secunderabad");
    Serial.println("2 = New Delhi");
    Serial.println("3 = New Delhi");
    Serial.println("4 = Chennai");
    Serial.println("5 = Chennai");
    Serial.println("6 = Kolkata");
    Serial.println("7 = Kolkata");
    Serial.println("8 = Mumbai");
    Serial.println("9 = Mumbai");

    Serial.println();

    Serial.println("Enter 1 digit region code:");
    Serial.println();

    String input = readSerialLine();

    if (input.length() != 1) {

      Serial.println();
      Serial.println("ERROR: Enter exactly ONE digit.");

      continue;
    }


    int region = input.toInt();


    if (region < 1 || region > 9) {

      Serial.println();
      Serial.println("ERROR: Region must be 1 to 9.");

      continue;
    }


    Serial.println();
    Serial.print("Selected Region: ");
    Serial.println(getRegionName(region));

    Serial.print("Region Code: ");
    Serial.println(region);

    Serial.println();

    Serial.println("Confirm region?");
    Serial.println("1 = YES");
    Serial.println("0 = CHANGE");

    Serial.println();
    Serial.println("Your choice:");

    String confirm = readSerialLine();


    if (confirm == "1") {

      Serial.println();
      Serial.println("REGION CONFIRMED.");

      delay(700);

      return region;
    }


    Serial.println();
    Serial.println("Region selection restarted.");

    delay(500);
  }
}


// ============================================================
// LINEN SELECTION
// ============================================================

int selectLinen() {

  while (true) {

    Serial.println();
    Serial.println("==============================================");
    Serial.println("STEP 2 - SELECT LINEN CATEGORY");
    Serial.println("==============================================");

    Serial.println();

    Serial.println("1 = Bed Sheet 1");
    Serial.println("2 = Bed Sheet 2");
    Serial.println("3 = Pillow");
    Serial.println("4 = Blanket");
    Serial.println("5 = Pillow Cover");
    Serial.println("6 = Face Towel");

    Serial.println();

    Serial.println("7 = Reserved");
    Serial.println("8 = Reserved");
    Serial.println("9 = Reserved");

    Serial.println();

    Serial.println("Enter 1 digit linen code:");
    Serial.println();

    String input = readSerialLine();

    if (input.length() != 1) {

      Serial.println();
      Serial.println("ERROR: Enter exactly ONE digit.");

      continue;
    }


    int linen = input.toInt();


    if (linen < 1 || linen > 9) {

      Serial.println();
      Serial.println("ERROR: Linen code must be 1 to 9.");

      continue;
    }


    Serial.println();
    Serial.print("Selected Linen: ");
    Serial.println(getLinenName(linen));

    Serial.print("Linen Code: ");
    Serial.println(linen);

    Serial.println();

    Serial.println("Confirm linen?");
    Serial.println("1 = YES");
    Serial.println("0 = CHANGE");

    Serial.println();
    Serial.println("Your choice:");

    String confirm = readSerialLine();


    if (confirm == "1") {

      Serial.println();
      Serial.println("LINEN CATEGORY CONFIRMED.");

      delay(700);

      return linen;
    }


    Serial.println();
    Serial.println("Linen selection restarted.");

    delay(500);
  }
}


// ============================================================
// WAIT FOR RFID CARD
// ============================================================

bool waitForCard() {

  unsigned long startTime = millis();

  while (millis() - startTime < 60000UL) {

    if (rfid.PICC_IsNewCardPresent()) {

      if (rfid.PICC_ReadCardSerial()) {

        return true;
      }
    }

    delay(100);
  }

  return false;
}


// ============================================================
// AUTHENTICATE BLOCK
// ============================================================

bool authenticateBlock(byte block) {

  MFRC522::StatusCode status =
    rfid.PCD_Authenticate(
      MFRC522::PICC_CMD_MF_AUTH_KEY_A,
      block,
      &key,
      &(rfid.uid)
    );


  if (status != MFRC522::STATUS_OK) {

    Serial.print("Authentication error: ");
    Serial.println(
      rfid.GetStatusCodeName(status)
    );

    return false;
  }


  return true;
}


// ============================================================
// READ BLOCK
// ============================================================

bool readBlock(byte block, byte *buffer) {

  byte size = 18;

  MFRC522::StatusCode status =
    rfid.MIFARE_Read(
      block,
      buffer,
      &size
    );


  if (status != MFRC522::STATUS_OK) {

    Serial.print("Read error: ");
    Serial.println(
      rfid.GetStatusCodeName(status)
    );

    return false;
  }


  return true;
}


// ============================================================
// CHECK SRLMS DATA
// ============================================================

bool isSRLMSData(byte *data) {

  const char prefix[] = "SRLMS:";

  for (int i = 0; i < 6; i++) {

    if (data[i] != prefix[i]) {
      return false;
    }
  }


  // Check that positions 6-15 contain digits

  for (int i = 6; i < 16; i++) {

    if (data[i] < '0' || data[i] > '9') {
      return false;
    }
  }


  return true;
}


// ============================================================
// CHECK IF BLOCK IS EMPTY
//
// Accepts both:
// 00 00 00...
// and
// FF FF FF...
// as empty.
//
// ============================================================

bool isBlockEmpty(byte *data) {

  bool allZero = true;
  bool allFF = true;


  for (int i = 0; i < 16; i++) {

    if (data[i] != 0x00) {
      allZero = false;
    }

    if (data[i] != 0xFF) {
      allFF = false;
    }
  }


  return allZero || allFF;
}


// ============================================================
// GENERATE UNIQUE 8-DIGIT NUMBER
// ============================================================

String generateUniqueNumber() {

  for (int attempt = 0; attempt < 1000; attempt++) {

    uint32_t number =
      (ESP.random() % 90000000UL) + 10000000UL;


    if (!numberExists(number)) {

      String result = String(number);

      Serial.println();
      Serial.print("Generated unique number: ");
      Serial.println(result);

      Serial.println("Checking local database...");

      delay(500);

      Serial.println("Duplicate check: PASSED");

      return result;
    }
  }


  Serial.println();
  Serial.println("ERROR: Unique number generation failed.");

  return "";
}


// ============================================================
// CHECK NUMBER IN EEPROM DATABASE
// ============================================================

bool numberExists(uint32_t number) {

  for (
    uint16_t i = 0;
    i < storedNumberCount;
    i++
  ) {

    uint32_t stored;

    int address =
      EEPROM_DATA_ADDRESS +
      (i * sizeof(uint32_t));

    EEPROM.get(address, stored);


    if (stored == number) {
      return true;
    }
  }


  return false;
}


// ============================================================
// ADD NUMBER TO EEPROM DATABASE
// ============================================================

void addUsedNumber(String numberString) {

  uint32_t number =
    numberString.toInt();


  if (numberExists(number)) {
    return;
  }


  if (storedNumberCount >= MAX_STORED_NUMBERS) {

    Serial.println();
    Serial.println("WARNING:");
    Serial.println("EEPROM unique-number database is full.");

    return;
  }


  int address =
    EEPROM_DATA_ADDRESS +
    (storedNumberCount * sizeof(uint32_t));


  EEPROM.put(address, number);

  storedNumberCount++;


  EEPROM.put(
    EEPROM_COUNT_ADDRESS,
    storedNumberCount
  );


  EEPROM.commit();


  Serial.println();
  Serial.println("Unique number saved to local database.");

  Serial.print("Database count: ");
  Serial.println(storedNumberCount);
}


// ============================================================
// GET RFID UID STRING
// ============================================================

String getUIDString() {

  String uidString = "";


  for (
    byte i = 0;
    i < rfid.uid.size;
    i++
  ) {

    if (rfid.uid.uidByte[i] < 0x10) {
      uidString += "0";
    }


    uidString += String(
      rfid.uid.uidByte[i],
      HEX
    );


    if (i < rfid.uid.size - 1) {
      uidString += ":";
    }
  }


  uidString.toUpperCase();


  return uidString;
}


// ============================================================
// PRINT CARD TYPE
// ============================================================

void printCardType() {

  MFRC522::PICC_Type piccType =
    rfid.PICC_GetType(
      rfid.uid.sak
    );


  Serial.print("Card Type  : ");

  Serial.println(
    rfid.PICC_GetTypeName(piccType)
  );
}


// ============================================================
// REGION NAME
// ============================================================

String getRegionName(int region) {

  switch (region) {

    case 1:
      return "Secunderabad Zone";

    case 2:
      return "New Delhi Zone";

    case 3:
      return "New Delhi Zone";

    case 4:
      return "Chennai Zone";

    case 5:
      return "Chennai Zone";

    case 6:
      return "Kolkata Zone";

    case 7:
      return "Kolkata Zone";

    case 8:
      return "Mumbai Zone";

    case 9:
      return "Mumbai Zone";

    default:
      return "Unknown Region";
  }
}


// ============================================================
// LINEN NAME
// ============================================================

String getLinenName(int linen) {

  switch (linen) {

    case 1:
      return "Bed Sheet 1";

    case 2:
      return "Bed Sheet 2";

    case 3:
      return "Pillow";

    case 4:
      return "Blanket";

    case 5:
      return "Pillow Cover";

    case 6:
      return "Face Towel";

    case 7:
      return "Reserved";

    case 8:
      return "Reserved";

    case 9:
      return "Reserved";

    default:
      return "Unknown Linen";
  }
}


// ============================================================
// SERIAL INPUT
// ============================================================

String readSerialLine() {

  while (!Serial.available()) {

    delay(50);
  }


  String input =
    Serial.readStringUntil('\n');


  input.trim();


  return input;
}


// ============================================================
// STOP RFID
// ============================================================

void stopRFID() {

  rfid.PICC_HaltA();

  rfid.PCD_StopCrypto1();

  delay(500);
}
