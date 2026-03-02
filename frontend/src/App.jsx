import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Shield, LayoutDashboard, Search, Mail, BarChart3, BrainCircuit, ChevronRight, LogOut, User, BadgeCheck } from 'lucide-react'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Detect from './pages/Detect'
import Emails from './pages/Emails'
import Analytics from './pages/Analytics'
import Training from './pages/Training'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/detect', icon: Search, label: 'Detect Spam' },
  { to: '/emails', icon: Mail, label: 'Emails' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/training', icon: BrainCircuit, label: 'Model Training' },
]

function AppShell({ user, onLogout }) {
  const location = useLocation()
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon">
            <Shield className="logo-shield" size={22} />
            <div className="logo-ring" />
          </div>
          <div>
            <h1 className="logo-name">SpamShield</h1>
            <span className="logo-ai">AI</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <Icon size={17} />
              <span>{label}</span>
              {location.pathname === to && <ChevronRight size={13} className="nav-arrow" />}
            </NavLink>
          ))}
        </nav>

        {/* Status */}
        <div className="sidebar-status">
          <div className="status-dot-row">
            <div className="status-dot" />
            <span className="status-text">System Active</span>
          </div>
          <p className="status-sub">NB · RF · SVM loaded</p>
        </div>

        {/* User */}
        <div className="sidebar-user">
          <div className="user-avatar">{user.avatar}</div>
          <div className="user-info">
            <div className="user-name">{user.name}</div>
            <div className="user-role">{user.role}</div>
          </div>
          <button className="logout-btn" onClick={onLogout} title="Logout">
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        {/* Top bar */}
        <div className="topbar">
          <div className="topbar-left">
            <div className="breadcrumb">
              {navItems.find(n => n.to === location.pathname)?.label || 'Dashboard'}
            </div>
          </div>
          <div className="topbar-right">
            <div className="clearance-chip">
              <BadgeCheck size={12} />
              <span>{user.clearance}</span>
            </div>
            <div className="topbar-user">
              <div className="topbar-avatar">{user.avatar}</div>
              <div>
                <div className="topbar-name">{user.name}</div>
                <div className="topbar-dept">{user.department}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="content-scroll">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/detect" element={<Detect />} />
            <Route path="/emails" element={<Emails />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/training" element={<Training />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('ss_user')
    const token = localStorage.getItem('ss_token')
    if (stored && token) {
      setUser(JSON.parse(stored))
    }
    setChecking(false)
  }, [])

  const handleLogin = (userData) => setUser(userData)

  const handleLogout = () => {
    localStorage.removeItem('ss_token')
    localStorage.removeItem('ss_user')
    setUser(null)
  }

  if (checking) return <div style={{background:'#040810',height:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}><div className="spinner"/></div>
  if (!user) return <Login onLogin={handleLogin} />
  return <AppShell user={user} onLogout={handleLogout} />
}
