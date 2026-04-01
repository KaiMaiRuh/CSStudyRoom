import { useMemo, useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import './CreateAccount.css';
import { useAuth } from '../../auth/AuthContext.jsx';
import LogoImg from '../../assets/Logo.png';

const STRENGTH_MAP = {
  weak: { label: 'Weak', color: '#e74c3c', rank: 0 },
  fair: { label: 'Fair', color: '#f0ab00', rank: 1 },
  strong: { label: 'Strong', color: '#9dbf2f', rank: 2 },
  verystrong: { label: 'Very Strong', color: '#2fa84f', rank: 3 },
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

const CreateAccount = ({ onNavigate }) => {
  const { signUp } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const passwordStrength = useMemo(() => getPasswordStrength(formData.password), [formData.password]);
  const canUsePassword = passwordStrength.rank >= STRENGTH_MAP.strong.rank;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (serverError) setServerError('');
    
    /* clear error */
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!canUsePassword) {
      newErrors.password = 'Password must be Strong or Very Strong';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const formErrors = validateForm();
    
    if (Object.keys(formErrors).length === 0) {
      setIsSubmitting(true);
      try {
        await signUp({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          username: formData.username,
        });

        setIsSubmitting(false);
        alert('Account Created Successfully!');
        /* reset form */
        setFormData({
          fullName: '',
          username: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
        onNavigate?.('editProfile');
      } catch (err) {
        setIsSubmitting(false);
        setServerError(err?.message || 'Failed To Create Account');
      }
    } else {
      setErrors(formErrors);
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
            <h2 style={{ fontSize: '50px', fontWeight: 600, color: '#000000', marginBottom: '32px', textAlign: 'left' }}>Create Account</h2>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#444', marginBottom: '32px', textAlign: 'center' }}>Join us</h2>

            {serverError && (
              <div className="error-message" role="alert" style={{ marginBottom: 10 }}>
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="fullName" style={{ fontSize: '20px', fontWeight: 600, color: '#BEBEBE',textAlign: 'left' }}>Full Name</label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className={errors.fullName ? 'error' : ''}
                />
                {errors.fullName && <span className="error-message">{errors.fullName}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="username"style={{ fontSize: '20px', fontWeight: 600, color: '#BEBEBE',textAlign: 'left' }}>Username</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className={errors.username ? 'error' : ''}
                />
                {errors.username && <span className="error-message">{errors.username}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="email"style={{ fontSize: '20px', fontWeight: 600, color: '#BEBEBE',textAlign: 'left' }}>Email (s6X0406261xxxx@email.kmutnb.ac.th)</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={errors.email ? 'error' : ''}
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="password"style={{ fontSize: '20px', fontWeight: 600, color: '#BEBEBE',textAlign: 'left' }}>Password</label>
                <div className="input-with-icon">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={errors.password ? 'error' : ''}
                  />
                  <button type="button" className="toggle-password" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <FaEye /> : <FaEyeSlash />}
                  </button>
                </div>
                <div
                  className="create-password-strength"
                  style={{ '--create-strength-color': passwordStrength.color }}
                  aria-live="polite"
                >
                  <div className="create-strength-bars" role="presentation">
                    {[0, 1, 2, 3].map((index) => (
                      <span
                        key={index}
                        className={`create-strength-bar ${index <= passwordStrength.rank ? 'is-active' : ''}`}
                      />
                    ))}
                  </div>
                  <p className={`create-strength-label create-strength-${passwordStrength.level}`}>
                    {passwordStrength.label} Password
                  </p>
                  <p className="create-strength-hint">Only Strong and Very Strong passwords are allowed.</p>
                </div>
                {errors.password && <span className="error-message">{errors.password}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword"style={{ fontSize: '20px', fontWeight: 600, color: '#BEBEBE',textAlign: 'left' }}>Confirm Password</label>
                <div className="input-with-icon">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={errors.confirmPassword ? 'error' : ''}
                  />
                  <button type="button" className="toggle-password" aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'} onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <FaEye /> : <FaEyeSlash />}
                  </button>
                </div>
                {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
              </div>

              <button type="submit" disabled={isSubmitting} className="submit-button">
                {isSubmitting ? 'Signing Up...' : 'Sign up'}
              </button>
            </form>
            
            <div className="auth-switch-footer">
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  className="link-button"
                  onClick={(e) => {
                    e.preventDefault();
                    setServerError('');
                    onNavigate?.('signin');
                  }}
                >
                  Sign in
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAccount;