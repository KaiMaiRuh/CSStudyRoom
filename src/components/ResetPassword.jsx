import { useEffect, useMemo, useState } from 'react';
import { FaCheck, FaEye, FaEyeSlash, FaLock } from 'react-icons/fa';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { getFirebaseServices, isFirebaseConfigured } from '../firebase';
import './ResetPassword.css';

const STRENGTH_MAP = {
  weak: { label: 'Weak', color: '#e74c3c', rank: 0 },
  fair: { label: 'Fair', color: '#f6c742', rank: 1 },
  strong: { label: 'Strong', color: '#a0c83c', rank: 2 },
  verystrong: { label: 'Very Strong', color: '#35a857', rank: 3 },
};

function getPasswordStrength(password) {
  const value = String(password || '');
  const hasMinLength = value.length >= 8;
  const hasUppercase = /[A-Z]/.test(value);
  const hasNumber = /\d/.test(value);
  const hasSpecial = /[^A-Za-z0-9]/.test(value);

  if (!hasMinLength) return { level: 'weak', ...STRENGTH_MAP.weak };
  if (!(hasUppercase && hasNumber)) return { level: 'fair', ...STRENGTH_MAP.fair };
  if (hasSpecial) return { level: 'verystrong', ...STRENGTH_MAP.verystrong };
  return { level: 'strong', ...STRENGTH_MAP.strong };
}

function getResetParams() {
  const params = new URLSearchParams(window.location.search || '');
  const hash = window.location.hash || '';
  const hashQueryIndex = hash.indexOf('?');

  if (hashQueryIndex >= 0) {
    const hashParams = new URLSearchParams(hash.slice(hashQueryIndex + 1));
    hashParams.forEach((value, key) => {
      params.set(key, value);
    });
  }

  return params;
}

function getResetErrorMessage(error) {
  switch (error?.code) {
    case 'auth/expired-action-code':
    case 'auth/invalid-action-code':
      return 'This reset link is invalid or expired. Please request a new one.';
    case 'auth/weak-password':
      return 'Password is too weak. Please choose a stronger password.';
    default:
      return error?.message || 'Unable to reset password. Please try again.';
  }
}

export default function ResetPassword({ onNavigate }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCheckingLink, setIsCheckingLink] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [linkError, setLinkError] = useState('');
  const [submitError, setSubmitError] = useState('');

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const canUsePassword = strength.rank >= STRENGTH_MAP.strong.rank;

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setLinkError('Firebase is not configured. Please configure env variables first.');
      setIsCheckingLink(false);
      return;
    }

    const params = getResetParams();
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');

    if (mode !== 'resetPassword' || !oobCode) {
      setLinkError('Invalid reset link. Please request a new password reset email.');
      setIsCheckingLink(false);
      return;
    }

    setResetCode(oobCode);

    let isActive = true;

    const verifyCode = async () => {
      try {
        const { auth } = getFirebaseServices();
        const resolvedEmail = await verifyPasswordResetCode(auth, oobCode);
        if (!isActive) return;
        setTargetEmail(resolvedEmail || '');
      } catch (error) {
        if (!isActive) return;
        setLinkError(getResetErrorMessage(error));
      } finally {
        if (isActive) {
          setIsCheckingLink(false);
        }
      }
    };

    verifyCode();

    return () => {
      isActive = false;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');

    if (!canUsePassword) {
      setSubmitError('Password must be Strong or Very Strong.');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match.');
      return;
    }

    if (!resetCode) {
      setSubmitError('Reset code is missing. Please request a new reset email.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { auth } = getFirebaseServices();
      await confirmPasswordReset(auth, resetCode, password);
      setIsSuccess(true);
      setPassword('');
      setConfirmPassword('');
      try {
        window.history.replaceState({}, '', '#/reset-password');
      } catch {
        // Ignore history replace failures and keep success state in-memory.
      }
    } catch (error) {
      setSubmitError(getResetErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="reset-password-page">
      <div className="reset-password-card">
        {isSuccess ? (
          <>
            <div className="reset-password-icon success">
              <FaCheck />
            </div>
            <h2>The password has been reset!</h2>
            <button
              type="button"
              className="reset-password-button"
              onClick={() => onNavigate?.('signin')}
            >
              Sign in now
            </button>
          </>
        ) : isCheckingLink ? (
          <>
            <div className="reset-password-icon">
              <FaLock />
            </div>
            <h2>Checking reset link...</h2>
            <p className="reset-password-subtitle">Please wait a moment.</p>
          </>
        ) : linkError ? (
          <>
            <div className="reset-password-icon">
              <FaLock />
            </div>
            <h2>Reset link problem</h2>
            <p className="reset-password-subtitle">{linkError}</p>
            <button
              type="button"
              className="reset-password-button"
              onClick={() => onNavigate?.('signin')}
            >
              Back to Sign in
            </button>
          </>
        ) : (
          <>
            <div className="reset-password-icon">
              <FaLock />
            </div>
            <h2>New Password?</h2>
            <p className="reset-password-subtitle">Enter your new password!</p>
            {targetEmail ? (
              <p className="reset-password-email">Account: {targetEmail}</p>
            ) : null}

            <form className="reset-password-form" onSubmit={handleSubmit}>
              <div className="reset-field-group">
                <label htmlFor="newPassword">Password</label>
                <div className="reset-input-with-icon">
                  <input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="reset-toggle-password"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>

                <div
                  className="password-strength"
                  style={{ '--strength-color': strength.color }}
                  aria-live="polite"
                >
                  <div className="strength-bars" role="presentation">
                    {[0, 1, 2, 3].map((index) => (
                      <span
                        key={index}
                        className={`strength-bar ${index <= strength.rank ? 'is-active' : ''}`}
                      />
                    ))}
                  </div>
                  <p className={`strength-label strength-${strength.level}`}>
                    {strength.label} password
                  </p>
                  <p className="strength-hint">Only Strong and Very Strong passwords are allowed.</p>
                </div>
              </div>

              <div className="reset-field-group">
                <label htmlFor="confirmNewPassword">Confirm password</label>
                <div className="reset-input-with-icon">
                  <input
                    id="confirmNewPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="reset-toggle-password"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              {submitError ? <p className="reset-error-message">{submitError}</p> : null}

              <button
                type="submit"
                className="reset-password-button"
                disabled={isSubmitting || !canUsePassword || !confirmPassword || password !== confirmPassword}
              >
                {isSubmitting ? 'Confirming...' : 'Confirm'}
              </button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
