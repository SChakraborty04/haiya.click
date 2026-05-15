import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { backendUrl } from '../utils/auth';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('VERIFYING YOUR ACCOUNT...');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('INVALID OR MISSING VERIFICATION TOKEN.');
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/auth/verify-email?token=${token}`);
        const json = await res.json();

        if (json.success) {
          setStatus('success');
          setMessage('ACCOUNT VERIFIED SUCCESSFULLY!');
          toast.success('Email verified! You can now login.');
          setTimeout(() => navigate('/login'), 3000);
        } else {
          setStatus('error');
          setMessage(json.message || 'VERIFICATION FAILED.');
        }
      } catch (err) {
        setStatus('error');
        setMessage('A SYSTEM ERROR OCCURRED DURING VERIFICATION.');
      }
    };

    verify();
  }, [token, navigate]);

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: '#f5f5f5', fontFamily: '"Space Mono", monospace', paddingTop: '57px' }}>
      <Header />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ width: '100%', maxWidth: 500, padding: 40, border: '1px solid #27272a', background: 'rgba(10, 10, 10, 0.8)', textAlign: 'center', boxShadow: '0 0 40px rgba(220, 38, 38, 0.05)' }}>
          <div style={{ fontSize: 10, color: '#dc2626', letterSpacing: '0.3em', marginBottom: 24 }}>[ VERIFICATION SYSTEM ]</div>
          
          <h2 style={{ margin: '0 0 32px 0', fontSize: 24, letterSpacing: '0.1em', color: status === 'error' ? '#dc2626' : '#f5f5f5' }}>
            {status === 'loading' && 'PROCESSING...'}
            {status === 'success' && 'VERIFIED'}
            {status === 'error' && 'FAILED'}
          </h2>

          <p style={{ fontSize: 14, color: '#a1a1aa', lineHeight: '1.8', marginBottom: 40 }}>
            {message}
          </p>

          {status === 'success' && (
            <div style={{ fontSize: 12, color: '#71717a' }}>
              REDIRECTING TO LOGIN IN 3 SECONDS...
            </div>
          )}

          {status === 'error' && (
            <button 
              onClick={() => navigate('/login')}
              style={{ padding: '12px 32px', background: '#f5f5f5', color: '#0a0a0a', border: 'none', cursor: 'pointer', fontFamily: '"Space Mono", monospace', fontWeight: 'bold', letterSpacing: '0.1em' }}
            >
              BACK TO LOGIN
            </button>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
