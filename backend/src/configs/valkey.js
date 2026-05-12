// lib/valkey.js
//to be used in production, not in development
import Redis from 'ioredis';

const valkey = new Redis({
  host: process.env.VALKEY_HOST || 'srv-captain--haiya-cache', 
  port: process.env.VALKEY_PORT || 6379,
  // Optimization for low-power VMs:
  connectTimeout: 10000, 
  lazyConnect: true, // Don't connect until the first command is sent
});

valkey.on('error', (err) => console.error('Valkey Connection Error:', err));
valkey.on('connect', () => console.log('Successfully connected to Valkey on Worker Node'));

export default valkey;