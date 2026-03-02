import { useState, useEffect } from 'react'
import { Mail, ShieldAlert, ShieldCheck, TrendingUp, Activity, Clock, AlertTriangle, CheckCircle } from 'lucide-react'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('http://localhost:5005/api/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="page-loading"><div className="spinner" /><span>Loading dashboard...</span></div>
  if (!data) return <div className="page-error">Failed to load dashboard data</div>

  const stats = [
    { label: 'Total Emails', value: data.total_emails.toLocaleString(), icon: Mail, color: 'cyan', sub: 'All time' },
    { label: 'Spam Detected', value: data.spam_count.toLocaleString(), icon: ShieldAlert, color: 'red', sub: `${data.spam_rate}% of total` },
    { label: 'Legitimate', value: data.ham_count.toLocaleString(), icon: ShieldCheck, color: 'green', sub: `${(100-data.spam_rate).toFixed(1)}% of total` },
    { label: 'Accuracy', value: `${data.accuracy}%`, icon: TrendingUp, color: 'blue', sub: 'Model performance' },
  ]

  const maxTrend = Math.max(...(data.spam_trend?.map(t=>t.spam+t.ham)||[1]))

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Real-time email threat intelligence overview</p>
        </div>
        <div className="live-indicator"><Activity size={14}/><span>Live</span></div>
      </div>

      {/* Stat cards */}
      <div className="stats-grid">
        {stats.map((s,i) => (
          <div key={i} className={`stat-card stat-${s.color}`} style={{animationDelay:`${i*0.08}s`}}>
            <div className="stat-top">
              <div className={`stat-icon icon-${s.color}`}><s.icon size={20}/></div>
              <span className="stat-label">{s.label}</span>
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="charts-row">
        {/* Trend chart */}
        <div className="chart-card flex-2">
          <div className="chart-header">
            <h3>Email Volume Trend</h3>
            <div className="chart-legend">
              <span className="leg-spam">● Spam</span>
              <span className="leg-ham">● Legitimate</span>
            </div>
          </div>
          <div className="trend-chart">
            {data.spam_trend?.slice(-8).map((t,i) => (
              <div key={i} className="trend-col">
                <div className="bars">
                  <div className="bar-spam" style={{height:`${(t.spam/maxTrend*100)}%`}} title={`Spam: ${t.spam}`}/>
                  <div className="bar-ham" style={{height:`${(t.ham/maxTrend*100)}%`}} title={`Ham: ${t.ham}`}/>
                </div>
                <span className="trend-label">{t.month?.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Spam rate donut */}
        <div className="chart-card flex-1">
          <div className="chart-header"><h3>Detection Rate</h3></div>
          <div className="donut-wrap">
            <svg viewBox="0 0 120 120" className="donut-svg">
              <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="14"/>
              <circle cx="60" cy="60" r="48" fill="none" stroke="#f43f5e" strokeWidth="14"
                strokeDasharray={`${data.spam_rate/100*301.6} 301.6`} strokeLinecap="round"
                transform="rotate(-90 60 60)" opacity="0.85"/>
              <circle cx="60" cy="60" r="48" fill="none" stroke="#10b981" strokeWidth="14"
                strokeDasharray={`${(100-data.spam_rate)/100*301.6} 301.6`} strokeLinecap="round"
                transform={`rotate(${-90+data.spam_rate/100*360} 60 60)`} opacity="0.85"/>
            </svg>
            <div className="donut-center">
              <span className="donut-pct">{data.spam_rate}%</span>
              <span className="donut-lbl">Spam</span>
            </div>
          </div>
          <div className="donut-legend">
            <div className="dl-item"><span className="dl-dot dl-red"/>Spam ({data.spam_count})</div>
            <div className="dl-item"><span className="dl-dot dl-green"/>Ham ({data.ham_count})</div>
          </div>
        </div>
      </div>

      {/* Recent detections */}
      <div className="chart-card">
        <div className="chart-header">
          <h3>Recent Detections</h3>
          <span className="chart-count">{data.recent_detections?.length} entries</span>
        </div>
        <div className="email-table">
          <div className="table-head">
            <span>Subject</span><span>Sender</span><span>Status</span><span>Confidence</span><span>Time</span>
          </div>
          {data.recent_detections?.map(e => (
            <div key={e.id} className="table-row">
              <span className="cell-subject">{e.subject?.slice(0,42)}{e.subject?.length>42?'…':''}</span>
              <span className="cell-sender">{e.sender?.split('@')[0]}<span className="sender-domain">@{e.sender?.split('@')[1]}</span></span>
              <span>
                {e.is_spam
                  ? <span className="badge badge-spam"><AlertTriangle size={11}/>Spam</span>
                  : <span className="badge badge-ham"><CheckCircle size={11}/>Legit</span>}
              </span>
              <span>
                <div className="conf-bar-wrap">
                  <div className="conf-bar" style={{width:`${Math.round((e.confidence||0)*100)}%`, background: e.is_spam?'#f43f5e':'#10b981'}}/>
                  <span className="conf-pct">{Math.round((e.confidence||0)*100)}%</span>
                </div>
              </span>
              <span className="cell-time">
                <Clock size={11}/>
                {new Date(e.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
