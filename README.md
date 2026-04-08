# Blackway Home IoT Architecture

A complete, cross-platform Smart Home solution featuring an ESP8266 IoT client, a Python backend server, a React web dashboard, and a native Android application. 

This project uses a robust **polling architecture** that allows you to control an ESP8266 (like an ESP-01 or NodeMCU) from anywhere in the world (e.g., via an AWS EC2 instance or a local Raspberry Pi). Because the ESP *polls* the cloud server instead of waiting for incoming web requests, **it works smoothly even if the ESP is connected to a mobile phone hotspot, public Wi-Fi, or a heavily firewalled router**. Zero port forwarding is required.

## 🌟 Key Features

- **Hardware Control:** Real-time GPIO toggling via the dashboard.
- **Python Backend:** Lightweight zero-dependency `ThreadingHTTPServer` (`server.py`) acting as the IoT bridge.
- **Real-Time Weather:** Live OpenWeatherMap API integration (Thalavitiya) injected directly into the backend polling cycle.
- **React Frontend:** Sleek, animated dashboard built with Vite, React 18, and Framer Motion. 
- **Native Android App:** The web dashboard compiled into a native Android APK using **Capacitor**, featuring automatic local routing and cleartext HTTP bypasses for Android 9+ security policies.

---

## 🏗️ Project Structure

- `server.py`: The Python backend hosted on the Cloud/Local Network. It manages the ESP state, parses sensor data, fetches weather, and serves the UI.
- `hotspot.ino`: The Arduino C++ code for the ESP8266. It routinely pings the Cloud to push sensor data and fetch GPIO states.
- `frontend/`: The React + Vite SPA. Contains the modern UI dashboard and configuration modal.
- `frontend/android/`: The Capacitor-generated Android native project.

---

## 🚀 Quick Start (Backend & Web)

1. **Configure Environment Variables:**
   ```bash
   cp .env.example .env
   # Add your OpenWeatherMap API key (WEATHER_API_KEY) and target HOST/PORT
   ```

2. **Build the React Frontend:**
   ```bash
   cd frontend
   npm install
   npm run build
   cd ..
   ```

3. **Run the Python Server:**
   ```bash
   python3 server.py
   ```
   *The server will automatically host the React dashboard from `frontend/dist`.*

---

## 📱 Quick Start (Android Mobile App)

The frontend is converted into a native app using Capacitor. To build the `.apk`:

1. **Sync Latest Web Build to Android:**
   ```bash
   cd frontend
   npm run build
   npx cap sync android
   ```

2. **Compile the APK:**
   ```bash
   cd android
   ./gradlew assembleDebug
   ```
   *The finished application will be located at: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`*

3. **Connect to Server:**
   Install the APK on your phone, tap the **Settings (Gear Icon)** in the UI, and input your active server's IP address (e.g., `http://192.168.1.198:8080` or your AWS EC2 IP).

---

## 🔌 Quick Start (ESP8266 Hardware)

1. Open `hotspot.ino` in the Arduino IDE.
2. Copy `secrets.h.example` to `secrets.h` and fill in your details:
   ```cpp
   #define SECRET_WIFI_SSID "Your_Network_Name"
   #define SECRET_WIFI_PASSWORD "Secret_Password_123"
   #define SECRET_SERVER_URL "http://YOUR_SERVER_IP:8080/api/sync"
   ```
3. Compile and flash to your ESP8266 board. 

---

## 🔒 Security Note
Never commit your real `.env`, `secrets.h`, or Android Keystores to version control. The `.gitignore` is already configured to protect these files.
