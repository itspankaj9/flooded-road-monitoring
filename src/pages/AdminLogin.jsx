import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { loginAdmin } from '../lib/supabaseService';
import './AdminLogin.css';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { loginAdminContext } = useAppContext();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!username || !password) {
      setError('Please enter both username and password.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await loginAdmin(username, password);
      
      if (response.success) {
        loginAdminContext();
      } else {
        setError(response.message || 'Authentication failed.');
      }
    } catch (err) {
      setError('An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <span className="material-symbols-outlined">shield_person</span>
          <h1>Admin Portal</h1>
          <p>Sign in to manage smart infrastructure</p>
        </div>

        <form className="admin-login-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <div className="form-input-wrapper">
              <span className="material-symbols-outlined">person</span>
              <input
                id="username"
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="form-input-wrapper">
              <span className="material-symbols-outlined">lock</span>
              <input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <div className="login-error">
              <span className="material-symbols-outlined">error</span>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="admin-login-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="material-symbols-outlined btn-spinner">progress_activity</span>
            ) : (
              <>
                <span>Sign In</span>
                <span className="material-symbols-outlined">arrow_forward</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
