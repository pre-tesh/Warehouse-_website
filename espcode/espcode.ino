/*
 * Mini Greenhouse Digital Twin — ESP32 firmware
 *
 *  - Reads DHT11 (temp/humidity), capacitive soil sensor, LDR (light %)
 *  - Controls 3 LEDs from the 2 physical buttons AND from the website
 *  - Every SEND_INTERVAL_MS it POSTs readings + LED state to the laptop:
 *        POST http://<SERVER_HOST>:<SERVER_PORT>/api/esp/data
 *        {"temp":24.1,"humidity":60.0,"soil":55.0,"light":42.0,"leds":[1,0,0]}
 *    The server replies {"ok":1} or {"set":[1,1,0]} when the website wants
 *    the LEDs changed.
 *
 * Libraries: "DHT sensor library" (Adafruit) + "Adafruit Unified Sensor".
 * WiFi and HTTPClient ship with the ESP32 board package.
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>

// ───────────── CONFIGURE THESE ─────────────
const char* WIFI_SSID   = "warehouse";
const char* WIFI_PASS   = "warehouse123";
// LAN IP of the laptop running the backend (Linux: `hostname -I`)
const char* SERVER_HOST = "10.30.106.152";
const int   SERVER_PORT = 4000;

// Soil calibration: read "raw" on the Serial Monitor with the sensor in dry
// air (-> 0 %) and then in a glass of water (-> 100 %), and copy them here.
const int SOIL_RAW_DRY = 3000;
const int SOIL_RAW_WET = 1300;
// ───────────────────────────────────────────

// Pins
#define DHTPIN      4
#define DHTTYPE     DHT11
#define SOIL_PIN    34
#define LDR_PIN     35
#define BUTTON_UP   25
#define BUTTON_DOWN 26
const int LED_PINS[3] = {14, 12, 13};   // LED1, LED2, LED3

// Timing (ms)
const unsigned long SEND_INTERVAL   = 1000;
const unsigned long DHT_INTERVAL    = 2000;  // DHT11 max ~1 read/sec
const unsigned long SENSOR_INTERVAL = 500;
const unsigned long DEBOUNCE        = 50;
const unsigned long WIFI_RETRY      = 5000;

DHT dht(DHTPIN, DHTTYPE);

bool  ledState[3] = {false, false, false};
float temperature = NAN;
float humidity    = NAN;
float soilPercent = 0;
float lightPercent = 0;
int   soilRaw = 0;

unsigned long lastSend = 0, lastDht = 0, lastSensor = 0, lastWifiTry = 0;

struct Button {
  uint8_t pin;
  int stable;      // debounced level (HIGH = released)
  int lastRead;
  unsigned long changedAt;
};
Button btnUp   = {BUTTON_UP,   HIGH, HIGH, 0};
Button btnDown = {BUTTON_DOWN, HIGH, HIGH, 0};

int ledCount() {
  int n = 0;
  for (int i = 0; i < 3; i++) if (ledState[i]) n++;
  return n;
}

void applyLeds() {
  for (int i = 0; i < 3; i++) digitalWrite(LED_PINS[i], ledState[i] ? HIGH : LOW);
}

// True once per debounced press
bool buttonPressed(Button &b) {
  int r = digitalRead(b.pin);
  if (r != b.lastRead) {
    b.lastRead = r;
    b.changedAt = millis();
  }
  if (millis() - b.changedAt > DEBOUNCE && r != b.stable) {
    b.stable = r;
    if (r == LOW) return true;
  }
  return false;
}

float toPercent(int raw, int rawAt0, int rawAt100) {
  float p = (float)(raw - rawAt0) * 100.0f / (float)(rawAt100 - rawAt0);
  return constrain(p, 0.0f, 100.0f);
}

// UP lights the first unlit LED, DOWN switches off the last lit LED
void handleButtons() {
  if (buttonPressed(btnUp)) {
    for (int i = 0; i < 3; i++) if (!ledState[i]) { ledState[i] = true; break; }
    applyLeds();
    Serial.printf("UP! LEDs on: %d\n", ledCount());
    lastSend = 0;  // tell the website immediately
  }
  if (buttonPressed(btnDown)) {
    for (int i = 2; i >= 0; i--) if (ledState[i]) { ledState[i] = false; break; }
    applyLeds();
    Serial.printf("DOWN! LEDs on: %d\n", ledCount());
    lastSend = 0;
  }
}

void readSensors() {
  unsigned long now = millis();

  if (now - lastDht >= DHT_INTERVAL) {
    lastDht = now;
    float h = dht.readHumidity();
    float t = dht.readTemperature();
    if (!isnan(h)) humidity = h;      // keep last good value if a read fails
    if (!isnan(t)) temperature = t;
  }

  if (now - lastSensor >= SENSOR_INTERVAL) {
    lastSensor = now;
    soilRaw = analogRead(SOIL_PIN);
    soilPercent = toPercent(soilRaw, SOIL_RAW_DRY, SOIL_RAW_WET);
    lightPercent = toPercent(analogRead(LDR_PIN), 0, 4095);

    Serial.printf("Temp: %.1f C | Hum: %.1f %% | Soil: %.0f %% (raw %d) | Light: %.0f %% | LEDs: ",
                  temperature, humidity, soilPercent, soilRaw, lightPercent);
    for (int i = 0; i < 3; i++) Serial.print(ledState[i] ? "●" : "○");
    Serial.printf(" | WiFi: %s\n", WiFi.status() == WL_CONNECTED ? "OK" : "--");
  }
}

// Server reply may contain {"set":[1,0,1]} -> apply it
void handleServerReply(const String &body) {
  int idx = body.indexOf("\"set\":[");
  if (idx < 0) return;
  idx += 7;
  for (int i = 0; i < 3; i++) {
    while (idx < (int)body.length() && (body[idx] == ' ' || body[idx] == ',')) idx++;
    if (idx >= (int)body.length()) return;
    ledState[i] = (body[idx] == '1');
    idx++;
  }
  applyLeds();
  Serial.println("Website command applied");
}

void sendToServer() {
  if (WiFi.status() != WL_CONNECTED) return;

  char tStr[12], hStr[12];
  if (isnan(temperature)) strcpy(tStr, "null"); else snprintf(tStr, sizeof(tStr), "%.1f", temperature);
  if (isnan(humidity))    strcpy(hStr, "null"); else snprintf(hStr, sizeof(hStr), "%.1f", humidity);

  char json[200];
  snprintf(json, sizeof(json),
           "{\"temp\":%s,\"humidity\":%s,\"soil\":%.1f,\"light\":%.1f,\"leds\":[%d,%d,%d]}",
           tStr, hStr, soilPercent, lightPercent,
           ledState[0], ledState[1], ledState[2]);

  HTTPClient http;
  String url = String("http://") + SERVER_HOST + ":" + SERVER_PORT + "/api/esp/data";
  http.setConnectTimeout(1000);
  http.setTimeout(1500);
  if (!http.begin(url)) return;
  http.addHeader("Content-Type", "application/json");

  int code = http.POST((uint8_t*)json, strlen(json));
  if (code == 200) {
    handleServerReply(http.getString());
  } else {
    Serial.printf("POST failed (%d) -> is the backend running at %s:%d ?\n", code, SERVER_HOST, SERVER_PORT);
  }
  http.end();
}

void keepWifiAlive() {
  if (WiFi.status() == WL_CONNECTED) return;
  if (millis() - lastWifiTry < WIFI_RETRY) return;
  lastWifiTry = millis();
  Serial.println("WiFi lost, reconnecting...");
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASS);
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== Greenhouse Digital Twin ESP32 ===");

  dht.begin();

  for (int i = 0; i < 3; i++) pinMode(LED_PINS[i], OUTPUT);
  applyLeds();  // all off
  pinMode(BUTTON_UP, INPUT_PULLUP);
  pinMode(BUTTON_DOWN, INPUT_PULLUP);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.printf("Connecting to %s", WIFI_SSID);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(300);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\nConnected! ESP32 IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\nWiFi not connected yet - will keep retrying (buttons still work).");
  }
}

void loop() {
  handleButtons();     // always responsive, even without WiFi
  readSensors();
  keepWifiAlive();

  if (millis() - lastSend >= SEND_INTERVAL) {
    lastSend = millis();
    sendToServer();
  }
}
