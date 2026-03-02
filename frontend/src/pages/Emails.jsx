import { useState, useEffect } from 'react'
import { Search, Filter, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, X, Eye } from 'lucide-react'

export default function Emails() {
  const [data, setData] = useState({ emails: [], total: 0, page: 1, total_pages: 1 })
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  const fetchEmails = () => {
    setLoading(true)
    const params = new URLSearchParams({ filter, page, per_page: 15, search })
    fetch(`http://localhost:5005/api/emails?${params}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchEmails() }, [filter, page, search])

  const handleSearch = (e) => { setSearch(e.target.value); setPage(1) }
  const handleFilter = (f) => { setFilter(f); setPage(1) }

  const SEVERITY_COLOR = { high: '#f43f5e', medium: '#f59e0b', low: '#06b6d4' }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Email Archive</h1>
          <p className="page-sub">{data.total.toLocaleString()} emails in database</p>
        </div>
      </div>

      {/* Filters */}
      <div className="emails-toolbar">
        <div className="filter-tabs">
          {['all','spam','ham'].map(f => (
            <button key={f} className={`filter-tab ${filter===f?'active':''}`} onClick={()=>handleFilter(f)}>
              {f==='all'?'All':f==='spam'?'Spam Only':'Legitimate'}
            </button>
          ))}
        </div>
        <div className="search-box">
          <Search size={15} className="search-icon"/>
          <input value={search} onChange={handleSearch} placeholder="Search emails…" />
          {search && <button className="search-clear" onClick={()=>{setSearch('');setPage(1)}}><X size={14}/></button>}
        </div>
      </div>

      {/* Table */}
      <div className="emails-table-card">
        <div className="etable-head">
          <span>#</span><span>Subject</span><span>Sender</span><span>Status</span><span>Confidence</span><span>Date</span><span></span>
        </div>
        {loading ? (
          <div className="table-loading"><div className="spinner"/><span>Loading emails...</span></div>
        ) : data.emails.length === 0 ? (
          <div className="table-empty"><Filter size={32} opacity={0.2}/><p>No emails found</p></div>
        ) : data.emails.map((e, i) => (
          <div key={e.id} className={`etable-row ${e.is_spam?'row-spam':''}`}>
            <span className="cell-id">{e.id}</span>
            <span className="cell-subj" title={e.subject}>{e.subject?.slice(0,40)}{e.subject?.length>40?'…':''}</span>
            <span className="cell-send">{e.sender?.length>28?e.sender.slice(0,28)+'…':e.sender}</span>
            <span>
              {e.is_spam
                ? <span className="badge badge-spam"><AlertTriangle size={10}/>Spam</span>
                : <span className="badge badge-ham"><CheckCircle size={10}/>Legit</span>}
            </span>
            <span>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <div style={{flex:1,height:4,background:'rgba(255,255,255,0.06)',borderRadius:2,overflow:'hidden',width:60}}>
                  <div style={{height:'100%',width:`${Math.round((e.confidence||0)*100)}%`,background:e.is_spam?'#f43f5e':'#10b981',borderRadius:2}}/>
                </div>
                <span style={{fontSize:11,color:'#64748b',minWidth:32}}>{Math.round((e.confidence||0)*100)}%</span>
              </div>
            </span>
            <span className="cell-date">{new Date(e.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'2-digit'})}</span>
            <span>
              <button className="view-btn" onClick={()=>setSelected(e)}><Eye size={13}/></button>
            </span>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="pagination">
        <span className="pag-info">Page {data.page} of {data.total_pages}</span>
        <div className="pag-btns">
          <button className="pag-btn" disabled={page<=1} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={16}/></button>
          {[...Array(Math.min(5,data.total_pages))].map((_,i)=>{
            const p = Math.max(1, Math.min(data.total_pages-4, page-2)) + i
            return <button key={p} className={`pag-btn ${p===page?'active':''}`} onClick={()=>setPage(p)}>{p}</button>
          })}
          <button className="pag-btn" disabled={page>=data.total_pages} onClick={()=>setPage(p=>p+1)}><ChevronRight size={16}/></button>
        </div>
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="modal-overlay" onClick={()=>setSelected(null)}>
          <div className="modal-card" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                  {selected.is_spam
                    ? <span className="badge badge-spam" style={{fontSize:12}}><AlertTriangle size={12}/>SPAM</span>
                    : <span className="badge badge-ham" style={{fontSize:12}}><CheckCircle size={12}/>LEGITIMATE</span>}
                  <span style={{fontSize:12,color:'#475569'}}>ID #{selected.id}</span>
                </div>
                <h3 style={{color:'#e2f8ff',fontSize:16,fontWeight:700}}>{selected.subject}</h3>
              </div>
              <button className="modal-close" onClick={()=>setSelected(null)}><X size={18}/></button>
            </div>
            <div className="modal-body">
              <div className="modal-field"><label>Sender</label><span>{selected.sender}</span></div>
              <div className="modal-field"><label>Confidence</label><span>{Math.round((selected.confidence||0)*100)}%</span></div>
              <div className="modal-field"><label>Date</label><span>{new Date(selected.created_at).toLocaleString()}</span></div>
              {selected.spam_indicators?.length>0 && (
                <div className="modal-field">
                  <label>Indicators</label>
                  <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:4}}>
                    {selected.spam_indicators.map((ind,i)=>(
                      <div key={i} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:8,padding:'8px 12px'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:3}}>
                          <span style={{fontSize:12,fontWeight:600,color:'#e2f8ff'}}>{ind.type}</span>
                          <span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:`${SEVERITY_COLOR[ind.severity]}20`,color:SEVERITY_COLOR[ind.severity]}}>{ind.severity}</span>
                        </div>
                        <p style={{fontSize:11,color:'#64748b',margin:0}}>{ind.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="modal-field">
                <label>Body</label>
                <div className="modal-body-text">{selected.body}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .emails-toolbar { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; gap:12px; flex-wrap:wrap; }
        .filter-tabs { display:flex; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:4px; gap:4px; }
        .filter-tab { padding:7px 16px; border-radius:7px; border:none; background:transparent; color:#64748b; font-size:13px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.2s; }
        .filter-tab.active { background:rgba(6,182,212,0.15); color:#22d3ee; }
        .search-box { display:flex; align-items:center; gap:8px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:10px; padding:0 14px; min-width:240px; }
        .search-icon { color:#475569; flex-shrink:0; }
        .search-box input { background:transparent; border:none; outline:none; color:#e2f8ff; font-size:14px; padding:10px 0; font-family:'DM Sans',sans-serif; flex:1; min-width:0; }
        .search-box input::placeholder { color:#374151; }
        .search-clear { background:none; border:none; color:#475569; cursor:pointer; display:flex; padding:2px; }
        .emails-table-card { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:16px; overflow:hidden; margin-bottom:16px; }
        .etable-head { display:grid; grid-template-columns:50px 1fr 1fr 90px 120px 90px 40px; gap:12px; padding:12px 20px; background:rgba(255,255,255,0.03); border-bottom:1px solid rgba(255,255,255,0.06); font-size:11px; color:#475569; font-weight:600; text-transform:uppercase; letter-spacing:0.6px; }
        .etable-row { display:grid; grid-template-columns:50px 1fr 1fr 90px 120px 90px 40px; gap:12px; padding:14px 20px; border-bottom:1px solid rgba(255,255,255,0.04); align-items:center; transition:background 0.15s; font-size:13px; color:#94a3b8; }
        .etable-row:hover { background:rgba(255,255,255,0.02); }
        .etable-row:last-child { border-bottom:none; }
        .row-spam { border-left:2px solid rgba(244,63,94,0.3); }
        .cell-id { font-family:'Space Mono',monospace; font-size:11px; color:#374151; }
        .cell-subj { color:#cbd5e1; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .cell-send { color:#64748b; font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .cell-date { font-size:12px; color:#475569; }
        .view-btn { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:5px; color:#64748b; cursor:pointer; display:flex; transition:all 0.15s; }
        .view-btn:hover { background:rgba(6,182,212,0.1); color:#22d3ee; border-color:rgba(6,182,212,0.25); }
        .table-loading, .table-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; padding:48px; color:#475569; }
        .table-loading span, .table-empty p { font-size:14px; }
        .pagination { display:flex; justify-content:space-between; align-items:center; }
        .pag-info { font-size:13px; color:#475569; }
        .pag-btns { display:flex; gap:4px; }
        .pag-btn { width:34px; height:34px; display:flex; align-items:center; justify-content:center; border-radius:8px; border:1px solid rgba(255,255,255,0.07); background:rgba(255,255,255,0.03); color:#64748b; cursor:pointer; font-size:13px; font-family:'DM Sans',sans-serif; transition:all 0.15s; }
        .pag-btn:hover:not(:disabled) { background:rgba(6,182,212,0.1); color:#22d3ee; border-color:rgba(6,182,212,0.25); }
        .pag-btn.active { background:rgba(6,182,212,0.15); color:#22d3ee; border-color:rgba(6,182,212,0.3); }
        .pag-btn:disabled { opacity:0.3; cursor:not-allowed; }
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.7); backdrop-filter:blur(4px); z-index:100; display:flex; align-items:center; justify-content:center; padding:24px; }
        .modal-card { background:#0d1829; border:1px solid rgba(6,182,212,0.2); border-radius:18px; width:100%; max-width:580px; max-height:80vh; overflow:hidden; display:flex; flex-direction:column; }
        .modal-header { display:flex; justify-content:space-between; align-items:flex-start; padding:24px 24px 16px; border-bottom:1px solid rgba(255,255,255,0.06); }
        .modal-close { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:6px; color:#64748b; cursor:pointer; display:flex; flex-shrink:0; }
        .modal-close:hover { color:#e2f8ff; }
        .modal-body { padding:20px 24px; overflow-y:auto; display:flex; flex-direction:column; gap:14px; }
        .modal-field { display:flex; flex-direction:column; gap:4px; }
        .modal-field label { font-size:11px; color:#475569; font-weight:600; text-transform:uppercase; letter-spacing:0.6px; }
        .modal-field span { font-size:13px; color:#94a3b8; }
        .modal-body-text { font-size:13px; color:#64748b; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:10px; padding:14px; line-height:1.7; white-space:pre-wrap; max-height:200px; overflow-y:auto; }
      `}</style>
    </div>
  )
}
