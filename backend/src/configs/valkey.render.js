// To be used in development only, not in production
// lib/valkey.js
import Redis from 'ioredis';

// Use the environment variable for security, but here is the logic for your string
const connectionString = process.env.VALKEY_URL || 'rediss://red-d80adbn7f7vs73cmomu0:hbThQqBt9t9Ho36ohu3YiAvSTa2WdeqQ@oregon-keyvalue.render.com:6379';

const valkey = new Redis(connectionString, {
  tls: {
    // Render requires TLS. This empty object tells ioredis to use default TLS settings.
    rejectUnauthorized: false 
  },
  connectTimeout: 10000,
});

valkey.on('connect', () => console.log('Connected to Valkey on Render (Oregon)'));
valkey.on('error', (err) => console.error('Valkey Error:', err));

export default valkey;