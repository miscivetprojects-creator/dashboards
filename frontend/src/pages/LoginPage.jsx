import React, { useState } from 'react';
import { Lock, Mail, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.login(email, password);
      onLoginSuccess(response.user);
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: 'linear-gradient(rgba(10, 26, 44, 0.62), rgba(10, 26, 44, 0.72)), url("/login-bg.jpg")',
      backgroundSize: 'cover',
      backgroundPosition: 'center center',
      backgroundRepeat: 'no-repeat',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '390px',
        backgroundColor: '#FFFFFF',
        borderRadius: '6px',
        border: '1px solid rgba(255, 255, 255, 0.25)',
        boxShadow: '0 20px 45px rgba(0, 0, 0, 0.45), 0 2px 10px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden'
      }}>
        <div style={{
          backgroundColor: '#071626',
          padding: '22px 20px',
          textAlign: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0A1E35',
            padding: '12px 20px',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)',
            width: '100%',
            maxWidth: '280px',
            boxSizing: 'border-box'
          }}>
            <img 
              src="/civet-logo.png" 
              alt="Civet Dashboards" 
              style={{ 
                width: '100%',
                maxHeight: '64px',
                objectFit: 'contain', 
                display: 'block',
                filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.45))'
              }} 
            />
          </div>
        </div>

        <div style={{ padding: '24px 22px' }}>
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              padding: '10px 12px',
              backgroundColor: '#FBEFEB',
              border: '1px solid #F3C3C0',
              borderRadius: '4px',
              color: '#C8423A',
              fontSize: '11.5px',
              marginBottom: '16px'
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#576574', marginBottom: '6px' }}>
                Email
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  required
                  autoComplete="off"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter email"
                  style={{ width: '100%', height: '34px', paddingLeft: '32px', boxSizing: 'border-box' }}
                />
                <Mail size={14} color="#8395A7" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#576574', marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  style={{ width: '100%', height: '34px', paddingLeft: '32px', boxSizing: 'border-box' }}
                />
                <Lock size={14} color="#8395A7" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', height: '36px', fontSize: '12px' }}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>

      <div style={{
        marginTop: '18px',
        fontSize: '11.5px',
        fontWeight: '500',
        color: '#FFFFFF',
        textAlign: 'center',
        textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
        backgroundColor: 'rgba(10, 26, 44, 0.65)',
        padding: '5px 16px',
        borderRadius: '20px',
        backdropFilter: 'blur(6px)',
        border: '1px solid rgba(255, 255, 255, 0.15)'
      }}>
        © {new Date().getFullYear()} CIVET PROJECTS PRIVATE LIMITED
      </div>
    </div>
  );
}
