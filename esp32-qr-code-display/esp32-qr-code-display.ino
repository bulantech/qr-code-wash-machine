//////////////////////////////////////////
//
//  library:
//  1. Firebase ESP Client
//  2. Arduino Json
//  3. TFT_eSPI 
//  4. TJpg_Decoder
//
//////////////////////////////////////////

//////////////////////////////////////////
//
//  แก้ตัวแปร:
//  1. WIFI_SSID, WIFI_PASSWORD
//  2. API_KEY
//  3. DATABASE_URL 
//  4. STORAGE_BUCKET_ID
//  5. USER_EMAIL, USER_PASSWORD
//
//////////////////////////////////////////

#include <WiFi.h> 

/* 1. Define the WiFi credentials */
#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

#include "time.h"
const char* ntpServer = "pool.ntp.org";
const long  gmtOffset_sec = 0; //7 * 3600;
const int   daylightOffset_sec = 3600;

#define USE_DMA
// Include the jpeg decoder library
#include <TJpg_Decoder.h>

#ifdef USE_DMA
  uint16_t  dmaBuffer1[16*16]; // Toggle buffer for 16*16 MCU block, 512bytes
  uint16_t  dmaBuffer2[16*16]; // Toggle buffer for 16*16 MCU block, 512bytes
  uint16_t* dmaBufferPtr = dmaBuffer1;
  bool dmaBufferSel = 0;
#endif

#include <SPI.h>
#include <TFT_eSPI.h>      // Graphics library
#define TFT_GREY 0x5AEB
TFT_eSPI tft = TFT_eSPI(); // Invoke library
setup_t user; // The library defines the type "setup_t" as a struct
              // Calling tft.getSetup(user) populates it with the settings
              
// TFT_eSPI ver = 2.3.70
// Processor    = ESP32
// Frequency    = 240MHz
// Transactions = Yes
// Interface    = SPI
// Display driver = 9341
// Display width  = 240
// Display height = 320
//
////////////////////////////// 
//
// ต่อขา lcd:
//
// MOSI    = GPIO 23
// MISO    = GPIO 19
// SCK     = GPIO 18
// TFT_CS   = GPIO 15
// TFT_DC   = GPIO 2
// RESET   = EN
//
////////////////////////////// 

#include <Firebase_ESP_Client.h>

//Provide the token generation process info.
#include "addons/TokenHelper.h"
//Provide the RTDB payload printing info and other helper functions.
#include "addons/RTDBHelper.h"

/* 2. Define the API Key */
#define API_KEY "Credentials API Keys" //see https://console.cloud.google.com/apis/credentials

/* 3. Define the RTDB URL */
#define DATABASE_URL "YOUR_PROJECT.asia-southeast1.firebasedatabase.app/" //<databaseName>.firebaseio.com or <databaseName>.<region>.firebasedatabase.app

#define STORAGE_BUCKET_ID "YOUR_PROJECT.appspot.com"

/* 4. Define the user Email and password that alreadey registerd or added in your project */
#define USER_EMAIL "USER@gmail.com"
#define USER_PASSWORD "xxxxx"

//Define Firebase Data object
FirebaseData fbdo;
FirebaseData storageDL;
FirebaseData streamChargeCreate;
FirebaseData streamChargeComplete;
FirebaseAuth auth;
FirebaseConfig config;

String streamChargeCreateID = "";
String streamChargeCompleteID = "";
String streamChargeCreateQR = "";

unsigned long sendDataPrevMillis = 0;

//String parentPath = "/test/stream/data";
String childPath[2] = {"/id", "/qrcode"};
size_t childPathSize = 2;

enum State { S_INIT, S_IDLE, S_CREATE_QR, S_DOWNLOAD_QR, S_SHOW_QR, S_PAY_OK, S_PAY_ERROR };
State STATE = S_INIT;
unsigned int lastState = S_INIT;

String getISOTime(){
  struct tm timeinfo;
  if(!getLocalTime(&timeinfo)){
    Serial.println("Failed to obtain time");
    return "";
  }
  Serial.println(&timeinfo, "%Y-%m-%dT%H:%M:%SZ");
  char timeStringBuff[30];
  strftime(timeStringBuff, sizeof(timeStringBuff), "%Y-%m-%d %H:%M:%S", &timeinfo);
  return String(timeStringBuff);
}

