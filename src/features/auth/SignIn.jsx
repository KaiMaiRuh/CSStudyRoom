import React, { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import './CreateAccount.css';
import { useAuth } from '../../auth/AuthContext.jsx';
import LogoImg from '../../assets/Logo.png';

export default function SignIn({ onNavigate }) {
  const { signIn, resetPassword } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [showForgotView, setShowForgotView] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotError, setForgotError] = useState('');

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

  return (
    <div className="create-account-wrapper">
      <div className="create-account-container">
        <div className="left-panel">
          <div className="logo-circle">
            <img src={LogoImg} alt="CS Study Room Logo" style={{ width: '180%', height: '180%', objectFit: 'contain' }} />
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
                <h2 style={{ fontSize: '35px', fontWeight: 600, color: '#121212', marginBottom: '32px', textAlign: 'center', whiteSpace: 'nowrap' }}>Welcome to CS study room!</h2>
                <h2 style={{ fontSize: '30px', fontWeight: 600, color: '#444', marginBottom: '32px', textAlign: 'center' }}>Sign in</h2>

                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label htmlFor="email"style={{ margin: 0, fontWeight: 600, color: '#BEBEBE', fontSize: '20px' }}>Email address</label>
                    <input id="email" name="email" value={form.email} onChange={handleChange} />
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: '8px' }}>
                      <label htmlFor="password" style={{ margin: 0, fontWeight: 600, color: '#BEBEBE', fontSize: '20px' }}>Password</label>
                      <button type="button" className="link-button" onClick={openForgotView} style={{ fontWeight: 600, fontSize: '20px', color: '#1a2b48' }}>
                        Forgot password?
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
                        {showPassword ? <FaEye /> : <FaEyeSlash />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={isSubmitting} className="submit-button">
                    {isSubmitting ? 'Signing in...' : 'Sign in'}
                  </button>
                </form>

                <div className="auth-switch-footer">
                  <p>
                    Don't have an account?{' '}
                    <button type="button" className="link-button" onClick={() => onNavigate?.('createAccount')}>
                      Sign up
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