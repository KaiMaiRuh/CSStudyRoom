import React, { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import './CreateAccount.css';
import { useAuth } from '../auth/AuthContext.jsx';

export default function SignIn({ onNavigate }) {
  const { signIn, resetPassword } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [showForgotView, setShowForgotView] = useState(false);
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotError, setForgotError] = useState('');
  
  const [isHacked, setIsHacked] = useState(false);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const isWeakPassword = (pw) => {
    const strongRegex = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.{8,})");
    return !strongRegex.test(pw);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isWeakPassword(form.password)) {
      setIsHacked(true);
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn(form.email, form.password);
      setIsSubmitting(false);
      onNavigate?.('home');
    } catch (err) {
      setIsSubmitting(false);
      alert(err?.message || 'Log in Failed');
    }
  };

  const openForgotView = () => {
    setForgotEmail(String(form.email || '').trim());
    setForgotSuccess('');
    setForgotError('');
    setShowForgotView(true);
  };

  const closeForgotView = () => {
    setForgotSuccess('');
    setForgotError('');
    setShowForgotView(false);
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotSuccess('');
    setForgotError('');

    const normalizedEmail = String(forgotEmail || '').trim();
    if (!normalizedEmail) {
      setForgotError('Please enter your email first.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(normalizedEmail)) {
      setForgotError('Please enter a valid email address.');
      return;
    }

    setIsForgotSubmitting(true);
    try {
      await resetPassword(normalizedEmail);
      setForgotSuccess('Password reset link sent. Please check your email.');
      setForm((prev) => ({ ...prev, email: normalizedEmail }));
    } catch (err) {
      setForgotError(err?.message || 'Failed To Send Reset Email');
    } finally {
      setIsForgotSubmitting(false);
    }
  };

  if (isHacked) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        backgroundColor: 'black',
        color: '#ff0000',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999,
        fontFamily: "'Courier New', Courier, monospace",
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', margin: 0, textShadow: '0 0 10px red' }}>
          YOU ARE HACKED
        </h1>
        <p style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', color: '#00ff00', marginTop: '20px' }}>
          กุบอกให้มึงไป reset password
        </p>
        <button 
          onClick={() => setIsHacked(false)}
          style={{
            marginTop: '50px',
            padding: '15px 30px',
            fontSize: '1.2rem',
            backgroundColor: 'transparent',
            color: 'white',
            border: '2px solid #333',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
          onMouseOver={(e) => e.target.style.borderColor = 'red'}
          onMouseOut={(e) => e.target.style.borderColor = '#333'}
        >
          ยอมรับความโง่แล้วกลับไปหน้า Login
        </button>
      </div>
    );
  }

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
            {showForgotView ? (
              <>
                <h2>Forgot Password</h2>
                <p className="signin-forgot-helper">Enter your account email to receive a reset link.</p>

                {forgotSuccess ? <p className="success-message">{forgotSuccess}</p> : null}
                {forgotError ? <p className="error-message">{forgotError}</p> : null}

                <form onSubmit={handleForgotSubmit}>
                  <div className="form-group">
                    <label htmlFor="forgotEmail">Email address</label>
                    <input
                      id="forgotEmail"
                      name="forgotEmail"
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                    />
                  </div>

                  <button type="submit" disabled={isForgotSubmitting} className="submit-button">
                    {isForgotSubmitting ? 'Sending...' : 'Send reset link'}
                  </button>
                </form>

                <div className="auth-switch-footer">
                  <p>
                    <button type="button" className="link-button" onClick={closeForgotView}>
                      Back to Log in
                    </button>
                  </p>
                </div>
              </>
            ) : (
              <>
                <h2>Log in</h2>

                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label htmlFor="email">Email address</label>
                    <input id="email" name="email" value={form.email} onChange={handleChange} />
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                      <label htmlFor="password" style={{ margin: 0 }}>password</label>
                      <button type="button" className="link-button" onClick={openForgotView}>
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
                    {isSubmitting ? 'Logging in...' : 'Log in'}
                  </button>
                </form>

                <div className="auth-switch-footer">
                  <p>
                    Don't have an account?{' '}
                    <button type="button" className="link-button" onClick={() => onNavigate?.('createAccount')}>
                      Create Account
                    </button>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}