void printLocalTime(){
  struct tm timeinfo;
  if(!getLocalTime(&timeinfo)){
    Serial.println("Failed to obtain time");
    return;
  }
  Serial.println(&timeinfo, "%A, %B %d %Y %H:%M:%S");
  Serial.println(&timeinfo, "%Y-%m-%d %H:%M:%S");
  Serial.print("Day of week: ");
  Serial.println(&timeinfo, "%A");
  Serial.print("Month: ");
  Serial.println(&timeinfo, "%B %m");
  Serial.print("Day of Month: ");
  Serial.println(&timeinfo, "%d");
  Serial.print("Year: ");
  Serial.println(&timeinfo, "%Y");
  Serial.print("Hour: ");
  Serial.println(&timeinfo, "%H");
  Serial.print("Hour (12 hour format): ");
  Serial.println(&timeinfo, "%I");
  Serial.print("Minute: ");
  Serial.println(&timeinfo, "%M");
  Serial.print("Second: ");
  Serial.println(&timeinfo, "%S");

  Serial.println("Time variables");
  char timeHour[3];
  strftime(timeHour,3, "%H", &timeinfo);
  Serial.println(timeHour);
  char timeWeekDay[10];
  strftime(timeWeekDay,10, "%A", &timeinfo);
  Serial.println(timeWeekDay);
  Serial.println();
}

uint32_t chipId = 0;

void getChipId() {
  for(int i=0; i<17; i=i+8) {
    chipId |= ((ESP.getEfuseMac() >> (40 - i)) & 0xff) << i;
  }

  Serial.printf("ESP32 Chip model = %s Rev %d\n", ESP.getChipModel(), ESP.getChipRevision());
  Serial.printf("This chip has %d cores\n", ESP.getChipCores());
  Serial.print("Chip ID: "); Serial.println(chipId); 
}


void streamCallback(MultiPathStream stream)
{
  size_t numChild = sizeof(childPath) / sizeof(childPath[0]);

  for (size_t i = 0; i < numChild; i++)
  {
    if (stream.get(childPath[i]))
    {
      Serial.printf("path: %s, event: %s, type: %s, value: %s%s", 
        stream.dataPath.c_str(), stream.eventType.c_str(), 
        stream.type.c_str(), stream.value.c_str(), i < numChild - 1 ? "\n" : "");

      Serial.println();
      if(String(stream.dataPath.c_str()) == "/id") { 
        streamChargeCreateID = String(stream.value.c_str());
        Serial.println("streamChargeCreateID: " + streamChargeCreateID);
      }
      if(String(stream.dataPath.c_str()) == "/qrcode") {
        streamChargeCreateQR = String(stream.value.c_str());
        Serial.println("streamChargeCreateQR: " + streamChargeCreateQR);
      }
    }
  }

  Serial.println();
}

void streamTimeoutCallback(bool timeout)
{
  if (timeout)
    Serial.println("stream timeout, resuming...\n");
}

void rtDbStreamTask() {
  if (!Firebase.ready())
    return;

//  // streamChargeCreate /////////////////////////
//  if (!Firebase.RTDB.readStream(&streamChargeCreate))
//    Serial.printf("streamChargeCreate read error, %s\n\n", streamChargeCreate.errorReason().c_str());
//
//  if (streamChargeCreate.streamTimeout())
//    Serial.println("streamChargeCreate timeout, resuming...\n");
//
//  if (streamChargeCreate.streamAvailable())
//  {
//    Serial.printf("streamChargeCreate path, %s\nevent path, %s\ndata type, %s\nevent type, %s\n\n",
//                  streamChargeCreate.streamPath().c_str(),
//                  streamChargeCreate.dataPath().c_str(),
//                  streamChargeCreate.dataType().c_str(),
//                  streamChargeCreate.eventType().c_str());
////    printResult(streamChargeCreate); //see addons/RTDBHelper.h
//    Serial.println();
//    if (streamChargeCreate.dataType() == "string") {
//      streamChargeCreateID = streamChargeCreate.stringData();
//      Serial.println("streamChargeCreateID: " + streamChargeCreateID);      
//    }
//  }

  // streamChargeComplete /////////////////////////
  if (!Firebase.RTDB.readStream(&streamChargeComplete))
    Serial.printf("streamChargeComplete read error, %s\n\n", streamChargeComplete.errorReason().c_str());

  if (streamChargeComplete.streamTimeout())
    Serial.println("streamChargeComplete timeout, resuming...\n");

  if (streamChargeComplete.streamAvailable())
  {
    Serial.printf("streamChargeComplete path, %s\nevent path, %s\ndata type, %s\nevent type, %s\n\n",
                  streamChargeComplete.streamPath().c_str(),
                  streamChargeComplete.dataPath().c_str(),
                  streamChargeComplete.dataType().c_str(),
                  streamChargeComplete.eventType().c_str());
//    printResult(streamChargeComplete); //see addons/RTDBHelper.h
    Serial.println();
    if (streamChargeComplete.dataType() == "json") {      
      FirebaseJson &json = streamChargeComplete.jsonObject();
      String jsonStr;
      json.toString(jsonStr, true);
      size_t len = json.iteratorBegin();
      String key, value = "";
      int type = 0;
      for (size_t i = 0; i < len; i++)
      {
          json.iteratorGet(i, type, key, value);

          if(key == "id") {
            streamChargeCompleteID = value;
            Serial.println("streamChargeCompleteID: "+streamChargeCompleteID);
          }
      }
      json.iteratorEnd();
            
    }
  }
  
}

