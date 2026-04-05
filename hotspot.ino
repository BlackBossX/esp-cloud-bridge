/*
hotspot.ino
ESP8266-01: Polls AWS EC2 Server for GPIO Updates
*/

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include "secrets.h"

const char* WIFI_SSID = SECRET_WIFI_SSID;
const char* WIFI_PASSWORD = SECRET_WIFI_PASSWORD;

// Allow SECRET_SERVER_URL to be set in secrets.h locally; otherwise fall back to
// a placeholder. Do NOT commit a real server URL to git history.
#ifndef SECRET_SERVER_URL
#define SECRET_SERVER_URL "http://YOUR_SERVER_IP_OR_DOMAIN/api/sync"
#endif
const char* SERVER_URL = SECRET_SERVER_URL;

unsigned long lastPoll = 0;

void connectWifi() {
WiFi.mode(WIFI_STA);
WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
Serial.print("Connecting to hotspot");

int attempts = 0;
while (WiFi.status() != WL_CONNECTED && attempts < 60) {
delay(500);
Serial.print(".");
attempts++;
}
Serial.println();

if (WiFi.status() == WL_CONNECTED) {
Serial.print("Connected! ESP IP: ");
Serial.println(WiFi.localIP());
}
}

void setup() {
Serial.begin(115200);
delay(50);
connectWifi();
}

// Global memory for current active pins so we don't spam print 
bool pin2State = false;
bool pin0State = false;

void applyPinState(int pin, bool on) {
pinMode(pin, OUTPUT);
// Inverting logic here since ESP-01 built-in LED/relay is active LOW
digitalWrite(pin, on ? LOW : HIGH); 

Serial.printf("GPIO %d -> %s\n", pin, on ? "ON" : "OFF");
}

void loop() {
if (WiFi.status() != WL_CONNECTED) { connectWifi(); return; }

unsigned long now = millis();
if (now - lastPoll > 2000) { // Poll every 2 seconds
lastPoll = now;

WiFiClient client;
HTTPClient http;

if (http.begin(client, SERVER_URL)) {
int httpCode = http.GET();
if (httpCode == HTTP_CODE_OK) {
String payload = http.getString();

int stateIdx = payload.indexOf("\"state\":");
if (stateIdx > 0) {
// Check for "2":true or "2":false
bool reqPin2True = payload.indexOf("\"2\":true") > 0;
bool reqPin2False = payload.indexOf("\"2\":false") > 0;

// Check for "0":true or "0":false
bool reqPin0True = payload.indexOf("\"0\":true") > 0;
bool reqPin0False = payload.indexOf("\"0\":false") > 0;

if (reqPin2True && !pin2State) { pin2State = true; applyPinState(2, true); }
else if (reqPin2False && pin2State) { pin2State = false; applyPinState(2, false); }

if (reqPin0True && !pin0State) { pin0State = true; applyPinState(0, true); }
else if (reqPin0False && pin0State) { pin0State = false; applyPinState(0, false); }
}
} else {
Serial.printf("HTTP GET error: %s\n", http.errorToString(httpCode).c_str());
}
http.end();
}
}
}
