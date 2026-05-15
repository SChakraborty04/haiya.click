import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { setAccessToken, backendUrl } from '../utils/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const navigate = useNavigate();
  const redirectTo = new URLSearchParams(window.location.search).get('redirect') || '/dashboard';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const res = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      const json = await res.json();
      
      if (json.success) {
        setAccessToken(json.data.accessToken);
        navigate(redirectTo);
      } else {
        setError(json.message || 'Login failed');
        if ((res.status === 403 || res.status === 412) && json.message?.toLowerCase().includes('verify')) {
          setShowResend(true);
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      const res = await fetch(`${backendUrl}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const json = await res.json();
      
      if (json.success) {
        toast.success('Verification email sent successfully!');
        setShowResend(false);
      } else {
        toast.error(json.message || 'Failed to resend verification email');
      }
    } catch (err) {
      toast.error('Failed to resend verification email. Please try again later.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: '#f5f5f5', fontFamily: '"Space Mono", monospace', paddingTop: '57px', boxSizing: 'border-box' }}>
      <Header />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <form onSubmit={handleLogin} style={{ width: '100%', maxWidth: 400, padding: 32, border: '1px solid #27272a', background: 'rgba(10, 10, 10, 0.8)', display: 'flex', flexDirection: 'column', gap: 24, boxShadow: '0 0 40px rgba(220, 38, 38, 0.05)' }}>
          <h2 style={{ margin: 0, fontSize: 24, letterSpacing: '0.1em' }}>[ LOGIN ]</h2>
          
          {error && (
            <div style={{ color: '#dc2626', fontSize: 12, padding: '12px', border: '1px solid rgba(220, 38, 38, 0.3)', background: 'rgba(220, 38, 38, 0.1)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {error}
              {showResend && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={isResending}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#f5f5f5',
                    textDecoration: 'underline',
                    fontSize: 11,
                    cursor: isResending ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    padding: 0,
                    fontFamily: '"Space Mono", monospace'
                  }}
                >
                  {isResending ? 'SENDING...' : 'RESEND VERIFICATION EMAIL'}
                </button>
              )}
            </div>
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 12, color: '#a1a1aa', letterSpacing: '0.1em' }}>EMAIL</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: '12px', background: 'transparent', border: '1px solid #27272a', color: '#f5f5f5', fontFamily: '"Space Mono", monospace', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#dc2626'} onBlur={(e) => e.target.style.borderColor = '#27272a'} />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 12, color: '#a1a1aa', letterSpacing: '0.1em' }}>PASSWORD</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '12px', background: 'transparent', border: '1px solid #27272a', color: '#f5f5f5', fontFamily: '"Space Mono", monospace', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#dc2626'} onBlur={(e) => e.target.style.borderColor = '#27272a'} />
          </div>
          
          <button type="submit" disabled={isLoading} style={{ padding: '12px', background: isLoading ? '#52525b' : '#f5f5f5', color: '#0a0a0a', border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', fontFamily: '"Space Mono", monospace', fontWeight: 'bold', letterSpacing: '0.1em', marginTop: '8px' }}>
            {isLoading ? 'AUTHENTICATING...' : 'ACCESS SYSTEM'}
          </button>
          
          <div style={{ fontSize: 12, color: '#a1a1aa', textAlign: 'center', marginTop: '16px' }}>
            Don't have an account? <span style={{ color: '#dc2626', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate(redirectTo !== '/dashboard' ? `/register?redirect=${encodeURIComponent(redirectTo)}` : '/register')}>REGISTER</span>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
}
