import React, { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import './CreateAccount.css';
import { useAuth } from '../auth/AuthContext.jsx';

export default function SignIn({ onNavigate }) {
  const { signIn, resetPassword } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await signIn(form.email, form.password);
      setIsSubmitting(false);
      onNavigate?.('home');
    } catch (err) {
      setIsSubmitting(false);
      alert(err?.message || 'Sign In Failed');
    }
  };

  return (
    <div className="create-account-wrapper">
      <div className="create-account-container">
        <div className="left-panel">
          <div className="logo-circle">
            <h2>CS STUDY ROOM</h2>
          </div>
        </div>

        <div className="right-panel">
          <div className="create-account-form">
            <h2>Sign in</h2>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">Username or Email address</label>
                <input id="email" name="email" value={form.email} onChange={handleChange} />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                  <label htmlFor="password" style={{ margin: 0 }}>password</label>
                  <button
                    type="button"
                    className="link-button"
                    onClick={async () => {
                        try {
                        if (!form.email) {
                          alert('Please enter your email first.');
                          return;
                        }
                        await resetPassword(form.email);
                        alert('Password Reset Email Sent');
                      } catch (err) {
                        alert(err?.message || 'Failed To Send Reset Email');
                      }
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="input-with-icon">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(s => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="submit-button">
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <div className="footer">
              <p>
                Don't have an account?{' '}
                <button type="button" className="link-button" onClick={() => onNavigate?.('createAccount')}>
                  Create Account
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
