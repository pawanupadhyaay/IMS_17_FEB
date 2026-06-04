import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import storeAdminService from '../../services/storeAdminService';
import './StoreDashboard.css';

// ─────────────────────────────────────────────────────────────
// SVG Icons
// ─────────────────────────────────────────────────────────────
const CalIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const ChevronDown = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
);
const BoxIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);
const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const AlertIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const BagIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
    <line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
);
const EditIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const TruckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
    <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);

// ─────────────────────────────────────────────────────────────
// Demo Data (rich 30-day dataset)
// ─────────────────────────────────────────────────────────────
const generateDemoOrders = () => {
  const statuses = ['delivered','delivered','delivered','shipped','shipped','processing','pending','cancelled'];
  const products  = [
    { title: 'Tissot PRX Powermatic 80',        price: 68000  },
    { title: 'Rado Captain Cook Automatic',      price: 230000 },
    { title: 'Longines HydroConquest Blue Dial', price: 185000 },
    { title: 'Seiko Presage Cocktail Time',      price: 42000  },
    { title: 'Balmain Heritage Chrono',          price: 115000 },
    { title: 'Citizen Promaster Diver',          price: 32000  },
    { title: 'Tag Heuer Carrera Calibre',        price: 320000 },
    { title: 'Omega Seamaster 300m',             price: 450000 },
  ];
  const customers = [
    { name:'Rajesh Malhotra',  email:'rajesh@example.com'       },
    { name:'Priya Sen',        email:'priya.sen@outlook.com'    },
    { name:'Vikram Aditya',    email:'vikram.aditya@gmail.com'  },
    { name:'Ananya Roy',       email:'ananya.roy@yahoo.com'     },
    { name:'Kabir Mehta',      email:'kabir.mehta@hotmail.com'  },
    { name:'Sneha Gupta',      email:'sneha.gupta@gmail.com'    },
    { name:'Arjun Nair',       email:'arjun.nair@gmail.com'     },
    { name:'Divya Sharma',     email:'divya.sharma@yahoo.com'   },
  ];
  const orders = [];
  const now = new Date();
  for (let i = 0; i < 90; i++) {
    const daysAgo = Math.floor(Math.random() * 60);
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(Math.floor(Math.random() * 23), Math.floor(Math.random() * 60), 0, 0);
    const prod = products[Math.floor(Math.random() * products.length)];
    const cust = customers[Math.floor(Math.random() * customers.length)];
    const qty  = Math.random() > 0.85 ? 2 : 1;
    orders.push({
      _id: `DEMO-${i}`,
      orderId: `SMY-2026-${8700 + i}`,
      createdAt: d.toISOString(),
      totalAmount: prod.price * qty,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      items: [{ product: { title: prod.title }, qty }],
      user: cust,
    });
  }
  return orders.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
};
const ALL_DEMO_ORDERS = generateDemoOrders();

const DEMO_STATS = { activeProductsCount: 38, liveUsers: 14, lowStockCount: 2 };
const DEMO_POPULAR = [
  { title:'Tissot PRX Powermatic 80',        brand:'TISSOT',   sales:42, revenue:2856000, img:'https://res.cloudinary.com/dz6ndhyus/image/upload/v1779287501/samay_assets/hydroconquest-l3-781-3-78-9-detailed-view-1333x2000-2-073d4a_ccml7u.jpg' },
  { title:'Rado Captain Cook Automatic',      brand:'RADO',     sales:26, revenue:5980000, img:'https://res.cloudinary.com/dz6ndhyus/image/upload/v1779287501/samay_assets/hydroconquest-l3-781-3-78-9-detailed-view-1333x2000-2-073d4a_ccml7u.jpg' },
  { title:'Longines HydroConquest Blue Dial', brand:'LONGINES', sales:18, revenue:3330000, img:'https://res.cloudinary.com/dz6ndhyus/image/upload/v1779287501/samay_assets/hydroconquest-l3-781-3-78-9-detailed-view-1333x2000-2-073d4a_ccml7u.jpg' },
];
const INITIAL_LIVE_ACTIVITIES = [
  { id:1, text:'Customer from <strong>Mumbai</strong> added <i>Seiko Presage</i> to cart',             type:'green',  time:'Just now'    },
  { id:2, text:'Visitor from <strong>New Delhi</strong> viewed <i>Tissot PRX Powermatic</i>',          type:'blue',   time:'2 mins ago'  },
  { id:3, text:'Order processed for <strong>SMY-2026-8742</strong> (₹1,85,000)',                       type:'orange', time:'5 mins ago'  },
  { id:4, text:'Customer from <strong>Kolkata</strong> completed signup verification',                  type:'blue',   time:'12 mins ago' },
  { id:5, text:'Visitor from <strong>Bangalore</strong> initiated checkout flow',                       type:'green',  time:'18 mins ago' },
];
const ACTIVITY_TEMPLATES = [
  { text:'Visitor from <strong>Ahmedabad</strong> viewed <i>Rado Captain Cook</i>',      type:'blue'   },
  { text:'Customer from <strong>Pune</strong> added <i>Balmain Heritage</i> to cart',    type:'green'  },
  { text:'New support ticket opened: <i>"Order tracking help"</i>',                       type:'orange' },
  { text:'Visitor from <strong>Hyderabad</strong> viewed <i>Citizen Promaster</i>',      type:'blue'   },
  { text:'Live shopper from <strong>Chennai</strong> added <i>Longines Spirit</i> to bag',type:'green' },
];

