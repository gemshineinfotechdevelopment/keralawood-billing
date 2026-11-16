import { useState } from 'react'
import treeLogo from './assets/tree-logo.png'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import './App.css'

function App() {
  const [view, setView] = useState('login') // 'login' or 'billing'
  const [activeNav, setActiveNav] = useState('Stock Management')
  const [email, setEmail] = useState('rajesh.s@keralawood.com')
  const [password, setPassword] = useState('password123')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  const handleSubmit = (e) => {
    e.preventDefault()
    // Smooth transition into dashboard when logging in
    setView('billing')
  }

  // Dashboard / Billing Workspace View
  if (view === 'billing') {
    return (
      <div className="billing-layout">
        <Sidebar
          activeItem={activeNav}
          onItemSelect={(name) => setActiveNav(name)}
          onClose={() => setView('login')}
        />
        <main className="billing-main-area">
          {activeNav === 'Dashboard' || activeNav === 'Stock Management' ? (
            <Dashboard />
          ) : (
            <div className="module-placeholder">
              <div className="placeholder-card">
                <h2>{activeNav}</h2>
                <p>This module is connected to the Kerala Wood ERP system.</p>
                <button
                  type="button"
                  className="btn-back-dash"
                  onClick={() => setActiveNav('Dashboard')}
                >
                  ← Return to Dashboard
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    )
  }

  // Approved Login Page View
  return (
    <div className="login-page">
      {/* Top Header */}
      <header className="login-header">
        <div className="brand-section">
          <img src={treeLogo} alt="Kerala Wood" className="header-logo" />
          <div className="brand-text">
            <span className="brand-title">Kerala Wood</span>
            <span className="brand-subtitle">HERITAGE ARTISAN TIMBER</span>
          </div>
        </div>

        <div className="header-meta">
          <div className="node-pill">
            <span className="status-dot-green"></span>
            <span>NODE 01 • CALICUT GUILD</span>
          </div>
          <div className="erp-secure">
            <svg
              width="13"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#A08748"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span>ERP v4.12 SECURE</span>
          </div>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="login-main">
        <div className="login-card">
          <img src={treeLogo} alt="Kerala Wood Emblem" className="card-logo" />
          <h2 className="card-brand-title">Kerala Wood</h2>
          <div className="card-brand-subtitle">HERITAGE ARTISAN TIMBER</div>

          <h1 className="card-welcome-title">Welcome back</h1>
          <p className="card-description">
            Enter your credentials to access the Kerala Wood ERP
          </p>

          <form className="login-form" onSubmit={handleSubmit}>
            {/* Email / Staff ID Field (Pre-filled) */}
            <div className="form-group">
              <label htmlFor="email" className="input-label">
                EMAIL OR STAFF ID
              </label>
              <div className="input-container">
                <span className="input-icon">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="18" height="14" x="3" y="5" rx="2" />
                    <circle cx="8" cy="11" r="2" />
                    <path d="M14 9h4" />
                    <path d="M14 13h3" />
                  </svg>
                </span>
                <input
                  id="email"
                  type="text"
                  className="login-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@keralawood.com"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Password Field (Pre-filled) */}
            <div className="form-group">
              <div className="label-row">
                <label htmlFor="password" className="input-label">
                  PASSWORD
                </label>
                <a
                  href="#forgot"
                  className="forgot-password-link"
                  onClick={(e) => e.preventDefault()}
                >
                  Forgot password?
                </a>
              </div>
              <div className="input-container">
                <span className="input-icon">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="16" height="11" x="4" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="login-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" x2="22" y1="2" y2="22" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Encrypted Row */}
            <div className="options-row">
              <div
                className="remember-me-container"
                onClick={() => setRememberMe(!rememberMe)}
              >
                <div className={`custom-checkbox ${rememberMe ? '' : 'unchecked'}`}>
                  {rememberMe && (
                    <svg
                      width="9"
                      height="9"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <span className="remember-label">Remember me</span>
              </div>

              <div className="encrypted-status">
                <span className="status-dot-amber"></span>
                <span>Encrypted</span>
              </div>
            </div>

            {/* Submit Button */}
            <button type="submit" className="sign-in-btn">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" x2="3" y1="12" y2="12" />
              </svg>
              <span>Sign In</span>
            </button>
          </form>
        </div>

        {/* Support Help Text */}
        <p className="help-text">
          Need help signing in?{' '}
          <a
            href="#support"
            className="help-link"
            onClick={(e) => e.preventDefault()}
          >
            Contact Guild IT Support
          </a>
        </p>
      </main>

      {/* Footer */}
      <footer className="login-footer">
        <span className="footer-copyright">
          © 2024 Kerala Wood Timber Guild. All rights reserved.
        </span>
        <div className="footer-links">
          <a href="#privacy" className="footer-link" onClick={(e) => e.preventDefault()}>
            Privacy Policy
          </a>
          <span className="footer-bullet">•</span>
          <a href="#terms" className="footer-link" onClick={(e) => e.preventDefault()}>
            Terms of Service
          </a>
          <span className="footer-bullet">•</span>
          <a href="#help" className="footer-link" onClick={(e) => e.preventDefault()}>
            Help Center
          </a>
        </div>
      </footer>
    </div>
  )
}

export default App
