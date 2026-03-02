import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Clock, Tag } from 'lucide-react'

export default function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('http://localhost:5005/api/analytics')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="page-loading"><div className="spinner"/><span>Loading analytics...</span></div>
  if (!data) return <div className="page-error">Failed to load analytics</div>

  const maxWord = Math.max(...(data.common_spam_words?.map(w=>w.count)||[1]))
  const maxHour = Math.max(...(data.spam_by_hour?.map(h=>h.spam+h.ham)||[1]))
  const maxSender = Math.max(...(data.top_spam_senders?.map(s=>s.count)||[1]))
  const maxTrend = Math.max(...(data.spam_trend?.map(t=>t.spam+t.ham)||[1]))

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-sub">Deep insights into spam patterns and threat intelligence</p>
        </div>
      </div>

      {/* Trend chart */}
      <div className="chart-card" style={{marginBottom:20}}>
        <div className="chart-header">
          <h3><TrendingUp size={16} style={{display:'inline',marginRight:8}}/>Monthly Spam Trend</h3>
        </div>
        <div className="trend-chart big-trend">
          {data.spam_trend?.map((t,i) => (
            <div key={i} className="trend-col wide">
              <div className="bars">
                <div className="bar-spam" style={{height:`${(t.spam/maxTrend*100)}%`}} title={`Spam: ${t.spam}`}/>
                <div className="bar-ham" style={{height:`${(t.ham/maxTrend*100)}%`}} title={`Ham: ${t.ham}`}/>
              </div>
              <span className="trend-label">{t.month?.slice(2)}</span>
            </div>
          ))}
        </div>
        <div className="chart-legend" style={{marginTop:12,justifyContent:'center'}}>
          <span className="leg-spam">■ Spam</span>
          <span className="leg-ham">■ Legitimate</span>
        </div>
      </div>

      <div className="analytics-grid">
        {/* Top spam keywords */}
        <div className="chart-card">
          <div className="chart-header"><h3><Tag size={15}/>Top Spam Keywords</h3></div>
          <div className="keyword-list">
            {data.common_spam_words?.map((w,i) => (
              <div key={i} className="keyword-item">
                <span className="kw-rank">#{i+1}</span>
                <span className="kw-word">{w.word}</span>
                <div className="kw-bar-wrap">
                  <div className="kw-bar" style={{width:`${(w.count/maxWord)*100}%`}}/>
                </div>
                <span className="kw-count">{w.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Spam by hour */}
        <div className="chart-card">
          <div className="chart-header"><h3><Clock size={15}/>Spam by Hour of Day</h3></div>
          <div className="hour-chart">
            {data.spam_by_hour?.map((h,i) => (
              <div key={i} className="hour-col" title={`Hour ${h.hour}: ${h.spam} spam, ${h.ham} ham`}>
                <div className="hour-bar-wrap">
                  <div className="hour-bar-spam" style={{height:`${(h.spam/maxHour)*100}%`}}/>
                </div>
                {i%4===0 && <span className="hour-label">{h.hour}h</span>}
              </div>
            ))}
          </div>
          <div className="chart-legend" style={{marginTop:8,justifyContent:'center'}}>
            <span className="leg-spam">■ Spam volume by hour</span>
          </div>
        </div>

        {/* Top spam senders */}
        <div className="chart-card">
          <div className="chart-header"><h3><BarChart3 size={15}/>Top Spam Senders</h3></div>
          <div className="sender-list">
            {data.top_spam_senders?.map((s,i) => (
              <div key={i} className="sender-item">
                <span className="sender-rank">#{i+1}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div className="sender-email" title={s.sender}>{s.sender}</div>
                  <div className="sender-bar-wrap">
                    <div className="sender-bar" style={{width:`${(s.count/maxSender)*100}%`}}/>
                  </div>
                </div>
                <span className="sender-count">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .analytics-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:20px; }
        .big-trend { height:180px; }
        .trend-col.wide { min-width:32px; }
        .keyword-list { display:flex; flex-direction:column; gap:8px; }
        .keyword-item { display:flex; align-items:center; gap:10px; }
        .kw-rank { font-family:'Space Mono',monospace; font-size:10px; color:#374151; min-width:24px; }
        .kw-word { font-size:12px; color:#94a3b8; min-width:80px; font-weight:500; }
        .kw-bar-wrap { flex:1; height:6px; background:rgba(255,255,255,0.04); border-radius:3px; overflow:hidden; }
        .kw-bar { height:100%; background:linear-gradient(90deg,#f43f5e,#fb7185); border-radius:3px; transition:width 0.8s ease; }
        .kw-count { font-size:11px; color:#475569; min-width:28px; text-align:right; }
        .hour-chart { display:flex; align-items:flex-end; gap:2px; height:120px; padding-top:8px; }
        .hour-col { flex:1; display:flex; flex-direction:column; align-items:center; gap:3px; height:100%; }
        .hour-bar-wrap { flex:1; width:100%; display:flex; align-items:flex-end; }
        .hour-bar-spam { width:100%; background:rgba(244,63,94,0.7); border-radius:2px 2px 0 0; min-height:2px; transition:height 0.6s ease; }
        .hour-label { font-size:9px; color:#374151; }
        .sender-list { display:flex; flex-direction:column; gap:10px; }
        .sender-item { display:flex; align-items:center; gap:10px; }
        .sender-rank { font-family:'Space Mono',monospace; font-size:10px; color:#374151; min-width:22px; }
        .sender-email { font-size:11px; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:4px; }
        .sender-bar-wrap { height:5px; background:rgba(255,255,255,0.04); border-radius:3px; overflow:hidden; }
        .sender-bar { height:100%; background:linear-gradient(90deg,#f59e0b,#fbbf24); border-radius:3px; transition:width 0.8s ease; }
        .sender-count { font-size:11px; color:#475569; min-width:24px; text-align:right; }
        @media(max-width:1100px){.analytics-grid{grid-template-columns:1fr 1fr}}
        @media(max-width:700px){.analytics-grid{grid-template-columns:1fr}}
      `}</style>
    </div>
  )
}
