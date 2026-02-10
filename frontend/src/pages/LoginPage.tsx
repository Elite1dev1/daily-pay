import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { apiService } from '../services/api';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiService.login(email, password);
      
      if (response.success && response.data) {
        const { token, user } = response.data;
        login(token, user.id, user.role);

        // Redirect based on role
        if (user.role === 'agent') {
          navigate('/agent');
        } else if (user.role === 'operations_admin') {
          navigate('/admin');
        } else if (user.role === 'super_admin') {
          navigate('/super-admin');
        } else {
          navigate('/login');
        }
      } else {
        setError(response.error?.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      padding: '20px',
      backgroundColor: 'var(--bg-secondary)'
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, fontSize: '2rem', color: 'var(--primary)' }}>DaiLi Pay</h1>
          <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)' }}>Trust-minimized daily savings</p>
        </div>
        
        <Card>
          <form onSubmit={handleSubmit}>
            <h2 style={{ margin: '0 0 1.5rem 0' }}>Login</h2>
            
            {error && (
              <div style={{ 
                padding: '0.75rem', 
                marginBottom: '1rem', 
                backgroundColor: 'rgb(239 68 68 / 0.1)', 
                color: 'var(--error)', 
                borderRadius: 'var(--border-radius)',
                fontSize: '0.875rem'
              }}>
                {error}
              </div>
            )}

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ marginBottom: '1rem' }}
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ marginBottom: '1.5rem' }}
            />

            <Button 
              type="submit" 
              variant="primary"
              loading={loading}
              fullWidth
            >
              Login
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
