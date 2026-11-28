import { useState, useEffect } from 'react'
import { DataStore } from '../services/dataStore'
import kwfLogo from '../assets/kwf.jpg'
import './Sidebar.css'

export default function Sidebar({
  activeItem = 'Stock Management',
  onItemSelect,
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
  onClose,
  onLogout,
  userRole = 'super_admin',
  onToggleRole,
  currentBranch = 'sivakasi',
  onSelectBranch,
}) {
  const [localActive, setLocalActive] = useState(activeItem)
  const [settings, setSettings] = useState(() => DataStore.getSettings())
  const current = activeItem !== undefined ? activeItem : localActive

  useEffect(() => {
    const handleUpdate = () => setSettings(DataStore.getSettings())
    window.addEventListener('timber_store_updated', handleUpdate)
    return () => window.removeEventListener('timber_store_updated', handleUpdate)
  }, [])

  const handleSelect = (name) => {
    setLocalActive(name)
    if (onItemSelect) onItemSelect(name)
    if (onCloseMobile) onCloseMobile()
  }

  const navItems = [
    {
      name: 'Dashboard',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
          <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
          <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
          <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
        </svg>
      ),
    },
    {
      name: 'Products',
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
        </svg>
      ),
    },
    {
      name: 'Stock Management',
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5" />
          <path d="M12 22V12" />
        </svg>
      ),
    },
    {
      name: 'Purchases',
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      ),
    },
    {
      name: 'Billing & POS',
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="m13 11-3 4h4l-2 4" />
        </svg>
      ),
    },
    {
      name: 'Customers',
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      name: 'Sales Person',
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="7" r="4" />
          <path d="M5.5 21a8.38 8.38 0 0 1 13 0" />
          <path d="M16 11l2 2 4-4" />
        </svg>
      ),
    },
    {
      name: 'Reports & Analytics',
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 3h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
          <path d="M8 9l3-2 3 4 3-2" />
          <path d="M12 15v5" />
          <path d="M8 20h8" />
        </svg>
      ),
    },
    {
      name: 'Settings',
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
    },
  ]

  return (
    <aside
      className={`sidebar-container ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}
      aria-label="Main Navigation"
    >
      {/* Header */}
      <div className="sidebar-header">
        {!isCollapsed ? (
          <div className="sidebar-brand">
            <img src={settings.logoUrl || kwfLogo} alt="Kerala Wood Furniture Logo" className="sidebar-custom-logo" />
            <div className="sidebar-brand-text-col">
              <span className="sidebar-brand-title">{settings.depotName ? settings.depotName.split('-')[0].trim() : 'Kerala Wood Furniture'}</span>
              <span className="sidebar-brand-subtitle">{currentBranch === 'karur' ? 'Karur Sub-Branch' : 'Sivakasi Head Branch'}</span>
            </div>
          </div>
        ) : (
          <div className="sidebar-brand-mini" title={settings.depotName || 'Kerala Wood Furniture'}>
            <img src={settings.logoUrl || kwfLogo} alt="Kerala Wood Furniture Logo" className="sidebar-custom-logo-mini" />
          </div>
        )}

        <div className="sidebar-header-actions">
          {/* Collapse Toggle for Desktop (Requirement 1) */}
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="13 17 18 12 13 7" />
                <polyline points="6 17 11 12 6 7" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="11 17 6 12 11 7" />
                <polyline points="18 17 13 12 18 7" />
              </svg>
            )}
          </button>

          {/* Close button for Mobile View Menu */}
          <button
            type="button"
            className="sidebar-mobile-close-btn"
            onClick={() => {
              if (onCloseMobile) onCloseMobile()
              else if (onClose) onClose()
            }}
            aria-label="Close sidebar menu"
            title="Close menu"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Branch Selector ERP Console Widget */}
      {!isCollapsed ? (
        <div className="sidebar-branch-box">
          <div className="sidebar-branch-box-header">
            <span className="sidebar-branch-box-title">BRANCH CONSOLE</span>
            {userRole === 'super_admin' ? (
              <span className="sidebar-branch-box-role-badge super">SUPER ADMIN</span>
            ) : (
              <span className="sidebar-branch-box-role-badge admin">ADMIN</span>
            )}
          </div>

          {userRole === 'super_admin' ? (
            <div className="sidebar-branch-toggle-group">
              <button
                type="button"
                className={`sidebar-branch-toggle-btn ${currentBranch === 'sivakasi' ? 'active' : ''}`}
                onClick={() => onSelectBranch && onSelectBranch('sivakasi')}
                title="Switch to Sivakasi Head Branch"
              >
                <span className="branch-toggle-icon">🏢</span>
                <span className="branch-toggle-text">Sivakasi</span>
                {currentBranch === 'sivakasi' && <span className="branch-toggle-indicator">HEAD</span>}
              </button>
              <button
                type="button"
                className={`sidebar-branch-toggle-btn ${currentBranch === 'karur' ? 'active' : ''}`}
                onClick={() => onSelectBranch && onSelectBranch('karur')}
                title="Switch to Karur Sub-Branch"
              >
                <span className="branch-toggle-icon">🌿</span>
                <span className="branch-toggle-text">Karur</span>
                {currentBranch === 'karur' && <span className="branch-toggle-indicator">SUB</span>}
              </button>
            </div>
          ) : (
            <div className="sidebar-branch-fixed-badge">
              <span className="branch-toggle-icon">{currentBranch === 'karur' ? '🌿' : '🏢'}</span>
              <span className="branch-toggle-text">{currentBranch === 'karur' ? 'Karur Sub-Branch' : 'Sivakasi Head Branch'}</span>
              <span className="branch-fixed-lock" title="Account locked to this branch">🔒</span>
            </div>
          )}
        </div>
      ) : (
        <div
          className="sidebar-branch-mini-pill"
          title={`Active Branch: ${currentBranch === 'karur' ? 'Karur Sub-Branch' : 'Sivakasi Head Branch'}`}
        >
          <span>{currentBranch === 'karur' ? 'KRR' : 'SVK'}</span>
        </div>
      )}

      {/* Navigation Items & Scrollable Section */}
      <div className="sidebar-nav-section">
        {!isCollapsed && (
          <span className="sidebar-section-label">
            MENU {userRole === 'admin' ? '(ADMIN ACCESS)' : '(SUPER ADMIN)'}
          </span>
        )}
        <ul className="sidebar-menu">
          {navItems
            .filter((item) => {
              if (userRole === 'admin') {
                return !['Purchases', 'Settings'].includes(item.name)
              }
              return true
            })
            .map((item) => {
              const isActive = current === item.name
              return (
                <li key={item.name} className="sidebar-menu-item">
                  <button
                    type="button"
                    className={`sidebar-menu-btn ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelect(item.name)}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <span className="sidebar-menu-icon">{item.icon}</span>
                    {!isCollapsed && <span>{item.name}</span>}
                  </button>
                </li>
              )
            })}
        </ul>

        {/* User Card & Logout (now inside scrollable area so it shows when scrolled to bottom) */}
        <div className="sidebar-footer">
          <div className={`sidebar-user-card ${isCollapsed ? 'compact' : ''}`}>
            <div className="sidebar-user-top">
              <div className="sidebar-user-avatar" title={userRole === 'super_admin' ? 'Super Admin' : 'Admin'}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              {!isCollapsed && (
                <div className="sidebar-user-info">
                  <span className="sidebar-user-name">{userRole === 'super_admin' ? 'Super Admin' : 'Admin'}</span>
                  <span className="sidebar-user-role">
                    <span className="sidebar-role-icon">{userRole === 'super_admin' ? '👑' : '👤'}</span>
                    <span className="sidebar-role-text">{userRole === 'super_admin' ? 'Super Admin' : 'Admin'}</span>
                  </span>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <>
                <div className="depot-divider"></div>
                <div className="sidebar-role-switch-container">
                  <div className="sidebar-role-indicator">
                    <span className={`role-pill-badge ${userRole === 'super_admin' ? 'role-super' : 'role-admin'}`}>
                      {userRole === 'super_admin' ? 'Super Admin (Full)' : 'Admin (Restricted)'}
                    </span>
                  </div>
                  {onToggleRole && userRole === 'super_admin' && (
                    <button
                      type="button"
                      className="btn-sidebar-role-toggle"
                      onClick={onToggleRole}
                      title="Switch to Admin view"
                    >
                      Switch to Admin
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Logout Button */}
          <button
            type="button"
            className={`sidebar-logout-btn ${isCollapsed ? 'compact' : ''}`}
            onClick={onLogout}
            title={isCollapsed ? 'Logout' : undefined}
            aria-label="Logout"
          >
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
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  )
}
