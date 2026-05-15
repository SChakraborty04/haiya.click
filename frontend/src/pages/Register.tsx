import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { backendUrl } from '../utils/auth';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const redirectTo = new URLSearchParams(window.location.search).get('redirect');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const res = await fetch(`${backendUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password })
      });
      const json = await res.json();
      
      if (json.success) {
        toast.success('Registration successful! Please check your email to verify your account.');
        navigate(redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login');
      } else {
        setError(json.message || 'Registration failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: '#f5f5f5', fontFamily: '"Space Mono", monospace', paddingTop: '57px', boxSizing: 'border-box' }}>
      <Header />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <form onSubmit={handleRegister} style={{ width: '100%', maxWidth: 400, padding: 32, border: '1px solid #27272a', background: 'rgba(10, 10, 10, 0.8)', display: 'flex', flexDirection: 'column', gap: 24, boxShadow: '0 0 40px rgba(220, 38, 38, 0.05)' }}>
          <h2 style={{ margin: 0, fontSize: 24, letterSpacing: '0.1em' }}>[ REGISTER ]</h2>
          
          {error && <div style={{ color: '#dc2626', fontSize: 12, padding: '8px', border: '1px solid rgba(220, 38, 38, 0.3)', background: 'rgba(220, 38, 38, 0.1)' }}>{error}</div>}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 12, color: '#a1a1aa', letterSpacing: '0.1em' }}>NAME</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required style={{ padding: '12px', background: 'transparent', border: '1px solid #27272a', color: '#f5f5f5', fontFamily: '"Space Mono", monospace', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#dc2626'} onBlur={(e) => e.target.style.borderColor = '#27272a'} />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 12, color: '#a1a1aa', letterSpacing: '0.1em' }}>EMAIL</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: '12px', background: 'transparent', border: '1px solid #27272a', color: '#f5f5f5', fontFamily: '"Space Mono", monospace', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#dc2626'} onBlur={(e) => e.target.style.borderColor = '#27272a'} />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 12, color: '#a1a1aa', letterSpacing: '0.1em' }}>PASSWORD</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '12px', background: 'transparent', border: '1px solid #27272a', color: '#f5f5f5', fontFamily: '"Space Mono", monospace', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#dc2626'} onBlur={(e) => e.target.style.borderColor = '#27272a'} />
          </div>
          
          <button type="submit" disabled={isLoading} style={{ padding: '12px', background: isLoading ? '#52525b' : '#f5f5f5', color: '#0a0a0a', border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', fontFamily: '"Space Mono", monospace', fontWeight: 'bold', letterSpacing: '0.1em', marginTop: '8px' }}>
            {isLoading ? 'INITIALIZING...' : 'INITIALIZE ACCOUNT'}
          </button>
          
          <div style={{ fontSize: 12, color: '#a1a1aa', textAlign: 'center', marginTop: '16px' }}>
            Already have an account? <span style={{ color: '#dc2626', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate(redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login')}>LOGIN</span>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
}
