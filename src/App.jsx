import { useState, useEffect } from 'react'
import kwfLogo from './assets/kwf.jpg'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import StockManagement from './components/StockManagement'
import Products from './components/Products'
import Settings from './components/Settings'
import ReportsAnalytics from './components/ReportsAnalytics'
import BillingPOS from './components/BillingPOS'
import Customers from './components/Customers'
import Purchases from './components/Purchases'
import SalesPerson from './components/SalesPerson'
import ErrorBoundary from './components/ErrorBoundary'
import { DataStore } from './services/dataStore'
import './App.css'

function App() {
  const [view, setView] = useState(() => (sessionStorage.getItem('kwf_auth') === 'true' ? 'billing' : 'login'))
  const [userRole, setUserRole] = useState(() => sessionStorage.getItem('kwf_role') || 'super_admin') // 'super_admin' | 'admin'
  const [loginRole, setLoginRole] = useState(() => sessionStorage.getItem('kwf_role') || 'super_admin')
  const [activeNav, setActiveNav] = useState('Billing & POS')
  const [billingInitialMode, setBillingInitialMode] = useState('list')
  const [productsInitialMode, setProductsInitialMode] = useState('list')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [authCreds, setAuthCreds] = useState(() => DataStore.getAuthCredentials())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [settings, setSettings] = useState(() => DataStore.getSettings())

  useEffect(() => {
    const handleUpdate = () => {
      setSettings(DataStore.getSettings())
      setAuthCreds(DataStore.getAuthCredentials())
    }
    window.addEventListener('timber_store_updated', handleUpdate)
    return () => window.removeEventListener('timber_store_updated', handleUpdate)
  }, [])

  const handleSelectLoginRole = (role) => {
    setLoginRole(role)
    setLoginError('')
    setEmail('')
    setPassword('')
  }

  const handleToggleRole = () => {
    // Only super_admin can switch to admin view; Admin cannot switch to super_admin
    if (userRole === 'super_admin') {
      setUserRole('admin')
      setLoginRole('admin')
      sessionStorage.setItem('kwf_role', 'admin')
      if (['Purchases', 'Reports & Analytics', 'Settings'].includes(activeNav)) {
        setActiveNav('Billing & POS')
      }
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoginError('')

    const authResult = DataStore.validateLogin(email, password, loginRole)
    if (!authResult.success) {
      setLoginError(authResult.message)
      return
    }

    const effectiveRole = authResult.role
    sessionStorage.setItem('kwf_auth', 'true')
    sessionStorage.setItem('kwf_role', effectiveRole)
    setUserRole(effectiveRole)
    setView('billing')
    if (effectiveRole === 'admin' && ['Purchases', 'Reports & Analytics', 'Settings'].includes(activeNav)) {
      setActiveNav('Billing & POS')
    } else {
      setActiveNav('Billing & POS')
    }
  }

  // Dashboard / Billing Workspace View
  if (view === 'billing') {
    return (
      <div className={`billing-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Mobile Backdrop Overlay */}
        {mobileSidebarOpen && (
          <div
            className="mobile-sidebar-backdrop"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        <Sidebar
          activeItem={activeNav}
          userRole={userRole}
          onToggleRole={handleToggleRole}
          onItemSelect={(name) => {
            if (name === 'Billing & POS') {
              setBillingInitialMode('list')
            }
            if (name === 'Products') {
              setProductsInitialMode('list')
            }
            setActiveNav(name)
            setMobileSidebarOpen(false)
          }}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          isMobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          onClose={() => setMobileSidebarOpen(false)}
          onLogout={() => {
            sessionStorage.removeItem('kwf_auth')
            setView('login')
            setMobileSidebarOpen(false)
          }}
        />

        <main className="billing-main-area">
          {/* Mobile Navigation Header Bar with Hamburger Menu */}
          <div className="mobile-app-header">
            <button
              type="button"
              className="btn-mobile-hamburger"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open Navigation Menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="mobile-header-brand">
              <span className="mobile-header-title">{settings.depotName || 'Kerala Wood Furniture'}</span>
            </div>
            <div
              className="mobile-header-tag"
              onClick={userRole === 'super_admin' ? handleToggleRole : undefined}
              style={{ cursor: userRole === 'super_admin' ? 'pointer' : 'default' }}
              title={userRole === 'super_admin' ? 'Click to switch to Admin' : 'Signed in as Admin'}
            >
              <span className="mobile-header-tag-icon">{userRole === 'super_admin' ? '👑' : '👤'}</span>
              <span className="mobile-header-tag-text">{userRole === 'super_admin' ? 'Super Admin' : 'Admin'}</span>
            </div>
          </div>

          <ErrorBoundary>
            {userRole === 'admin' && ['Purchases', 'Reports & Analytics', 'Settings'].includes(activeNav) ? (
              <div className="module-placeholder access-denied-wrapper">
                <div className="placeholder-card access-denied-card">
                  <div style={{ fontSize: '38px', marginBottom: '10px' }}>🔒</div>
                  <span className="access-denied-badge">RESTRICTED TO SUPER ADMIN</span>
                  <h2 style={{ color: '#31190B', marginTop: '12px', fontSize: '22px' }}>
                    Access Restricted: {activeNav}
                  </h2>
                  <p style={{ color: '#6A564A', maxWidth: '480px', margin: '10px auto 20px', lineHeight: '1.5', fontSize: '13px' }}>
                    You are currently signed in as <strong>Admin</strong>. The <strong>{activeNav}</strong> module contains confidential inward procurement, company reports, or depot settings and requires <strong>Super Admin</strong> authorization.
                  </p>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn-back-dash"
                      onClick={() => setActiveNav('Billing & POS')}
                    >
                      ← Return to Billing & POS
                    </button>
                    <button
                      type="button"
                      className="btn-back-dash"
                      style={{ backgroundColor: '#31190B', color: '#FFF' }}
                      onClick={() => {
                        sessionStorage.removeItem('kwf_auth')
                        setView('login')
                        handleSelectLoginRole('super_admin')
                      }}
                    >
                      🔑 Login as Super Admin
                    </button>
                  </div>
                </div>
              </div>
            ) : activeNav === 'Products' ? (
              <Products initialViewMode={productsInitialMode} />
            ) : activeNav === 'Stock Management' ? (
              <StockManagement
                onAddNewProduct={() => {
                  setProductsInitialMode('add')
                  setActiveNav('Products')
                }}
              />
            ) : activeNav === 'Dashboard' ? (
              <Dashboard
                onNavigateToNewBill={() => {
                  DataStore.createNewDraft()
                  setBillingInitialMode('editor')
                  setActiveNav('Billing & POS')
                }}
                onNavigateToNewInvoice={() => {
                  DataStore.createNewDraft()
                  setBillingInitialMode('editor')
                  setActiveNav('Billing & POS')
                }}
                onNavigate={(nav) => {
                  if (nav === 'Billing & POS') setBillingInitialMode('list')
                  setActiveNav(nav)
                }}
              />
            ) : activeNav === 'Settings' ? (
              <Settings />
            ) : activeNav === 'Reports & Analytics' ? (
              <ReportsAnalytics />
            ) : activeNav === 'Billing & POS' ? (
              <BillingPOS
                initialViewMode={billingInitialMode}
                onNavigateToProducts={() => setActiveNav('Products')}
              />
            ) : activeNav === 'Customers' ? (
              <Customers onNavigateToBilling={() => {
                setBillingInitialMode('editor')
                setActiveNav('Billing & POS')
              }} />
            ) : activeNav === 'Purchases' ? (
              <Purchases />
            ) : activeNav === 'Sales Person' ? (
              <SalesPerson />
            ) : (
              <div className="module-placeholder">
                <div className="placeholder-card">
                  <h2>{activeNav}</h2>
                  <p>This module is connected to the Kerala Wood Furniture ERP system.</p>
                  <button
                    type="button"
                    className="btn-back-dash"
                    onClick={() => setActiveNav('Products')}
                  >
                    ← Return to Products
                  </button>
                </div>
              </div>
            )}
          </ErrorBoundary>
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
          <img src={settings.logoUrl || kwfLogo} alt={settings.depotName || 'Brand Logo'} className="header-logo" />
          <div className="brand-text">
            <span className="brand-title">{settings.depotName || 'Kerala Wood Furniture'}</span>
            <span className="brand-subtitle">{settings.yardLocation || settings.depotLocation || 'Central Depot'}</span>
          </div>
        </div>

        <div className="header-meta">
          <div className="node-pill">
            <span className="status-dot-green"></span>
            <span>{settings.depotLocation || settings.yardLocation || 'Sivakasi'}</span>
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
            <span>Secure Portal</span>
          </div>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="login-main">
        <div className="login-card">
          <img src={settings.logoUrl || kwfLogo} alt={settings.depotName || 'Brand Logo'} className="card-logo" />
          <h2 className="card-brand-title">{settings.depotName || 'Kerala Wood Furniture'}</h2>
          <div className="card-brand-subtitle">Billing & Inventory</div>

          <h1 className="card-welcome-title">Welcome back</h1>
          <p className="card-description">
            Sign in to your account
          </p>

          <form className="login-form" onSubmit={handleSubmit}>
            {/* Account Role Selector */}
            <div className="login-role-selector">
              <label className="input-label" style={{ textAlign: 'left', display: 'block', marginBottom: '6px' }}>
                SELECT LOGIN ROLE
              </label>
              <div className="login-role-chips">
                <button
                  type="button"
                  className={`login-role-chip ${loginRole === 'super_admin' ? 'active' : ''}`}
                  onClick={() => handleSelectLoginRole('super_admin')}
                >
                  👑 Super Admin
                </button>
                <button
                  type="button"
                  className={`login-role-chip ${loginRole === 'admin' ? 'active' : ''}`}
                  onClick={() => handleSelectLoginRole('admin')}
                >
                  👤 Admin
                </button>
              </div>
              <p className="login-role-hint">
                {loginRole === 'super_admin'
                  ? '✓ Super Admin: Full unrestricted access to all modules and system settings'
                  : '⚠️ Admin: Operational store access (Purchases, Reports & Settings are restricted)'}
              </p>
            </div>

            {/* Error Alert */}
            {loginError && (
              <div className="login-error-alert" role="alert">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{loginError}</span>
              </div>
            )}

            {/* User ID Field */}
            <div className="form-group">
              <label htmlFor="email" className="input-label">
                {loginRole === 'super_admin' ? 'SUPER ADMIN USER ID' : 'ADMIN USER ID'}
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
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <input
                  id="email"
                  type="text"
                  className={`login-input ${loginError ? 'login-input-error' : ''}`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (loginError) setLoginError('')
                  }}
                  placeholder={loginRole === 'super_admin' ? 'superadmin@2026' : 'admin'}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label htmlFor="password" className="input-label">
                {loginRole === 'super_admin' ? 'SUPER ADMIN PASSWORD' : 'ADMIN PASSWORD'}
              </label>
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
                  className={`login-input ${loginError ? 'login-input-error' : ''}`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (loginError) setLoginError('')
                  }}
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
            Contact Support
          </a>
        </p>
      </main>

      {/* Footer */}
      <footer className="login-footer">
        <span className="footer-copyright">
          © {new Date().getFullYear()} {settings.depotName || 'Kerala Wood Furniture'}. All rights reserved.
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
