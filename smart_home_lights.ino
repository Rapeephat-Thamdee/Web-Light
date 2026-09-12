/*
  Smart Home Lights - ESP32 + Firebase Realtime Database + 4-Channel Relay
  ---------------------------------------------------------------------
  What this does:
  - Connects ESP32 to WiFi
  - Connects to Firebase Realtime Database
  - Listens (streams) for changes at /lights/light1 .. /lights/light4
  - Drives the matching relay channel HIGH/LOW when a value changes
  - Also works the other way: if you flip a physical switch (optional,
    not wired yet) you could push state back to Firebase - not included
    here to keep it simple, this version is one-way (app -> lights).

  Library required (install via Arduino Library Manager):
  - "Firebase ESP Client" by Mobizt  (search: Firebase ESP32 Client)

  Board: ESP32 Dev Module
*/

#include <WiFi.h>
#include <Firebase_ESP_Client.h>

// ---------- 1. FILL IN YOUR DETAILS HERE ----------
#define WIFI_SSID         "YOUR_WIFI_NAME"
#define WIFI_PASSWORD     "YOUR_WIFI_PASSWORD"

#define API_KEY           "AIzaSyDRSq2MJgh4UTiT8yx9U8AJ_xoGnLTVE0c"
#define DATABASE_URL      "https://smart-home-lights-98cc2-default-rtdb.asia-southeast1.firebasedatabase.app/"

// ---------- 2. RELAY PIN MAPPING ----------
// Adjust these to whichever GPIOs you actually wired to the relay board's IN1-IN4
const int RELAY_PIN[4] = {16, 17, 18, 19};

// Most cheap relay boards are ACTIVE LOW: LOW = relay ON, HIGH = relay OFF.
// If your lights behave backwards, flip this to false.
const bool RELAY_ACTIVE_LOW = true;

// ---------- Firebase objects ----------
FirebaseData   fbdo;
FirebaseAuth   auth;
FirebaseConfig config;

bool lightState[4] = {false, false, false, false};

void setRelay(int index, bool on) {
  bool level = RELAY_ACTIVE_LOW ? !on : on;
  digitalWrite(RELAY_PIN[index], level ? HIGH : LOW);
  lightState[index] = on;
  Serial.printf("Light %d -> %s\n", index + 1, on ? "ON" : "OFF");
}

void streamCallback(FirebaseStream data) {
  // data.dataPath() looks like "/light1", "/light2", etc.
  String path = data.dataPath();
  if (data.dataType() == "boolean") {
    bool value = data.boolData();
    for (int i = 0; i < 4; i++) {
      String key = "/light" + String(i + 1);
      if (path == key) {
        setRelay(i, value);
      }
    }
  }
}

void streamTimeoutCallback(bool timeout) {
  if (timeout) {
    Serial.println("Stream timeout, resuming...");
  }
}

void setup() {
  Serial.begin(115200);

  // Set up relay pins, default OFF
  for (int i = 0; i < 4; i++) {
    pinMode(RELAY_PIN[i], OUTPUT);
    setRelay(i, false);
  }

  // Connect WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Connected, IP: ");
  Serial.println(WiFi.localIP());

  // Configure Firebase
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  // Anonymous sign-in is fine for a test-mode database.
  // If you later lock down your rules with auth, use signUp() with email/password instead.
  auth.user.email = "";
  auth.user.password = "";

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  // Start listening for changes under /lights
  if (!Firebase.RTDB.beginStream(&fbdo, "/lights")) {
    Serial.println("Could not begin stream: " + fbdo.errorReason());
  }
  Firebase.RTDB.setStreamCallback(&fbdo, streamCallback, streamTimeoutCallback);

  // Pull the current state once at boot, so lights match the app immediately
  for (int i = 0; i < 4; i++) {
    String path = "/lights/light" + String(i + 1);
    if (Firebase.RTDB.getBool(&fbdo, path)) {
      setRelay(i, fbdo.boolData());
    }
  }
}

void loop() {
  // Nothing needed here - Firebase.RTDB stream runs in the background.
  delay(10);
}
