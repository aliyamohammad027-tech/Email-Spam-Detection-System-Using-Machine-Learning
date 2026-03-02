import { useState } from 'react'
import { Shield, Eye, EyeOff, Lock, Mail, Hash, AlertCircle, Loader2 } from 'lucide-react'

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '', employee_id: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('http://localhost:5005/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Authentication failed'); return }
      localStorage.setItem('ss_token', data.token)
      localStorage.setItem('ss_user', JSON.stringify(data.user))
      onLogin(data.user)
    } catch {
      setError('Cannot connect to server. Make sure backend is running on port 5005.')
    } finally {
      setLoading(false)
    }
  }

  const demoUsers = [
{ role: 'Senior Card Manager' },
{ role: 'Card Security Analyst' },
{role: 'ML Operations Manager' },
  ]

  const fillDemo = (u) => setForm({ email: u.email, password: u.password, employee_id: u.id })

  return (
    <div className="login-root">
      {/* Animated background */}
      <div className="login-bg">
        <div className="grid-overlay" />
        {[...Array(20)].map((_,i) => (
          <div key={i} className="particle" style={{
            left: `${Math.random()*100}%`,
            top: `${Math.random()*100}%`,
            animationDelay: `${Math.random()*8}s`,
            animationDuration: `${4+Math.random()*6}s`
          }} />
        ))}
      </div>

      <div className="login-container">
        {/* Left panel */}
        <div className="login-left">
          <div className="brand-mark">
            <div className="shield-icon-large">
              <Shield size={48} />
              <div className="shield-pulse" />
            </div>
            <h1 className="brand-name">SpamShield</h1>
            <span className="brand-sub">AI</span>
          </div>
          <div className="login-tagline">
            <h2>Authorized<br/>Personnel Only</h2>
            <p>This system is restricted to pre-authorized card managers and security analysts. All access attempts are logged and monitored.</p>
          </div>
          <div className="clearance-badge">
            <div className="clearance-dot" />
            <span>CLASSIFIED SYSTEM — LEVEL 4/5 CLEARANCE REQUIRED</span>
          </div>
          <div className="demo-section">
            <p className="demo-label">Access roles</p>
            {demoUsers.map(u => (
              <button key={u.id} className="demo-user-btn" onClick={() => fillDemo(u)}>
                <span className="demo-id">{u.id}</span>
                <span className="demo-role">{u.role}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right panel - form */}
        <div className="login-right">
          <div className="login-card">
            <div className="login-card-header">
              <div className="lock-icon"><Lock size={20} /></div>
              <h3>Secure Access Portal</h3>
              <p>Enter your authorized credentials to proceed</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              <div className={`field-group ${focused==='id' ? 'focused' : ''}`}>
                <label><Hash size={13} /> Employee ID <span className="optional">(optional)</span></label>
                <input
                  type="text"
                  placeholder="SSA-001"
                  value={form.employee_id}
                  onChange={e => setForm({...form, employee_id: e.target.value})}
                  onFocus={() => setFocused('id')}
                  onBlur={() => setFocused('')}
                />
              </div>

              <div className={`field-group ${focused==='email' ? 'focused' : ''}`}>
                <label><Mail size={13} /> Authorized Email</label>
                <input
                  type="email"
                  placeholder="you@spamshield.ai"
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused('')}
                  required
                />
              </div>

              <div className={`field-group ${focused==='pass' ? 'focused' : ''}`}>
                <label><Lock size={13} /> Password</label>
                <div className="pass-wrap">
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••••"
                    value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                    onFocus={() => setFocused('pass')}
                    onBlur={() => setFocused('')}
                    required
                  />
                  <button type="button" className="eye-btn" onClick={() => setShowPass(!showPass)}>
                    {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>

              {error && (
                <div className="error-msg">
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? <><Loader2 size={18} className="spin" /> Authenticating...</> : 'Access System'}
              </button>
            </form>

            <div className="login-footer-note">
              <span>🔒 256-bit encrypted · Session expires in 8 hours</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .login-root {
          min-height: 100vh;
          background: #040810;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Sans', sans-serif;
          overflow: hidden;
          position: relative;
        }
        .login-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
        }
        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(6,182,212,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6,182,212,0.04) 1px, transparent 1px);
          background-size: 50px 50px;
          animation: gridShift 20s linear infinite;
        }
        @keyframes gridShift { 0%{background-position:0 0} 100%{background-position:50px 50px} }
        .particle {
          position: absolute;
          width: 2px;
          height: 2px;
          background: #06b6d4;
          border-radius: 50%;
          animation: float linear infinite;
          opacity: 0;
        }
        @keyframes float {
          0%{transform:translateY(0);opacity:0}
          10%{opacity:0.6}
          90%{opacity:0.6}
          100%{transform:translateY(-100px);opacity:0}
        }
        .login-container {
          position: relative;
          z-index: 1;
          display: flex;
          width: 100%;
          max-width: 1000px;
          min-height: 600px;
          margin: 24px;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid rgba(6,182,212,0.2);
          box-shadow: 0 0 80px rgba(6,182,212,0.08), 0 0 0 1px rgba(255,255,255,0.03);
        }
        .login-left {
          flex: 1;
          background: linear-gradient(135deg, #070e1a 0%, #0c1829 50%, #071018 100%);
          padding: 48px 40px;
          display: flex;
          flex-direction: column;
          gap: 32px;
          border-right: 1px solid rgba(6,182,212,0.15);
        }
        .brand-mark {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .shield-icon-large {
          position: relative;
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #0891b2, #06b6d4);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        .shield-pulse {
          position: absolute;
          inset: -4px;
          border-radius: 20px;
          border: 2px solid rgba(6,182,212,0.4);
          animation: pulseBorder 2s ease-in-out infinite;
        }
        @keyframes pulseBorder {
          0%,100%{opacity:0.4;transform:scale(1)}
          50%{opacity:1;transform:scale(1.05)}
        }
        .brand-name {
          font-family: 'Space Mono', monospace;
          font-size: 26px;
          font-weight: 700;
          color: #e2f8ff;
          letter-spacing: -0.5px;
          line-height: 1;
        }
        .brand-sub {
          background: linear-gradient(90deg, #06b6d4, #0ea5e9);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-family: 'Space Mono', monospace;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 3px;
        }
        .login-tagline h2 {
          font-size: 28px;
          font-weight: 700;
          color: #e2f8ff;
          line-height: 1.2;
          margin-bottom: 12px;
        }
        .login-tagline p {
          font-size: 14px;
          color: #64748b;
          line-height: 1.6;
        }
        .clearance-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 8px;
          padding: 10px 14px;
          font-family: 'Space Mono', monospace;
          font-size: 9px;
          color: #f87171;
          letter-spacing: 1px;
        }
        .clearance-dot {
          width: 6px;
          height: 6px;
          background: #f87171;
          border-radius: 50%;
          animation: blink 1.5s ease-in-out infinite;
          flex-shrink: 0;
        }
        @keyframes blink {0%,100%{opacity:1}50%{opacity:0.3}}
        .demo-section {
          margin-top: auto;
        }
        .demo-label {
          font-size: 11px;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 10px;
          font-family: 'Space Mono', monospace;
        }
        .demo-user-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          background: rgba(6,182,212,0.04);
          border: 1px solid rgba(6,182,212,0.1);
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 6px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }
        .demo-user-btn:hover {
          background: rgba(6,182,212,0.1);
          border-color: rgba(6,182,212,0.3);
        }
        .demo-id {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          color: #06b6d4;
          min-width: 64px;
        }
        .demo-role {
          font-size: 12px;
          color: #94a3b8;
        }
        /* Right panel */
        .login-right {
          width: 380px;
          background: #060c18;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 40px;
        }
        .login-card {
          width: 100%;
        }
        .login-card-header {
          margin-bottom: 32px;
        }
        .lock-icon {
          width: 40px;
          height: 40px;
          background: rgba(6,182,212,0.1);
          border: 1px solid rgba(6,182,212,0.2);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #06b6d4;
          margin-bottom: 16px;
        }
        .login-card-header h3 {
          font-size: 20px;
          font-weight: 700;
          color: #e2f8ff;
          margin-bottom: 6px;
        }
        .login-card-header p {
          font-size: 13px;
          color: #64748b;
        }
        .login-form { display: flex; flex-direction: column; gap: 16px; }
        .field-group { display: flex; flex-direction: column; gap: 6px; }
        .field-group label {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 5px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .field-group.focused label { color: #06b6d4; }
        .optional { color: #374151; font-weight: 400; text-transform: none; letter-spacing: 0; }
        .field-group input {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px;
          padding: 12px 14px;
          color: #e2f8ff;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: all 0.2s;
          width: 100%;
        }
        .field-group input::placeholder { color: #374151; }
        .field-group input:focus {
          border-color: rgba(6,182,212,0.4);
          background: rgba(6,182,212,0.04);
          box-shadow: 0 0 0 3px rgba(6,182,212,0.06);
        }
        .pass-wrap { position: relative; }
        .pass-wrap input { padding-right: 44px; }
        .eye-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #475569;
          cursor: pointer;
          padding: 2px;
          display: flex;
        }
        .eye-btn:hover { color: #06b6d4; }
        .error-msg {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 8px;
          padding: 10px 12px;
          color: #f87171;
          font-size: 13px;
        }
        .error-msg svg { flex-shrink: 0; margin-top: 1px; }
        .login-btn {
          margin-top: 8px;
          background: linear-gradient(135deg, #0891b2, #06b6d4);
          border: none;
          border-radius: 10px;
          padding: 14px;
          color: white;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-family: 'DM Sans', sans-serif;
        }
        .login-btn:hover:not(:disabled) {
          box-shadow: 0 8px 24px rgba(6,182,212,0.3);
          transform: translateY(-1px);
        }
        .login-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .spin { animation: spinAnim 1s linear infinite; }
        @keyframes spinAnim { to{transform:rotate(360deg)} }
        .login-footer-note {
          margin-top: 20px;
          text-align: center;
          font-size: 11px;
          color: #374151;
        }
        @media (max-width: 768px) {
          .login-left { display: none; }
          .login-right { width: 100%; }
          .login-container { margin: 12px; }
        }
      `}</style>
    </div>
  )
}
