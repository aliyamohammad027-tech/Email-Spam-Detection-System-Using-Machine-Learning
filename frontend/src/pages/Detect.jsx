import { useState } from 'react'
import { Search, AlertTriangle, CheckCircle, Loader2, ShieldAlert, Info, Zap } from 'lucide-react'

const SEVERITY_COLOR = { high: '#f43f5e', medium: '#f59e0b', low: '#06b6d4' }
const RISK_CONFIG = {
  Critical: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.4)', color: '#f87171', icon: '🔴' },
  High:     { bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.4)', color: '#fb923c', icon: '🟠' },
  Medium:   { bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.35)', color: '#fbbf24', icon: '🟡' },
  Low:      { bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.25)', color: '#22d3ee', icon: '🔵' },
  Safe:     { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', color: '#34d399', icon: '🟢' },
}

export default function Detect() {
  const [form, setForm] = useState({ subject: '', sender: '', body: '' })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch('http://localhost:5005/api/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setResult(data)
    } catch {
      setError('Could not connect to detection server.')
    } finally {
      setLoading(false)
    }
  }

  const loadSample = (type) => {
    if (type === 'spam') {
      setForm({
        subject: "URGENT: You've WON $1,000,000!!! Claim NOW",
        sender: "winner@sweepstakes-global.com",
        body: "CONGRATULATIONS!!! You are the WINNER of our monthly sweepstakes! To claim your $1,000,000 prize, click here immediately: http://claim-prize-now.com. Act NOW before this offer expires in 24 hours! Limited time only – don't miss out!"
      })
    } else {
      setForm({
        subject: "Meeting tomorrow at 10 AM – Sprint Planning",
        sender: "sarah.johnson@company.com",
        body: "Hi team, just a reminder that we have our weekly sprint planning meeting tomorrow at 10 AM in Conference Room B. Please come prepared with your progress updates and any blockers you're facing. The agenda has been shared in Confluence. Thanks!"
      })
    }
    setResult(null)
  }

  const risk = result ? RISK_CONFIG[result.risk_level] || RISK_CONFIG.Safe : null

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Detect Spam</h1>
          <p className="page-sub">Analyze an email using ML classifiers (Naive Bayes, Random Forest, SVM)</p>
        </div>
        <div className="sample-btns">
          <button className="sample-btn spam" onClick={() => loadSample('spam')}><AlertTriangle size={13}/>Load Spam Sample</button>
          <button className="sample-btn ham" onClick={() => loadSample('ham')}><CheckCircle size={13}/>Load Ham Sample</button>
        </div>
      </div>

      <div className="detect-layout">
        {/* Form */}
        <div className="detect-form-card">
          <form onSubmit={handleSubmit}>
            <div className="dfield">
              <label>Email Subject</label>
              <input value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} placeholder="Enter email subject..." />
            </div>
            <div className="dfield">
              <label>Sender Email</label>
              <input value={form.sender} onChange={e=>setForm({...form,sender:e.target.value})} placeholder="sender@example.com" type="email" />
            </div>
            <div className="dfield">
              <label>Email Body <span className="req">*</span></label>
              <textarea
                value={form.body}
                onChange={e=>setForm({...form,body:e.target.value})}
                placeholder="Paste the full email body here..."
                rows={10}
                required
              />
            </div>
            {error && <div className="detect-error"><AlertTriangle size={14}/>{error}</div>}
            <button type="submit" className="detect-btn" disabled={loading}>
              {loading ? <><Loader2 size={16} className="spin"/>Analyzing...</> : <><Zap size={16}/>Analyze Email</>}
            </button>
          </form>
        </div>

        {/* Result */}
        <div className="detect-result-area">
          {!result && !loading && (
            <div className="no-result">
              <Search size={48} opacity={0.15}/>
              <p>Submit an email to see the detection result</p>
            </div>
          )}
          {loading && (
            <div className="no-result">
              <Loader2 size={48} opacity={0.3} className="spin-slow"/>
              <p>Running ML models...</p>
            </div>
          )}
          {result && (
            <div className="result-content">
              {/* Main verdict */}
              <div className="verdict-card" style={{background:risk.bg,border:`1px solid ${risk.border}`}}>
                <div className="verdict-top">
                  <span className="verdict-emoji">{risk.icon}</span>
                  <div>
                    <div className="verdict-label" style={{color:risk.color}}>Risk Level: {result.risk_level}</div>
                    <div className="verdict-main">{result.is_spam ? '⚠ SPAM DETECTED' : '✓ LEGITIMATE EMAIL'}</div>
                  </div>
                </div>
                <div className="verdict-conf">
                  <span>Confidence</span>
                  <div className="conf-track">
                    <div className="conf-fill" style={{width:`${result.confidence}%`,background:result.is_spam?'#f43f5e':'#10b981'}}/>
                  </div>
                  <strong style={{color:result.is_spam?'#f87171':'#34d399'}}>{result.confidence}%</strong>
                </div>
              </div>

              {/* Indicators */}
              {result.indicators?.length > 0 && (
                <div className="indicators-section">
                  <h4 className="ind-title"><AlertTriangle size={14}/>Spam Indicators ({result.indicators.length})</h4>
                  {result.indicators.map((ind,i) => (
                    <div key={i} className="indicator-item">
                      <div className="ind-header">
                        <span className="ind-type">{ind.type}</span>
                        <span className="ind-sev" style={{
                          background:`${SEVERITY_COLOR[ind.severity]}20`,
                          color:SEVERITY_COLOR[ind.severity],
                          border:`1px solid ${SEVERITY_COLOR[ind.severity]}40`
                        }}>{ind.severity}</span>
                      </div>
                      <p className="ind-detail">{ind.detail}</p>
                      <div className="ind-bar">
                        <div style={{width:ind.severity==='high'?'85%':ind.severity==='medium'?'55%':'30%',background:SEVERITY_COLOR[ind.severity],height:'3px',borderRadius:'2px',transition:'width 0.8s ease'}}/>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {result.indicators?.length === 0 && (
                <div className="no-indicators">
                  <Info size={16}/>
                  <span>No specific spam indicators detected. Classification was based on ML model patterns.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .detect-layout { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-top:4px; }
        .detect-form-card { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:16px; padding:28px; }
        .dfield { display:flex; flex-direction:column; gap:7px; margin-bottom:16px; }
        .dfield label { font-size:12px; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.6px; }
        .req { color:#f43f5e; }
        .dfield input, .dfield textarea {
          background:rgba(255,255,255,0.03);
          border:1px solid rgba(255,255,255,0.07);
          border-radius:10px;
          padding:11px 14px;
          color:#e2f8ff;
          font-size:14px;
          font-family:'DM Sans',sans-serif;
          outline:none;
          transition:all 0.2s;
          resize:vertical;
        }
        .dfield input:focus, .dfield textarea:focus {
          border-color:rgba(6,182,212,0.4);
          background:rgba(6,182,212,0.04);
        }
        .dfield input::placeholder, .dfield textarea::placeholder { color:#374151; }
        .detect-error { display:flex; align-items:center; gap:8px; color:#f87171; font-size:13px; margin-bottom:12px; }
        .detect-btn {
          width:100%; background:linear-gradient(135deg,#0891b2,#06b6d4);
          border:none; border-radius:10px; padding:13px; color:white;
          font-weight:700; font-size:15px; cursor:pointer; display:flex; align-items:center;
          justify-content:center; gap:8px; font-family:'DM Sans',sans-serif; transition:all 0.2s;
        }
        .detect-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 8px 24px rgba(6,182,212,0.25); }
        .detect-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .detect-result-area { display:flex; flex-direction:column; }
        .no-result { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; color:#475569; background:rgba(255,255,255,0.01); border:1px dashed rgba(255,255,255,0.06); border-radius:16px; padding:48px; min-height:300px; }
        .no-result p { font-size:14px; }
        .spin-slow { animation:spinAnim 2s linear infinite; }
        .result-content { display:flex; flex-direction:column; gap:16px; }
        .verdict-card { border-radius:14px; padding:20px; }
        .verdict-top { display:flex; align-items:center; gap:16px; margin-bottom:16px; }
        .verdict-emoji { font-size:32px; }
        .verdict-label { font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px; }
        .verdict-main { font-size:20px; font-weight:800; color:#e2f8ff; font-family:'Space Mono',monospace; }
        .verdict-conf { display:flex; align-items:center; gap:12px; }
        .verdict-conf span { font-size:12px; color:#64748b; white-space:nowrap; }
        .conf-track { flex:1; height:6px; background:rgba(255,255,255,0.06); border-radius:3px; overflow:hidden; }
        .conf-fill { height:100%; border-radius:3px; transition:width 1s ease; }
        .indicators-section { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:14px; padding:20px; }
        .ind-title { display:flex; align-items:center; gap:8px; font-size:13px; color:#94a3b8; margin-bottom:14px; font-weight:600; }
        .indicator-item { padding:12px; background:rgba(255,255,255,0.02); border-radius:10px; margin-bottom:10px; border:1px solid rgba(255,255,255,0.04); }
        .ind-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
        .ind-type { font-size:13px; font-weight:600; color:#e2f8ff; }
        .ind-sev { font-size:10px; font-weight:700; padding:3px 10px; border-radius:20px; text-transform:uppercase; letter-spacing:0.5px; }
        .ind-detail { font-size:12px; color:#64748b; margin-bottom:8px; }
        .ind-bar { height:3px; background:rgba(255,255,255,0.04); border-radius:2px; overflow:hidden; }
        .no-indicators { display:flex; align-items:center; gap:10px; background:rgba(6,182,212,0.06); border:1px solid rgba(6,182,212,0.15); border-radius:12px; padding:16px; color:#64748b; font-size:13px; }
        .sample-btns { display:flex; gap:8px; }
        .sample-btn { display:flex; align-items:center; gap:6px; padding:8px 14px; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.2s; }
        .sample-btn.spam { background:rgba(244,63,94,0.1); border:1px solid rgba(244,63,94,0.25); color:#f87171; }
        .sample-btn.ham { background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.25); color:#34d399; }
        .sample-btn:hover { filter:brightness(1.2); }
        @media(max-width:900px){.detect-layout{grid-template-columns:1fr}}
      `}</style>
    </div>
  )
}