void listDir(fs::FS &fs, const char * dirname, uint8_t levels){
    Serial.printf("Listing directory: %s\r\n", dirname);

    File root = fs.open(dirname);
    if(!root){
        Serial.println("- failed to open directory");
        return;
    }
    if(!root.isDirectory()){
        Serial.println(" - not a directory");
        return;
    }

    File file = root.openNextFile();
    while(file){
        if(file.isDirectory()){
            Serial.print("  DIR : ");
            Serial.println(file.name());
            if(levels){
                listDir(fs, file.name(), levels -1);
            }
        } else {
            Serial.print("  FILE: ");
            Serial.print(file.name());
            Serial.print("\tSIZE: ");
            Serial.println(file.size());
        }
        file = root.openNextFile();
    }
}

// This next function will be called during decoding of the jpeg file to render each
// 16x16 or 8x8 image tile (Minimum Coding Unit) to the TFT.
bool tft_output(int16_t x, int16_t y, uint16_t w, uint16_t h, uint16_t* bitmap)
{
   // Stop further decoding as image is running off bottom of screen
  if ( y >= tft.height() ) return 0;

  // STM32F767 processor takes 43ms just to decode (and not draw) jpeg (-Os compile option)
  // Total time to decode and also draw to TFT:
  // SPI 54MHz=71ms, with DMA 50ms, 71-43 = 28ms spent drawing, so DMA is complete before next MCU block is ready
  // Apparent performance benefit of DMA = 71/50 = 42%, 50 - 43 = 7ms lost elsewhere
  // SPI 27MHz=95ms, with DMA 52ms. 95-43 = 52ms spent drawing, so DMA is *just* complete before next MCU block is ready!
  // Apparent performance benefit of DMA = 95/52 = 83%, 52 - 43 = 9ms lost elsewhere
#ifdef USE_DMA
  // Double buffering is used, the bitmap is copied to the buffer by pushImageDMA() the
  // bitmap can then be updated by the jpeg decoder while DMA is in progress
  if (dmaBufferSel) dmaBufferPtr = dmaBuffer2;
  else dmaBufferPtr = dmaBuffer1;
  dmaBufferSel = !dmaBufferSel; // Toggle buffer selection
  //  pushImageDMA() will clip the image block at screen boundaries before initiating DMA
  tft.pushImageDMA(x, y, w, h, bitmap, dmaBufferPtr); // Initiate DMA - blocking only if last DMA is not complete
  // The DMA transfer of image block to the TFT is now in progress...
#else
  // Non-DMA blocking alternative
  tft.pushImage(x, y, w, h, bitmap);  // Blocking, so only returns when image block is drawn
#endif
  // Return 1 to decode next block.
  return 1;
}

void drawJpg(String path) {
  // Show a contrasting colour for demo of draw speed
  tft.fillScreen(TFT_BLACK);  
  
  // Get the width and height in pixels of the jpeg if you wish:
  uint16_t w = 0, h = 0;
  //        TJpgDec.getJpgSize(&w, &h, panda, sizeof(panda));
  TJpgDec.getJpgSize(&w, &h, path);
  Serial.print("Width = "); Serial.print(w); Serial.print(", height = "); Serial.println(h);
  
  // Time recorded for test purposes
  uint32_t dt = millis();
  
  // Must use startWrite first so TFT chip select stays low during DMA and SPI channel settings remain configured
  tft.startWrite();
  
  // Draw the image, top left at 0,0 - DMA request is handled in the call-back tft_output() in this sketch
  //        TJpgDec.drawJpg(0, 0, panda, sizeof(panda)); 
  TJpgDec.drawJpg(0, 0, path);
  
  // Must use endWrite to release the TFT chip select and release the SPI channel
  tft.endWrite();
  
  // How much time did rendering take (ESP8266 80MHz 262ms, 160MHz 149ms, ESP32 SPI 111ms, 8bit parallel 90ms
  dt = millis() - dt;
  Serial.print(dt); Serial.println(" ms");  
}