// ─────────────────────────────────────────────────────────────
// Date range presets
// ─────────────────────────────────────────────────────────────
const PRESETS = [
  { key:'today',    label:'Today'         },
  { key:'yesterday',label:'Yesterday'     },
  { key:'7d',       label:'Last 7 days'   },
  { key:'30d',      label:'Last 30 days'  },
  { key:'90d',      label:'Last 90 days'  },
  { key:'month',    label:'This month'    },
  { key:'lastmonth',label:'Last month'    },
  { key:'custom',   label:'Custom range'  },
];

const computeRange = (preset, customStart, customEnd) => {
  const now = new Date();
  const today = (offset = 0) => {
    const d = new Date(now); d.setDate(d.getDate() - offset); d.setHours(0,0,0,0); return d;
  };
  const eod = (d) => { const e = new Date(d); e.setHours(23,59,59,999); return e; };
  switch (preset) {
    case 'today':     return { start: today(), end: new Date() };
    case 'yesterday': return { start: today(1), end: eod(today(1)) };
    case '7d':        return { start: today(6), end: new Date() };
    case '30d':       return { start: today(29), end: new Date() };
    case '90d':       return { start: today(89), end: new Date() };
    case 'month': {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: s, end: new Date() };
    }
    case 'lastmonth': {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start: s, end: e };
    }
    case 'custom': {
      if (customStart && customEnd) {
        return { start: new Date(customStart+'T00:00:00'), end: new Date(customEnd+'T23:59:59') };
      }
      return { start: today(29), end: new Date() };
    }
    default: return { start: today(29), end: new Date() };
  }
};

const prevRange = (start, end) => {
  const diff = end - start;
  return { start: new Date(start - diff), end: new Date(start) };
};

const filterByRange = (orders, start, end) => {
  if (!start) return orders;
  return orders.filter(o => { const d = new Date(o.createdAt); return d >= start && d <= end; });
};

const fmtDate = (d) => d ? d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '';

