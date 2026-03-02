import { useState, useEffect } from 'react'
import { BrainCircuit, Play, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'

const MODEL_COLORS = { 'Naive Bayes': '#06b6d4', 'Random Forest': '#10b981', 'SVM': '#a855f7' }

export default function Training() {
  const [history, setHistory] = useState([])
  const [training, setTraining] = useState(false)
  const [latest, setLatest] = useState(null)
  const [error, setError] = useState('')

  const fetchHistory = () => {
    fetch('http://localhost:5005/api/model-history')
      .then(r => r.json())
      .then(d => {
        setHistory(d.history || [])
        if (d.history?.length) {
          const byModel = {}
          d.history.forEach(h => { if (!byModel[h.model_name]) byModel[h.model_name] = h })
          setLatest(byModel)
        }
      })
  }

  useEffect(() => { fetchHistory() }, [])

  const handleTrain = async () => {
    setTraining(true); setError('')
    try {
      const res = await fetch('http://localhost:5005/api/train', { method: 'POST' })
      const data = await res.json()
      if (data.error) { setError(data.error) }
      else { fetchHistory() }
    } catch {
      setError('Training failed. Make sure backend is running.')
    } finally {
      setTraining(false)
    }
  }

  const MetricBar = ({ value, color }) => (
    <div style={{display:'flex',alignItems:'center',gap:8}}>
      <div style={{flex:1,height:6,background:'rgba(255,255,255,0.05)',borderRadius:3,overflow:'hidden'}}>
        <div style={{height:'100%',width:`${value*100}%`,background:color,borderRadius:3,transition:'width 1s ease'}}/>
      </div>
      <span style={{fontFamily:'Space Mono,monospace',fontSize:12,color:'#94a3b8',minWidth:44}}>{(value*100).toFixed(1)}%</span>
    </div>
  )

  const models = ['Naive Bayes','Random Forest','SVM']

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Model Training</h1>
          <p className="page-sub">Train and evaluate ML classifiers on the email dataset</p>
        </div>
        <button className="train-btn" onClick={handleTrain} disabled={training}>
          {training ? <><Loader2 size={16} className="spin"/>Training...</> : <><Play size={16}/>Train All Models</>}
        </button>
      </div>

      {error && <div className="train-error"><AlertCircle size={15}/>{error}</div>}

      {/* Model cards */}
      {latest && (
        <div className="model-cards-grid">
          {models.map(name => {
            const m = latest[name]
            if (!m) return null
            const color = MODEL_COLORS[name]
            const cm = m.confusion_matrix || [[0,0],[0,0]]
            return (
              <div key={name} className="model-card" style={{borderTop:`3px solid ${color}`}}>
                <div className="model-card-header">
                  <div className="model-dot" style={{background:color}}/>
                  <h3>{name}</h3>
                  <span className="model-trained">{new Date(m.trained_at).toLocaleDateString()}</span>
                </div>
                <div className="model-acc-big" style={{color}}>
                  {(m.accuracy*100).toFixed(1)}%
                  <span>Accuracy</span>
                </div>
                <div className="model-metrics">
                  {[['Precision',m.precision_score],['Recall',m.recall],['F1 Score',m.f1]].map(([label,val])=>(
                    <div key={label} className="metric-row">
                      <span className="metric-label">{label}</span>
                      <MetricBar value={val||0} color={color}/>
                    </div>
                  ))}
                </div>
                {/* Confusion matrix */}
                <div className="cm-section">
                  <p className="cm-title">Confusion Matrix</p>
                  <div className="cm-grid">
                    <div className="cm-header-row">
                      <span/>
                      <span className="cm-axis">Pred: Ham</span>
                      <span className="cm-axis">Pred: Spam</span>
                    </div>
                    <div className="cm-row">
                      <span className="cm-axis">Act: Ham</span>
                      <div className="cm-cell cm-tn">{cm[0]?.[0]||0}<span>TN</span></div>
                      <div className="cm-cell cm-fp">{cm[0]?.[1]||0}<span>FP</span></div>
                    </div>
                    <div className="cm-row">
                      <span className="cm-axis">Act: Spam</span>
                      <div className="cm-cell cm-fn">{cm[1]?.[0]||0}<span>FN</span></div>
                      <div className="cm-cell cm-tp">{cm[1]?.[1]||0}<span>TP</span></div>
                    </div>
                  </div>
                </div>
                <div className="model-samples">
                  <span>Trained on {m.training_samples?.toLocaleString()} samples</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Training history */}
      <div className="chart-card" style={{marginTop:24}}>
        <div className="chart-header">
          <h3><RefreshCw size={15}/>Training History</h3>
          <span className="chart-count">{history.length} runs</span>
        </div>
        {history.length === 0 ? (
          <div style={{padding:'40px',textAlign:'center',color:'#374151',fontSize:14}}>
            No training history yet. Click "Train All Models" to get started.
          </div>
        ) : (
          <div className="history-table">
            <div className="hist-head">
              <span>Model</span><span>Accuracy</span><span>Precision</span><span>Recall</span><span>F1</span><span>Samples</span><span>Date</span>
            </div>
            {history.slice(0,20).map((h,i) => (
              <div key={i} className="hist-row">
                <span>
                  <span className="model-badge" style={{background:`${MODEL_COLORS[h.model_name]}20`,color:MODEL_COLORS[h.model_name],border:`1px solid ${MODEL_COLORS[h.model_name]}40`}}>
                    {h.model_name}
                  </span>
                </span>
                {[h.accuracy,h.precision_score,h.recall,h.f1].map((v,j)=>(
                  <span key={j} className="metric-pct" style={{color: v>0.9?'#34d399':v>0.8?'#fbbf24':'#f87171'}}>
                    {((v||0)*100).toFixed(1)}%
                  </span>
                ))}
                <span style={{fontSize:12,color:'#475569'}}>{h.training_samples?.toLocaleString()}</span>
                <span style={{fontSize:12,color:'#374151'}}>{new Date(h.trained_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .train-btn { display:flex; align-items:center; gap:8px; background:linear-gradient(135deg,#7c3aed,#a855f7); border:none; border-radius:10px; padding:11px 20px; color:white; font-weight:700; font-size:14px; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.2s; }
        .train-btn:hover:not(:disabled) { box-shadow:0 8px 24px rgba(168,85,247,0.3); transform:translateY(-1px); }
        .train-btn:disabled { opacity:0.6; cursor:not-allowed; transform:none; }
        .train-error { display:flex; align-items:center; gap:8px; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); border-radius:10px; padding:12px 16px; color:#f87171; font-size:13px; margin-bottom:20px; }
        .model-cards-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; margin-bottom:4px; }
        .model-card { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:14px; padding:22px; display:flex; flex-direction:column; gap:16px; }
        .model-card-header { display:flex; align-items:center; gap:10px; }
        .model-dot { width:8px; height:8px; border-radius:50%; }
        .model-card-header h3 { flex:1; font-size:15px; font-weight:700; color:#e2f8ff; }
        .model-trained { font-size:11px; color:#374151; }
        .model-acc-big { font-family:'Space Mono',monospace; font-size:36px; font-weight:700; display:flex; flex-direction:column; line-height:1; }
        .model-acc-big span { font-size:12px; color:#64748b; font-family:'DM Sans',sans-serif; margin-top:4px; font-weight:400; }
        .model-metrics { display:flex; flex-direction:column; gap:10px; }
        .metric-row { display:flex; flex-direction:column; gap:5px; }
        .metric-label { font-size:11px; color:#475569; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; }
        .cm-section { }
        .cm-title { font-size:11px; color:#475569; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px; }
        .cm-grid { display:flex; flex-direction:column; gap:2px; }
        .cm-header-row { display:grid; grid-template-columns:64px 1fr 1fr; gap:2px; margin-bottom:2px; }
        .cm-axis { font-size:10px; color:#374151; text-align:center; font-family:'Space Mono',monospace; }
        .cm-row { display:grid; grid-template-columns:64px 1fr 1fr; gap:2px; align-items:center; }
        .cm-cell { display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:8px; padding:10px 6px; font-family:'Space Mono',monospace; font-size:18px; font-weight:700; }
        .cm-cell span { font-size:9px; font-family:'DM Sans',sans-serif; font-weight:600; margin-top:2px; opacity:0.6; }
        .cm-tn { background:rgba(16,185,129,0.12); color:#34d399; }
        .cm-fp { background:rgba(244,63,94,0.1); color:#f87171; }
        .cm-fn { background:rgba(244,63,94,0.08); color:#fb923c; }
        .cm-tp { background:rgba(16,185,129,0.15); color:#34d399; }
        .model-samples { font-size:11px; color:#374151; text-align:center; padding-top:4px; border-top:1px solid rgba(255,255,255,0.04); }
        .history-table { overflow:auto; }
        .hist-head { display:grid; grid-template-columns:160px 90px 90px 90px 90px 90px 1fr; gap:12px; padding:10px 20px; font-size:11px; color:#475569; font-weight:600; text-transform:uppercase; letter-spacing:0.6px; border-bottom:1px solid rgba(255,255,255,0.06); }
        .hist-row { display:grid; grid-template-columns:160px 90px 90px 90px 90px 90px 1fr; gap:12px; padding:12px 20px; border-bottom:1px solid rgba(255,255,255,0.04); align-items:center; font-size:13px; color:#94a3b8; }
        .hist-row:last-child { border-bottom:none; }
        .model-badge { padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; white-space:nowrap; }
        .metric-pct { font-family:'Space Mono',monospace; font-size:12px; font-weight:700; }
        @media(max-width:1100px){.model-cards-grid{grid-template-columns:1fr 1fr}}
        @media(max-width:700px){.model-cards-grid{grid-template-columns:1fr}}
      `}</style>
    </div>
  )
}
