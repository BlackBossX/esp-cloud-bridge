import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Thermometer, Droplets, MapPin, Lightbulb, Settings, Home, X, CloudRain } from 'lucide-react';

export default function App() {
  const [deviceState, setDeviceState] = useState({ '2': false, '0': false });
  const [sensor, setSensor] = useState({ temperature: null, humidity: null });
  const [serverUrl, setServerUrl] = useState(localStorage.getItem('serverUrl') || '');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [inputUrl, setInputUrl] = useState('');

  const effectiveUrl = serverUrl || (window.location.protocol === 'file:' ? 'http://localhost:8080' : window.location.origin);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${effectiveUrl}/api/status`);
      if (!res.ok) throw new Error('Not ok');
      const data = await res.json();
      
      if (data.state) setDeviceState({ '2': data.state['2'] || false, '0': data.state['0'] || false });
      if (data.sensor) setSensor(data.sensor);
      
      setIsConnected(true);
    } catch (err) {
      console.error("Fetch failed", err);
      setIsConnected(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [effectiveUrl]);

  const toggleDevice = async (pin) => {
    const targetState = !deviceState[pin];
    setDeviceState(prev => ({ ...prev, [pin]: targetState })); // Optimistic

    try {
      const res = await fetch(`${effectiveUrl}/api/gpio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: parseInt(pin), on: targetState })
      });
      const data = await res.json();
      if (data.state) {
        setDeviceState({ '2': data.state['2'] || false, '0': data.state['0'] || false });
      }
    } catch (err) {
      console.error("Toggle failed", err);
      setDeviceState(prev => ({ ...prev, [pin]: !targetState })); // Revert
    }
  };

  const saveSettings = () => {
    let val = inputUrl.trim();
    if (val.endsWith('/')) val = val.slice(0, -1);
    setServerUrl(val);
    localStorage.setItem('serverUrl', val);
    setIsSettingsOpen(false);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%', 
            background: 'var(--surface-color)', border: '2px solid var(--border-color)',
            display: 'flex', justifyContent: 'center', alignItems: 'center'
          }}>
            <Home size={18} color="var(--accent-color)" />
          </div>
          <span style={{ fontSize: '18px', fontWeight: '600' }}>Smartshimi</span>
        </div>
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => { setInputUrl(serverUrl); setIsSettingsOpen(true); }}
          style={{
            background: 'var(--surface-color)', border: '1px solid var(--border-color)',
            borderRadius: '50%', width: '44px', height: '44px', color: '#fff',
            display: 'flex', justifyContent: 'center', alignItems: 'center'
          }}
        >
          <Settings size={20} />
        </motion.button>
      </motion.header>

      {/* Sensor Card */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        style={{
          background: 'var(--surface-color)', borderRadius: 'var(--border-radius-xl)',
          padding: '24px', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '48px', fontWeight: '700', lineHeight: 1 }}>
              {sensor.temperature || '--'}°C
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px' }}>
              Connected to Sensor
            </div>
          </div>
          <CloudRain size={40} color="var(--accent-color)" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Droplets size={14} /> Humidity
            </span>
            <span style={{ fontSize: '14px', fontWeight: '600' }}>{sensor.humidity || '--'} %</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={14} /> Location
            </span>
            <span style={{ fontSize: '14px', fontWeight: '600' }}>Local Net</span>
          </div>
        </div>
      </motion.div>

      {/* Title */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '16px', fontWeight: '600', marginBottom: '-8px' }}
      >
        <span>Devices</span>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={fetchStatus}>Refresh</span>
      </motion.div>

      {/* Devices Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <DeviceCard pin="2" name="Smart light 1" progress="94%" active={deviceState['2']} toggle={toggleDevice} delay={0.3} />
        <DeviceCard pin="0" name="Smart light 2" progress="28%" active={deviceState['0']} toggle={toggleDevice} delay={0.4} />
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
            }}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={{
                background: 'var(--surface-color)', padding: '24px', borderRadius: 'var(--border-radius-lg)',
                width: '100%', maxWidth: '360px', border: '1px solid var(--border-color)', position: 'relative'
              }}
            >
              <button 
                onClick={() => setIsSettingsOpen(false)}
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', color: 'var(--text-secondary)' }}
              ><X size={20} /></button>
              
              <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Connection Settings</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Set your Server URL. Use format: http://YOUR_SERVER_IP:8080 (Do not commit real IP)
              </p>
              
              <input 
                value={inputUrl}
                onChange={e => setInputUrl(e.target.value)}
                placeholder="http://YOUR_SERVER_IP:8080"
                style={{
                  width: '100%', padding: '12px', background: 'var(--bg-color)', border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)', borderRadius: '8px', marginBottom: '20px', fontFamily: 'inherit', outline: 'none'
                }}
              />
              
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={saveSettings}
                style={{
                  width: '100%', padding: '14px', background: 'var(--accent-color)', color: '#000',
                  borderRadius: '8px', fontWeight: '600', fontSize: '16px'
                }}
              >
                Save & Connect
              </motion.button>
              
              <div style={{ fontSize: '12px', textAlign: 'center', marginTop: '12px', color: isConnected ? 'var(--accent-color)' : '#ff4444' }}>
                {isConnected ? 'Connected to API' : 'Not Connected'}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DeviceCard({ pin, name, progress, active, toggle, delay }) {
  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay }}
      style={{
        backgroundColor: active ? 'rgba(180, 255, 57, 0.05)' : 'var(--surface-color)',
        borderRadius: 'var(--border-radius-lg)', padding: '20px', display: 'flex', flexDirection: 'column', 
        justifyContent: 'space-between', minHeight: '140px', 
        border: `1px solid ${active ? 'rgba(180, 255, 57, 0.3)' : 'var(--border-color)'}`,
        transition: 'background-color 0.3s, border-color 0.3s'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>{progress}</span>
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => toggle(pin)}
          style={{
            width: '48px', height: '48px', borderRadius: '50%', border: 'none',
            background: active ? 'var(--accent-color)' : 'var(--toggle-bg)',
            color: active ? '#000' : '#fff',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            boxShadow: active ? '0 0 16px var(--accent-glow)' : 'none',
            transition: 'background-color 0.3s, box-shadow 0.3s'
          }}
        >
          <Lightbulb size={24} fill={active ? '#000' : 'none'} color={active ? '#000' : '#fff'} />
        </motion.button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontWeight: '600', fontSize: '15px' }}>{name}</span>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{active ? 'Active' : 'Offline'}</span>
      </div>
    </motion.div>
  );
}