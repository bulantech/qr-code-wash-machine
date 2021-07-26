
void loop() {
  rtDbStreamTask();
  
  switch(STATE) {
    case S_INIT:
      if (streamChargeCreateID.length() 
        && streamChargeCompleteID.length()
        && streamChargeCreateQR.length()) {
          
        if(DEFAULT_FLASH_FS.exists("/qr.jpg"))
          DEFAULT_FLASH_FS.remove("/qr.jpg");
          
        Serial.println("stream OK");
        Serial.println("streamChargeCreateID = " + streamChargeCreateID);
        Serial.println("streamChargeCompleteID = "+ streamChargeCompleteID);
        Serial.println("streamChargeCreateQR = "+ streamChargeCreateQR);

        if(streamChargeCreateID == streamChargeCompleteID) {
          STATE = S_CREATE_QR;
          Serial.println("------------- STATE = S_CREATE_QR");  
          return;     
        }
        STATE = S_DOWNLOAD_QR;
        Serial.println("------------- STATE = S_DOWNLOAD_QR"); 
       
      }      
      
    break;

    case S_CREATE_QR:  
      if (Firebase.ready() ) { 
//        Serial.println(auth.token.uid.c_str());
        String dbRef = "/chargeCreate/"+ String(chipId) + "/reqDate";    
        String reqDate = getISOTime();
        Serial.printf("Set string... reqDate: %s %s\n\n", reqDate, Firebase.RTDB.setString(&fbdo, dbRef.c_str(), reqDate) ? "ok" : fbdo.errorReason().c_str());

        streamChargeCreateID = "";
        streamChargeCreateQR = "";
        lastState = S_CREATE_QR;
        STATE = S_IDLE;
        Serial.print("------------- STATE = S_IDLE");
        Serial.println(", lastState = S_CREATE_QR"); 
      }
    break; 
    
    case S_DOWNLOAD_QR:  
      if (Firebase.ready() ) { 
        //File name must be in 8.3 DOS format (max. 8 bytes file name and 3 bytes file extension)   
        int dl = Firebase.Storage.download(&storageDL, STORAGE_BUCKET_ID /* Firebase Storage bucket id */, streamChargeCreateQR.c_str() /* path of remote file stored in the bucket */, "/qr.jpg" /* path to local file */, mem_storage_type_flash /* memory storage type, mem_storage_type_flash and mem_storage_type_sd */);
        Serial.printf("Download file... %s\n", dl ? "ok" : storageDL.errorReason().c_str());

        if(!DEFAULT_FLASH_FS.exists("/qr.jpg")) {
          Serial.println("XXXX qr.jpg not exists");
          delay(3000);
          return;
        }

        File file = SPIFFS.open("/qr.jpg"); 
        if(!file){
          Serial.println("XXXX Failed to open file for reading");
          delay(3000);
          return;
        }

        if(!file.size()){
          Serial.println("XXXX file.size() == 0");
          delay(3000);
          return;
        }
      
        STATE = S_SHOW_QR;
        Serial.println("------------- STATE = S_SHOW_QR");          
      }
    break; 
    
    case S_SHOW_QR:
      if(!DEFAULT_FLASH_FS.exists("/qr.jpg")) {
        STATE = S_DOWNLOAD_QR;
        Serial.println("------------- STATE = S_DOWNLOAD_QR");
        return;
      }
      
      drawJpg("/qr.jpg");
      
      streamChargeCompleteID = "";
      lastState = S_SHOW_QR;
      STATE = S_IDLE;
      Serial.print("------------- STATE = S_IDLE");
      Serial.println(", lastState = S_SHOW_QR"); 
    break; 

    case S_IDLE:
      switch(lastState) {
        case S_CREATE_QR:
          if (streamChargeCreateID.length() && streamChargeCreateQR.length()) {
            Serial.println("Create qr code OK"); 
            STATE = S_DOWNLOAD_QR;
            Serial.println("------------- STATE = S_DOWNLOAD_QR");
          }
        break;
        case S_SHOW_QR:
          if (streamChargeCompleteID.length()) {

            if (streamChargeCompleteID != streamChargeCreateID) {
              Serial.println("XXXX Scan qr code error"); 
              STATE = S_PAY_ERROR;
              Serial.println("------------- STATE = S_PAY_ERROR");
            }
            Serial.println("Scan qr code OK"); 
            STATE = S_PAY_OK;
            Serial.println("------------- STATE = S_PAY_OK");
          } 
        break;
        case S_PAY_OK:
          
        break;
      }
    break; 

    case S_PAY_OK:
      tft.fillScreen(TFT_GREY);
      tft.setTextColor(TFT_WHITE, TFT_GREY);
      tft.setTextSize(1);
      tft.drawCentreString("Pay complete :)",120,140,4);
      
      lastState = S_PAY_OK;
      STATE = S_IDLE;
      Serial.print("------------- STATE = S_IDLE");
      Serial.println(", lastState = S_PAY_OK"); 
    break; 

    case S_PAY_ERROR:
      tft.fillScreen(TFT_GREY);
      tft.setTextColor(TFT_RED, TFT_GREY);
      tft.setTextSize(1);
      tft.drawCentreString("Pay ERROR :(",120,140,4);
      
      lastState = S_PAY_ERROR;
      STATE = S_IDLE;
      Serial.print("------------- STATE = S_IDLE");
      Serial.println(", lastState = S_PAY_ERROR_OK"); 
    break; 
  }

}