void setup() {
  Serial.begin(115200);
  
  tft.init();
  tft.setRotation(0);
  tft.fillScreen(TFT_GREY);
  tft.setTextSize(1);
#ifdef USE_DMA
  tft.initDMA(); // To use SPI DMA you must call initDMA() to setup the DMA engine
#endif

  // The jpeg image can be scaled down by a factor of 1, 2, 4, or 8
  TJpgDec.setJpgScale(1);

  // The colour byte order can be swapped by the decoder
  // using TJpgDec.setSwapBytes(true); or by the TFT_eSPI library:
  tft.setSwapBytes(true);

  // The decoder must be given the exact name of the rendering function above
  TJpgDec.setCallback(tft_output);
 
  // Draw text at position 120,260 using fonts 4
  // Only font numbers 2,4,6,7 are valid. Font 6 only contains characters [space] 0 1 2 3 4 5 6 7 8 9 : . - a p m
  // Font 7 is a 7 segment font and only contains characters [space] 0 1 2 3 4 5 6 7 8 9 : .
//  tft.drawCentreString("Time flies",120,260,4);
  tft.setTextColor(TFT_WHITE, TFT_GREY);
  tft.drawString("Setup...", 0, 0, 2);
  
//
//  if(!SPIFFS.begin(FORMAT_SPIFFS_IF_FAILED)){
//    Serial.println("SPIFFS Mount Failed!");    
//    tft.setTextColor(TFT_RED, TFT_GREY);
//    tft.drawString("SPIFFS Mount Failed!", 0, 0, 2);
//    
//    return;
//  }
//  listDir(SPIFFS, "/", 0);

  if (!DEFAULT_FLASH_FS.begin())
  {
    Serial.println("SPIFFS/LittleFS initialization failed.");
    Serial.println("For Arduino IDE, please select flash size from menu Tools > Flash size");
    return;
  }
  listDir(SPIFFS, "/", 0);
  
  getChipId();

  Serial.println("Starting connecting WiFi.");
  tft.setTextColor(TFT_WHITE, TFT_GREY);
  tft.drawString("Starting connecting WiFi.", 0, 0, 2);
  
  delay(10);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("WiFi connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  tft.setTextColor(TFT_GREEN, TFT_GREY);
  char sBuf[50];
  sprintf(sBuf, "IP address: %s          ", WiFi.localIP().toString().c_str());
  tft.drawString(sBuf, 0, 0, 2);
//  tft.drawString(WiFi.localIP().toString().c_str(), 60, 0, 2);

  Serial.printf("Firebase Client v%s\n\n", FIREBASE_CLIENT_VERSION);

  /* Assign the api key (required) */
  config.api_key = API_KEY;

  /* Assign the user sign in credentials */
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;

  /* Assign the RTDB URL (required) */
  config.database_url = DATABASE_URL;

  /* Assign the callback function for the long running token generation task */
  config.token_status_callback = tokenStatusCallback; //see addons/TokenHelper.h

  //Or use legacy authenticate method
  //config.database_url = DATABASE_URL;
  //config.signer.tokens.legacy_token = "<database secret>";

  Firebase.begin(&config, &auth);

  Firebase.reconnectWiFi(true);

  String parentPath = String("/chargeCreate/" + String(chipId) );
  if (!Firebase.RTDB.beginMultiPathStream(&streamChargeCreate, parentPath.c_str(), childPath, childPathSize))
    Serial.printf("streamChargeCreate begin error, %s\n\n", streamChargeCreate.errorReason().c_str());

  Firebase.RTDB.setMultiPathStreamCallback(&streamChargeCreate, streamCallback, streamTimeoutCallback);
  
//  if (!Firebase.RTDB.beginStream(&streamChargeCreate, parentPath)
//    Serial.printf("streamChargeCreate begin error, %s\n\n", streamChargeCreate.errorReason().c_str());

  if (!Firebase.RTDB.beginStream(&streamChargeComplete, String("/chargeComplete/" + String(chipId) ).c_str() ))
    Serial.printf("streamChargeComplete begin error, %s\n\n", streamChargeComplete.errorReason().c_str());

  //init and get the time
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
//  printLocalTime();
   Serial.println(getISOTime());
   
  STATE = S_INIT;
  Serial.println("------------- STATE = S_INIT");
}
