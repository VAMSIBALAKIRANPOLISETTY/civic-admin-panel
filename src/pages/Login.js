import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from '../firebase'; // <-- Importing the connection we just made
import './Dashboard.css'; 

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); // Clear any old errors
    
    try {
      // This is the actual call to Firebase!
      await signInWithEmailAndPassword(auth, email, password);
      
      // If successful, jump to the dashboard
      navigate('/dashboard'); 
    } catch (err) {
      // If password is wrong or user doesn't exist, show error
      setError("Login Failed: " + err.message);
    }
  };

  return (
    <div className="admin-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="card" style={{ width: '400px', padding: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#1e293b' }}>Admin Portal Login</h2>
        
        {/* Error Message Box */}
        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#ef4444', padding: '10px', borderRadius: '5px', marginBottom: '15px', fontSize: '0.9rem', textAlign: 'center' }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ fontWeight: 'bold', color: '#64748b', fontSize: '0.9rem' }}>Admin Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              placeholder="admin@civic.com"
              style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ fontWeight: 'bold', color: '#64748b', fontSize: '0.9rem' }}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              placeholder="••••••••"
              style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <button 
            type="submit" 
            style={{ backgroundColor: '#3b82f6', color: 'white', padding: '12px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px', fontSize: '1rem' }}
          >
            Secure Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;