// ─────────────────────────────────────────────────────────────
// Sparkline (mini inline chart)
// ─────────────────────────────────────────────────────────────
const Sparkline = ({ data, color = '#c6a74e', width = 80, height = 32 }) => {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - 4 - (v / max) * (height - 8),
  }));
  let path = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const cx1 = pts[i].x + (pts[i+1].x - pts[i].x) * 0.4;
    const cx2 = pts[i+1].x - (pts[i+1].x - pts[i].x) * 0.4;
    path += ` C ${cx1} ${pts[i].y}, ${cx2} ${pts[i+1].y}, ${pts[i+1].x} ${pts[i+1].y}`;
  }
  const area = `${path} L ${pts[pts.length-1].x} ${height} L 0 ${height} Z`;
  return (
    <svg width={width} height={height} style={{ overflow:'visible', flexShrink:0 }}>
      <defs>
        <linearGradient id={`sp-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sp-${color.slice(1)})`}/>
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────
// Dual Line Chart (current + prev period)
// ─────────────────────────────────────────────────────────────
const DualLineChart = ({ currData, prevData, currLabel, prevLabel }) => {
  const [tooltip, setTooltip] = useState(null);
  const W = 540, H = 220, PL = 55, PB = 30;
  const allVals = [...currData.map(d=>d.val), ...prevData.map(d=>d.val)];
  const maxV = Math.max(...allVals, 1);
  const N = currData.length;
  const mkPts = (data) => data.map((d, i) => ({
    x: PL + i * ((W - PL - 10) / (N - 1 || 1)),
    y: 20 + (1 - d.val / maxV) * (H - PB - 20),
    ...d,
  }));
  const mkPath = (pts) => {
    if (!pts.length) return '';
    let p = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const cx1 = pts[i].x + 24, cx2 = pts[i+1].x - 24;
      p += ` C ${cx1} ${pts[i].y}, ${cx2} ${pts[i+1].y}, ${pts[i+1].x} ${pts[i+1].y}`;
    }
    return p;
  };
  const currPts = mkPts(currData);
  const prevPts = mkPts(prevData);
  const currPath = mkPath(currPts);
  const prevPath = mkPath(prevPts);
  // Y-axis labels
  const yLabels = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    val: Math.round(maxV * f),
    y: 20 + (1 - f) * (H - PB - 20),
  }));
  return (
    <div className="dual-chart-wrap">
      <div style={{ position:'relative', width:'100%' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" overflow="visible">
          <defs>
            <linearGradient id="currGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c6a74e" stopOpacity="0.2"/>
              <stop offset="100%" stopColor="#c6a74e" stopOpacity="0"/>
            </linearGradient>
          </defs>
          {/* Grid lines */}
          {yLabels.map((l,i) => (
            <g key={i}>
              <line x1={PL} x2={W-10} y1={l.y} y2={l.y} stroke="#f1f5f9" strokeWidth="1"/>
              <text x={PL - 6} y={l.y + 4} textAnchor="end" fontSize="10" fill="#94a3b8" fontWeight="600">
                {l.val >= 100000 ? `₹${(l.val/100000).toFixed(0)}L` : l.val >= 1000 ? `₹${(l.val/1000).toFixed(0)}K` : l.val === 0 ? '₹0' : `₹${l.val}`}
              </text>
            </g>
          ))}
          {/* Filled area under current */}
          {currPath && (
            <path d={`${currPath} L ${currPts[currPts.length-1].x} ${H-PB} L ${currPts[0].x} ${H-PB} Z`} fill="url(#currGrad)"/>
          )}
          {/* Previous period — dashed */}
          {prevPath && <path d={prevPath} fill="none" stroke="#c6a74e" strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" opacity="0.4"/>}
          {/* Current period — solid */}
          {currPath && (
            <path d={currPath} fill="none" stroke="#c6a74e" strokeWidth="2.5" strokeLinecap="round"
              style={{ filter:'drop-shadow(0 3px 8px rgba(198,167,78,0.3))' }}/>
          )}
          {/* Nodes */}
          {currPts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="4" fill="white" stroke="#c6a74e" strokeWidth="2.5"
              style={{ cursor:'pointer' }}
              onMouseEnter={() => setTooltip({ ...p, idx: i })}
              onMouseLeave={() => setTooltip(null)}/>
          ))}
          {/* X labels */}
          {currPts.map((p, i) => (
            <text key={i} x={p.x} y={H - 8} textAnchor="middle" fontSize="10" fill="#94a3b8" fontWeight="700">
              {p.day}
            </text>
          ))}
        </svg>
        {/* Tooltip */}
        {tooltip && (
          <div className="chart-tooltip" style={{
            left: `${(tooltip.x / W) * 100}%`,
            top: `${(tooltip.y / H) * 100}%`,
          }}>
            <p style={{ margin:0, fontWeight:700 }}>{tooltip.day}: ₹{tooltip.val.toLocaleString('en-IN')}</p>
            {prevData[tooltip.idx] && (
              <p style={{ margin:'2px 0 0', opacity:0.7, fontWeight:600, fontSize:11 }}>
                Prev: ₹{prevData[tooltip.idx].val.toLocaleString('en-IN')}
              </p>
            )}
          </div>
        )}
      </div>
      {/* Legend */}
      <div className="chart-legend-row">
        <span className="chart-legend-item curr">
          <span className="chart-legend-dot curr-dot"/>
          {currLabel}
        </span>
        <span className="chart-legend-item prev">
          <span className="chart-legend-dot prev-dot"/>
          {prevLabel}
        </span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Date Range Picker Dropdown
// ─────────────────────────────────────────────────────────────
const DateRangePicker = ({ preset, customStart, customEnd, onChange }) => {
  const [open, setOpen] = useState(false);
  const [tempPreset, setTempPreset] = useState(preset);
  const [tempStart, setTempStart]   = useState(customStart);
  const [tempEnd, setTempEnd]       = useState(customEnd);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const apply = () => {
    onChange(tempPreset, tempStart, tempEnd);
    setOpen(false);
  };
  const cancel = () => {
    setTempPreset(preset); setTempStart(customStart); setTempEnd(customEnd);
    setOpen(false);
  };

  const { start, end } = computeRange(preset, customStart, customEnd);
  const label = preset === 'custom'
    ? `${fmtDate(new Date(customStart+'T00:00:00'))} – ${fmtDate(new Date(customEnd+'T23:59:59'))}`
    : PRESETS.find(p => p.key === preset)?.label || 'Last 30 days';

  return (
    <div className="drp-wrap" ref={ref}>
      <button className="drp-btn" onClick={() => setOpen(!open)}>
        <CalIcon/>
        <span>{label}</span>
        <ChevronDown/>
      </button>
      {open && (
        <div className="drp-panel">
          <div className="drp-sidebar">
            {PRESETS.map(p => (
              <button key={p.key} className={`drp-preset ${tempPreset === p.key ? 'active' : ''}`}
                onClick={() => setTempPreset(p.key)}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="drp-body">
            {tempPreset === 'custom' ? (
              <div className="drp-custom-inputs">
                <div className="drp-custom-field">
                  <label>Start date</label>
                  <input type="date" value={tempStart} max={tempEnd || new Date().toISOString().split('T')[0]}
                    onChange={e => setTempStart(e.target.value)}/>
                </div>
                <div className="drp-custom-field">
                  <label>End date</label>
                  <input type="date" value={tempEnd} min={tempStart} max={new Date().toISOString().split('T')[0]}
                    onChange={e => setTempEnd(e.target.value)}/>
                </div>
              </div>
            ) : (
              <div className="drp-preview">
                <div className="drp-preview-icon"><CalIcon/></div>
                <p className="drp-preview-range">
                  {fmtDate(computeRange(tempPreset).start)} — {fmtDate(computeRange(tempPreset).end)}
                </p>
                <p className="drp-preview-label">{PRESETS.find(p=>p.key===tempPreset)?.label}</p>
              </div>
            )}
            <div className="drp-actions">
              <button className="drp-cancel" onClick={cancel}>Cancel</button>
              <button className="drp-apply" onClick={apply}>Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────
export default function StoreDashboard() {
  const navigate = useNavigate();

  // Core data
  const [isDemoMode, setIsDemoMode]     = useState(true);
  const [liveOrders, setLiveOrders]     = useState([]);
  const [liveStats, setLiveStats]       = useState(null);
  const [loading, setLoading]           = useState(true);
  const [apiError, setApiError]         = useState(false);

  // Date range
  const [preset, setPreset]         = useState('30d');
  const [customStart, setCustomStart] = useState(
    new Date(new Date().setDate(new Date().getDate()-29)).toISOString().split('T')[0]
  );
  const [customEnd, setCustomEnd]   = useState(new Date().toISOString().split('T')[0]);

  // Live widgets
  const [liveShoppers, setLiveShoppers]       = useState(14);
  const [isEditingShoppers, setIsEditing]     = useState(false);
  const [tempShoppers, setTempShoppers]       = useState(14);
  const [liveActivities, setLiveActivities]   = useState(INITIAL_LIVE_ACTIVITIES);
  const [chartTooltip, setChartTooltip]       = useState(null);

  const fetchData = async () => {
    try {
      const [statsRes, ordersRes] = await Promise.all([
        storeAdminService.getDashboardStats(),
        storeAdminService.getOrders(),
      ]);
      if (statsRes.success) { setLiveStats(statsRes.data); setApiError(false); }
      if (ordersRes.success) setLiveOrders(ordersRes.data || []);
    } catch { setApiError(true); }
  };

  useEffect(() => {
    (async () => { setLoading(true); await fetchData(); setLoading(false); })();
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      if (!isDemoMode) fetchData();
      setLiveShoppers(p => Math.max(1, p + (Math.random() > 0.5 ? 1 : -1)));
      setLiveActivities(prev => {
        const t = ACTIVITY_TEMPLATES[Math.floor(Math.random() * ACTIVITY_TEMPLATES.length)];
        return [
          { id: Date.now(), text: t.text, type: t.type, time: 'Just now' },
          ...prev.map(a => ({
            ...a,
            time: a.time === 'Just now' ? '1 min ago' :
              a.time.includes('min') ? `${parseInt(a.time) + 1} mins ago` : a.time,
          })).slice(0, 5),
        ];
      });
    }, 12000);
    return () => clearInterval(iv);
  }, [isDemoMode]);

  // ── Source data
  const sourceOrders = isDemoMode ? ALL_DEMO_ORDERS : (liveOrders.length > 0 ? liveOrders : ALL_DEMO_ORDERS);
  const baseStats    = isDemoMode ? DEMO_STATS : (liveStats || DEMO_STATS);

  // ── Date range
  const handleRangeChange = (newPreset, newStart, newEnd) => {
    setPreset(newPreset);
    if (newPreset === 'custom') { setCustomStart(newStart); setCustomEnd(newEnd); }
  };
  const { start: currStart, end: currEnd } = computeRange(preset, customStart, customEnd);
  const { start: prevStart, end: prevEnd } = prevRange(currStart, currEnd);

  const currOrders = useMemo(() => filterByRange(sourceOrders, currStart, currEnd), [sourceOrders, preset, customStart, customEnd]);
  const prevOrders = useMemo(() => filterByRange(sourceOrders, prevStart, prevEnd), [sourceOrders, preset, customStart, customEnd]);

  // ── KPIs
  const currRevenue   = useMemo(() => currOrders.reduce((s,o) => s+(o.totalAmount||0), 0), [currOrders]);
  const prevRevenue   = useMemo(() => prevOrders.reduce((s,o) => s+(o.totalAmount||0), 0), [prevOrders]);
  const revenueGrowth = prevRevenue ? ((currRevenue - prevRevenue) / prevRevenue) * 100 : null;

  const currCount  = currOrders.length;
  const prevCount  = prevOrders.length;
  const orderGrowth = prevCount ? ((currCount - prevCount) / prevCount) * 100 : null;

  const currAOV = currCount ? Math.round(currRevenue / currCount) : 0;
  const prevAOV = prevCount ? Math.round(prevRevenue / prevCount) : 0;
  const aovGrowth = prevAOV ? ((currAOV - prevAOV) / prevAOV) * 100 : null;

  const pendingFulfill = useMemo(
    () => currOrders.filter(o => ['pending','processing'].includes(o.status)).length,
    [currOrders]
  );

  // ── Chart data builder
  const buildData = (orders, start, end, N = 7) => {
    if (!start) return [];
    const diff = (end - start) / N;
    const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
    return Array.from({ length: N }, (_, i) => {
      const s = new Date(start.getTime() + i * diff);
      const e = new Date(start.getTime() + (i+1) * diff - 1);
      const val = orders
        .filter(o => { const d = new Date(o.createdAt); return d >= s && d <= e; })
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      // label: if span > 3 days → day name, else hour
      const spanDays = diff / 86400000;
      let day;
      if (spanDays > 5) {
        day = s.toLocaleDateString('en-IN', { day:'numeric', month:'short' });
      } else if (spanDays > 0.5) {
        day = DAYS[s.getDay()];
      } else {
        const h = s.getHours();
        day = h < 12 ? `${h||12}AM` : `${h===12?12:h-12}PM`;
      }
      return { day, val };
    });
  };

  // ── Sparklines (7 data points within current range, per KPI)
  const sparkRevenue = useMemo(() => buildData(currOrders, currStart, currEnd).map(d => d.val), [currOrders]);
  const sparkOrders  = useMemo(() => buildData(currOrders, currStart, currEnd).map(d =>
    currOrders.filter(o => {
      const t = new Date(o.createdAt);
      // simple fallback – use same bucket index idea
      return true;
    }).length
  ), [currOrders]);

  // Cleaner sparklines: just use per-day order count & revenue
  const sparkBuckets = useMemo(() => buildData(currOrders, currStart, currEnd, 7), [currOrders]);
  const sparkRevData = useMemo(() => sparkBuckets.map(b => b.val), [sparkBuckets]);
  const sparkOrdData = useMemo(() => {
    const diff = (currEnd - currStart) / 7;
    return Array.from({ length: 7 }, (_, i) => {
      const s = new Date(currStart.getTime() + i * diff);
      const e = new Date(currStart.getTime() + (i+1) * diff - 1);
      return currOrders.filter(o => { const d = new Date(o.createdAt); return d >= s && d <= e; }).length;
    });
  }, [currOrders]);

  // ── Dual chart data
  const currChartData = useMemo(() => buildData(currOrders, currStart, currEnd, 7), [currOrders]);
  const prevChartData = useMemo(() => buildData(prevOrders, prevStart, prevEnd, 7).map((d, i) => ({ ...d, day: currChartData[i]?.day || d.day })), [prevOrders, currChartData]);

  // ── Recent orders
  const recentOrders = currOrders.slice(0, 5);

  // ── Greet
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const GrowthTag = ({ pct }) => {
    if (pct === null) return <span className="growth-dash">—</span>;
    const up = pct >= 0;
    return (
      <span className={`kpi-growth ${up ? 'up' : 'down'}`}>
        {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
      </span>
    );
  };

  const currLabel = `${fmtDate(currStart)}–${fmtDate(currEnd)}`;
  const prevLabel = `${fmtDate(prevStart)}–${fmtDate(prevEnd)}`;

  return (
    <div className="store-dashboard">

      {/* ── Page Header ── */}
      <div className="store-page-header">
        <div className="page-title-box">
          <p className="page-subtitle">OVERVIEW &amp; ANALYTICS</p>
          <h1>Boutique Dashboard</h1>
          <p className="page-desc">{greet}! Here's what's happening in your store.</p>
        </div>
        <div className="header-right-controls">
          <DateRangePicker preset={preset} customStart={customStart} customEnd={customEnd} onChange={handleRangeChange}/>
          <div className="mode-toggle-container">
            <span className={`mode-label ${!isDemoMode ? 'active' : ''}`}>Live</span>
            <label className="switch-control">
              <input type="checkbox" checked={isDemoMode} onChange={() => setIsDemoMode(!isDemoMode)}/>
              <span className="switch-slider"/>
            </label>
            <span className={`mode-label ${isDemoMode ? 'active' : ''}`}>Demo</span>
          </div>
        </div>
      </div>

      {/* ── API Error ── */}
      {!isDemoMode && apiError && (
        <div className="api-error-banner">
          <span>⚠️</span>
          <span>Backend offline — showing demo data. Ensure your backend is running and you are logged in.</span>
        </div>
      )}

      {/* ── Shopify-style KPI Row ── */}
      <div className="kpi-summary-card">
        <div className="kpi-summary-grid">

          <div className="kpi-metric-col">
            <div className="kpi-metric-top">
              <span className="kpi-metric-label">Total Sales</span>
              <div className="kpi-metric-val-row">
                <span className="kpi-metric-val">₹{(currRevenue / 100000).toFixed(2)}L</span>
                <GrowthTag pct={revenueGrowth}/>
              </div>
            </div>
            <Sparkline data={sparkRevData} color="#c6a74e"/>
          </div>

          <div className="kpi-metric-col">
            <div className="kpi-metric-top">
              <span className="kpi-metric-label">Orders</span>
              <div className="kpi-metric-val-row">
                <span className="kpi-metric-val">{currCount}</span>
                <GrowthTag pct={orderGrowth}/>
              </div>
            </div>
            <Sparkline data={sparkOrdData} color="#3b82f6"/>
          </div>

          <div className="kpi-metric-col">
            <div className="kpi-metric-top">
              <span className="kpi-metric-label">Avg Order Value</span>
              <div className="kpi-metric-val-row">
                <span className="kpi-metric-val">₹{currAOV.toLocaleString('en-IN')}</span>
                <GrowthTag pct={aovGrowth}/>
              </div>
            </div>
            <Sparkline data={sparkRevData.map((v, i) => (sparkOrdData[i] ? Math.round(v / sparkOrdData[i]) : 0))} color="#10b981"/>
          </div>

          <div className="kpi-metric-col">
            <div className="kpi-metric-top">
              <span className="kpi-metric-label">Live Shoppers</span>
              <div className="kpi-metric-val-row">
                {isEditingShoppers ? (
                  <div className="shopper-edit-container" onClick={e => e.stopPropagation()}>
                    <input type="number" value={tempShoppers} className="shopper-edit-input" autoFocus
                      onChange={e => setTempShoppers(Math.max(1, parseInt(e.target.value)||1))}
                      onKeyDown={e => { if(e.key==='Enter'){setLiveShoppers(tempShoppers);setIsEditing(false);} if(e.key==='Escape') setIsEditing(false); }}/>
                    <button className="shopper-save-btn" onClick={() => {setLiveShoppers(tempShoppers);setIsEditing(false);}}>Save</button>
                  </div>
                ) : (
                  <>
                    <span className="kpi-metric-val">{liveShoppers}</span>
                    <span className="live-badge"><span className="pulse-dot"/> Live</span>
                    <span className="edit-shopper-trigger" onClick={e => {e.stopPropagation();setTempShoppers(liveShoppers);setIsEditing(true);}}>
                      <EditIcon/>
                    </span>
                  </>
                )}
              </div>
            </div>
            <Sparkline data={Array.from({length:7},(_,i)=>Math.max(1,liveShoppers+Math.sin(i)*3|0))} color="#f97316"/>
          </div>

        </div>

        {/* Dual comparison chart */}
        <DualLineChart
          currData={currChartData}
          prevData={prevChartData}
          currLabel={currLabel}
          prevLabel={prevLabel}
        />
      </div>

      {/* ── Orders to Fulfill Banner ── */}
      {pendingFulfill > 0 && (
        <button className="fulfill-banner" onClick={() => navigate('/my-store/orders')}>
          <span className="fulfill-banner-icon"><TruckIcon/></span>
          <span className="fulfill-banner-text">
            <strong>{pendingFulfill} order{pendingFulfill > 1 ? 's' : ''} to fulfill</strong>
            <span>Click to view and process pending &amp; processing orders →</span>
          </span>
        </button>
      )}

      {/* ── Secondary KPI Cards ── */}
      <div className="store-metrics-grid">
        <div className="metric-card clickable" onClick={() => navigate('/dashboard')}>
          <div className="metric-card-header">
            <span className="metric-label">Active Products</span>
            <div className="metric-icon-box gold"><BoxIcon/></div>
          </div>
          <h2>{baseStats.activeProductsCount}</h2>
          <span className="card-link">View Catalog →</span>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-label">Total Revenue</span>
            <div className="metric-icon-box green">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            </div>
          </div>
          <h2 className="revenue-text">₹{currRevenue.toLocaleString('en-IN')}</h2>
          <span className="card-link">This period</span>
        </div>

        <div className="metric-card clickable" onClick={() => navigate('/dashboard')}>
          <div className="metric-card-header">
            <span className="metric-label">Low Stock</span>
            <div className="metric-icon-box red"><AlertIcon/></div>
          </div>
          <h2 style={{ color: baseStats.lowStockCount > 0 ? '#ef4444' : 'inherit' }}>
            {baseStats.lowStockCount}
          </h2>
          <span className="card-link">Restock watches →</span>
        </div>

        <div className="metric-card clickable" onClick={() => navigate('/my-store/orders')}>
          <div className="metric-card-header">
            <span className="metric-label">Total Orders</span>
            <div className="metric-icon-box orange"><BagIcon/></div>
          </div>
          <h2>{currCount}</h2>
          <span className="card-link">Manage Orders →</span>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="store-dashboard-grid">

        {/* Left Column */}
        <div className="store-grid-main">

          {/* Recent Transactions */}
          <div className="dashboard-widget-card">
            <div className="widget-title-box">
              <h3>Recent Transactions</h3>
              <span className="widget-action" onClick={() => navigate('/my-store/orders')}>All Orders</span>
            </div>

            {/* Desktop table */}
            <div className="table-responsive-wrapper dash-table-desktop">
              <table className="mini-admin-table">
                <thead>
                  <tr><th>Order ID</th><th>Customer</th><th>Products</th><th>Total</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {recentOrders.length === 0 ? (
                    <tr><td colSpan={5} style={{textAlign:'center',color:'#94a3b8',padding:'2rem'}}>No orders in this period</td></tr>
                  ) : recentOrders.map(order => {
                    const sc = order.status?.toLowerCase() || 'pending';
                    const pn = order.items?.[0]?.product?.title || 'Luxury Timepiece';
                    return (
                      <tr key={order._id}>
                        <td className="font-bold tracking-wider">{order.orderId || order._id?.slice(-8).toUpperCase()}</td>
                        <td className="buyer-cell">
                          <span className="buyer-name">{order.user?.name || 'Walk-in Customer'}</span>
                          <span className="buyer-email">{order.user?.email || '—'}</span>
                        </td>
                        <td className="font-semibold">{pn}{order.items?.length > 1 ? ` +${order.items.length-1}` : ''}</td>
                        <td className="total-bold">₹{order.totalAmount?.toLocaleString('en-IN')}</td>
                        <td><span className={`status-badge ${sc}`}>{order.status||'Pending'}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="dash-orders-mobile">
              {recentOrders.length === 0
                ? <p style={{textAlign:'center',color:'#94a3b8',padding:'1.5rem 0'}}>No orders in this period</p>
                : recentOrders.map(order => {
                  const sc = order.status?.toLowerCase() || 'pending';
                  const pn = order.items?.[0]?.product?.title || 'Luxury Timepiece';
                  return (
                    <div className="dash-order-card" key={order._id}>
                      <div className="dash-order-card-top">
                        <span className="dash-order-id">{order.orderId || order._id?.slice(-8).toUpperCase()}</span>
                        <span className={`status-badge ${sc}`}>{order.status||'Pending'}</span>
                      </div>
                      <div className="dash-order-card-body">
                        <div className="dash-order-customer">
                          <span className="buyer-name">{order.user?.name || 'Walk-in Customer'}</span>
                          <span className="buyer-email">{order.user?.email || '—'}</span>
                        </div>
                        <div className="dash-order-right">
                          <span className="dash-order-product">{pn}</span>
                          <span className="dash-order-total">₹{order.totalAmount?.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              }
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="store-grid-sidebar">

          {/* Live stream */}
          <div className="dashboard-widget-card">
            <div className="widget-title-box">
              <h3>Live stream</h3>
              <span className="live-badge"><span className="pulse-dot"/> {`${liveShoppers} online`}</span>
            </div>
            <div className="activity-stream">
              {liveActivities.map(act => (
                <div className="activity-node" key={act.id}>
                  <div className={`activity-dot ${act.type}`}/>
                  <div className="activity-content">
                    <p className="activity-text" dangerouslySetInnerHTML={{ __html: act.text }}/>
                    <span className="activity-time">{act.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Orders Fulfillment Doughnut */}
          <div className="dashboard-widget-card">
            <div className="widget-title-box">
              <h3>Orders Fulfillment</h3>
              <span className="widget-action">Proportions</span>
            </div>
            <div className="doughnut-layout">
              <div className="doughnut-svg-box">
                <svg width="100%" height="100%" viewBox="0 0 120 120">
                  <circle r="40" cx="60" cy="60" fill="transparent" stroke="#f1f5f9" strokeWidth="10"/>
                  <circle r="40" cx="60" cy="60" fill="transparent" stroke="#10b981" strokeWidth="10" strokeDasharray="150.7 251.2" strokeDashoffset="0" strokeLinecap="round"/>
                  <circle r="40" cx="60" cy="60" fill="transparent" stroke="#3b82f6" strokeWidth="10" strokeDasharray="50.2 251.2" strokeDashoffset="-150.7" strokeLinecap="round"/>
                  <circle r="40" cx="60" cy="60" fill="transparent" stroke="#f97316" strokeWidth="10" strokeDasharray="37.6 251.2" strokeDashoffset="-200.9" strokeLinecap="round"/>
                  <circle r="40" cx="60" cy="60" fill="transparent" stroke="#ef4444" strokeWidth="10" strokeDasharray="12.5 251.2" strokeDashoffset="-238.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="doughnut-legend">
                {[['Delivered','#10b981','60%'],['Shipped','#3b82f6','20%'],['Pending','#f97316','15%'],['Cancelled','#ef4444','5%']].map(([l,c,p])=>(
                  <div className="legend-item" key={l}>
                    <div className="legend-indicator-box"><span className="legend-indicator" style={{backgroundColor:c}}/><span>{l}</span></div>
                    <span className="legend-val">{p}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Popular watches */}
          <div className="dashboard-widget-card">
            <div className="widget-title-box">
              <h3>Popular watches</h3>
              <span className="widget-action">Volume</span>
            </div>
            <div className="popular-products-list">
              {DEMO_POPULAR.map((prod, idx) => (
                <div className="popular-product-row" key={idx}>
                  <div className="popular-product-img"><img src={prod.img} alt={prod.title}/></div>
                  <div className="popular-product-info">
                    <h4 className="popular-product-title">{prod.title}</h4>
                    <span className="popular-product-brand">{prod.brand}</span>
                  </div>
                  <div className="popular-product-sales-box">
                    <span className="popular-product-sales-count">{prod.sales} sold</span>
                    <span className="popular-product-sales-revenue">₹{(prod.revenue/100000).toFixed(1)}L</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="dashboard-widget-card">
            <div className="widget-title-box"><h3>Quick actions</h3></div>
            <div className="quick-actions-row">
              <button onClick={() => navigate('/my-store/blogs')}>New Blog</button>
              <button onClick={() => navigate('/my-store/coupons')}>Create Coupon</button>
              <button onClick={() => navigate('/my-store/analytics')}>Analytics</button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
