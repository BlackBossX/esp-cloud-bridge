# ESP8266 Cloud IoT Polling Architecture

This project provides a robust, firewall-bypassing IoT architecture that allows you to control an ESP8266 (like an ESP-01) from anywhere in the world using an AWS EC2 instance. 

Because the ESP *polls* the cloud server instead of waiting for incoming web requests, **it works smoothly even if the ESP is connected to a mobile phone hotspot, public WiFi, or a heavily firewalled router**. Zero port forwarding required.

## Project Structure
- `server.py`: The Python backend hosted on the Cloud (AWS EC2). It saves the state of exactly what pins on your ESP should be turned ON/OFF, and provides a sleek mobile-friendly dashboard.
- `hotspot.ino`: The Arduino C++ code for your ESP8266. It routinely checks the Cloud to figure out what state its LEDs or Relays should be in and adjusts itself automatically.

## Quick Start (Cloud Server)

1. Create a Python Virtual Environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```
2. Copy the example `.env` file:
   ```bash
   cp .env.example .env
   ```
3. Run the server:
   ```bash
   python3 server.py
   ```
4. Access the Control Panel at `http://127.0.0.1:8080/` (or your public EC2 IP).

## Quick Start (ESP8266)

1. Open `hotspot.ino` in the Arduino IDE.
2. Copy `secrets.h.example` to `secrets.h` and fill in your WiFi and Server details:
   ```cpp
   #define SECRET_WIFI_SSID "Your_Network_Name"
   #define SECRET_WIFI_PASSWORD "Secret_Password_123"
   #define SECRET_SERVER_URL "http://YOUR_SERVER_IP/api/sync"
   ```
3. Compile and flash to your ESP8266 board.
4. Enjoy! Your ESP will now talk to the cloud.
