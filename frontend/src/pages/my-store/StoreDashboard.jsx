import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import storeAdminService from '../../services/storeAdminService';
import './StoreDashboard.css';

// ─────────────────────────────────────────────────────────────
// SVG Icons
// ─────────────────────────────────────────────────────────────
const CalIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const ChevronDown = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>
);
const BoxIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);
const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const AlertIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const BagIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);
const EditIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const TruckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

// ─────────────────────────────────────────────────────────────
// Demo Data (rich 30-day dataset)
// ─────────────────────────────────────────────────────────────
const generateDemoOrders = () => {
  const statuses = ['delivered', 'delivered', 'delivered', 'shipped', 'shipped', 'processing', 'pending', 'cancelled'];
  const products = [
    { title: 'Tissot PRX Powermatic 80', price: 68000 },
    { title: 'Rado Captain Cook Automatic', price: 230000 },
    { title: 'Longines HydroConquest Blue Dial', price: 185000 },
    { title: 'Seiko Presage Cocktail Time', price: 42000 },
    { title: 'Balmain Heritage Chrono', price: 115000 },
    { title: 'Citizen Promaster Diver', price: 32000 },
    { title: 'Tag Heuer Carrera Calibre', price: 320000 },
    { title: 'Omega Seamaster 300m', price: 450000 },
  ];
  const customers = [
    { name: 'Rajesh Malhotra', email: 'rajesh@example.com' },
    { name: 'Priya Sen', email: 'priya.sen@outlook.com' },
    { name: 'Vikram Aditya', email: 'vikram.aditya@gmail.com' },
    { name: 'Ananya Roy', email: 'ananya.roy@yahoo.com' },
    { name: 'Kabir Mehta', email: 'kabir.mehta@hotmail.com' },
    { name: 'Sneha Gupta', email: 'sneha.gupta@gmail.com' },
    { name: 'Arjun Nair', email: 'arjun.nair@gmail.com' },
    { name: 'Divya Sharma', email: 'divya.sharma@yahoo.com' },
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
    const qty = Math.random() > 0.85 ? 2 : 1;
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
  return orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};
const ALL_DEMO_ORDERS = generateDemoOrders();

const DEMO_STATS = { activeProductsCount: 38, liveUsers: 14, lowStockCount: 2 };
const DEMO_POPULAR = [
  { title: 'Tissot PRX Powermatic 80', brand: 'TISSOT', sales: 42, revenue: 2856000, img: 'https://res.cloudinary.com/dz6ndhyus/image/upload/v1779287501/samay_assets/hydroconquest-l3-781-3-78-9-detailed-view-1333x2000-2-073d4a_ccml7u.jpg' },
  { title: 'Rado Captain Cook Automatic', brand: 'RADO', sales: 26, revenue: 5980000, img: 'https://res.cloudinary.com/dz6ndhyus/image/upload/v1779287501/samay_assets/hydroconquest-l3-781-3-78-9-detailed-view-1333x2000-2-073d4a_ccml7u.jpg' },
  { title: 'Longines HydroConquest Blue Dial', brand: 'LONGINES', sales: 18, revenue: 3330000, img: 'https://res.cloudinary.com/dz6ndhyus/image/upload/v1779287501/samay_assets/hydroconquest-l3-781-3-78-9-detailed-view-1333x2000-2-073d4a_ccml7u.jpg' },
];
const INITIAL_LIVE_ACTIVITIES = [
  { id: 1, text: 'Customer from <strong>Mumbai</strong> added <i>Seiko Presage</i> to cart', type: 'green', time: 'Just now' },
  { id: 2, text: 'Visitor from <strong>New Delhi</strong> viewed <i>Tissot PRX Powermatic</i>', type: 'blue', time: '2 mins ago' },
  { id: 3, text: 'Order processed for <strong>SMY-2026-8742</strong> (₹1,85,000)', type: 'orange', time: '5 mins ago' },
  { id: 4, text: 'Customer from <strong>Kolkata</strong> completed signup verification', type: 'blue', time: '12 mins ago' },
  { id: 5, text: 'Visitor from <strong>Bangalore</strong> initiated checkout flow', type: 'green', time: '18 mins ago' },
];
const ACTIVITY_TEMPLATES = [
  { text: 'Visitor from <strong>Ahmedabad</strong> viewed <i>Rado Captain Cook</i>', type: 'blue' },
  { text: 'Customer from <strong>Pune</strong> added <i>Balmain Heritage</i> to cart', type: 'green' },
  { text: 'New support ticket opened: <i>"Order tracking help"</i>', type: 'orange' },
  { text: 'Visitor from <strong>Hyderabad</strong> viewed <i>Citizen Promaster</i>', type: 'blue' },
  { text: 'Live shopper from <strong>Chennai</strong> added <i>Longines Spirit</i> to bag', type: 'green' },
];

// ─────────────────────────────────────────────────────────────
// Date range presets
// ─────────────────────────────────────────────────────────────
const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
  { key: 'month', label: 'This month' },
  { key: 'lastmonth', label: 'Last month' },
  { key: 'custom', label: 'Custom range' },
];

const computeRange = (preset, customStart, customEnd) => {
  const now = new Date();
  const today = (offset = 0) => {
    const d = new Date(now); d.setDate(d.getDate() - offset); d.setHours(0, 0, 0, 0); return d;
  };
  const eod = (d) => { const e = new Date(d); e.setHours(23, 59, 59, 999); return e; };
  switch (preset) {
    case 'today': return { start: today(), end: new Date() };
    case 'yesterday': return { start: today(1), end: eod(today(1)) };
    case '7d': return { start: today(6), end: new Date() };
    case '30d': return { start: today(29), end: new Date() };
    case '90d': return { start: today(89), end: new Date() };
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
        return { start: new Date(customStart + 'T00:00:00'), end: new Date(customEnd + 'T23:59:59') };
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

const fmtDate = (d) => d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

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
    const cx1 = pts[i].x + (pts[i + 1].x - pts[i].x) * 0.4;
    const cx2 = pts[i + 1].x - (pts[i + 1].x - pts[i].x) * 0.4;
    path += ` C ${cx1} ${pts[i].y}, ${cx2} ${pts[i + 1].y}, ${pts[i + 1].x} ${pts[i + 1].y}`;
  }
  const area = `${path} L ${pts[pts.length - 1].x} ${height} L 0 ${height} Z`;
  return (
    <svg width={width} height={height} style={{ overflow: 'visible', flexShrink: 0 }}>
      <defs>
        <linearGradient id={`sp-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sp-${color.slice(1)})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────
// Dual Line Chart (current + prev period)
// ─────────────────────────────────────────────────────────────
const DualLineChart = ({ currData, prevData, currLabel, prevLabel, activeTab }) => {
  const [tooltip, setTooltip] = useState(null);
  const W = 540, H = 220, PL = 55, PB = 30;
  const allVals = [...currData.map(d => d.val), ...prevData.map(d => d.val)];
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
      const cx1 = pts[i].x + (pts[i + 1].x - pts[i].x) / 3;
      const cx2 = pts[i].x + 2 * (pts[i + 1].x - pts[i].x) / 3;
      p += ` C ${cx1} ${pts[i].y}, ${cx2} ${pts[i + 1].y}, ${pts[i + 1].x} ${pts[i + 1].y}`;
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
      <div style={{ position: 'relative', width: '100%' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" overflow="visible">
          <defs>
            <linearGradient id="currGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#008060" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#008060" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Grid lines */}
          {yLabels.map((l, i) => (
            <g key={i}>
              <line x1={PL} x2={W - 10} y1={l.y} y2={l.y} stroke="#f4f6f8" strokeWidth="1" />
              <text x={PL - 6} y={l.y + 4} textAnchor="end" fontSize="10" fill="#94a3b8" fontWeight="600">
                {activeTab === 'sales' || activeTab === 'aov'
                  ? (l.val >= 100000 ? `₹${(l.val / 100000).toFixed(1)}L` : l.val >= 1000 ? `₹${(l.val / 1000).toFixed(0)}K` : `₹${l.val}`)
                  : l.val
                }
              </text>
            </g>
          ))}
          {/* Filled area under current */}
          {currPath && (
            <path d={`${currPath} L ${currPts[currPts.length - 1].x} ${H - PB} L ${currPts[0].x} ${H - PB} Z`} fill="url(#currGrad)" />
          )}
          {/* Previous period — dashed */}
          {prevPath && <path d={prevPath} fill="none" stroke="#008060" strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" opacity="0.4" />}
          {/* Current period — solid */}
          {currPath && (
            <path d={currPath} fill="none" stroke="#008060" strokeWidth="2.5" strokeLinecap="round"
              style={{ filter: 'drop-shadow(0 3px 8px rgba(0,128,96,0.15))' }} />
          )}
          {/* Nodes */}
          {currPts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={N > 15 ? "2" : "4"} fill="white" stroke="#008060" strokeWidth="2.5"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setTooltip({ ...p, idx: i })}
              onMouseLeave={() => setTooltip(null)} />
          ))}
          {/* X labels - automatically spaced to prevent overlap */}
          {currPts.map((p, i) => {
            const shouldRender = N <= 8 || i === 0 || i === N - 1 || i % Math.round(N / 5) === 0;
            if (!shouldRender) return null;
            return (
              <text key={i} x={p.x} y={H - 8} textAnchor="middle" fontSize="10" fill="#94a3b8" fontWeight="700">
                {p.day}
              </text>
            );
          })}
        </svg>
        {/* Tooltip */}
        {tooltip && (
          <div className="chart-tooltip" style={{
            left: `${(tooltip.x / W) * 100}%`,
            top: `${(tooltip.y / H) * 100}%`,
          }}>
            <p style={{ margin: 0, fontWeight: 700 }}>
              {tooltip.day}: {activeTab === 'sales' || activeTab === 'aov' ? `₹${tooltip.val.toLocaleString('en-IN')}` : tooltip.val}
            </p>
            {prevData[tooltip.idx] && (
              <p style={{ margin: '2px 0 0', opacity: 0.7, fontWeight: 600, fontSize: 11 }}>
                Prev: {activeTab === 'sales' || activeTab === 'aov' ? `₹${prevData[tooltip.idx].val.toLocaleString('en-IN')}` : prevData[tooltip.idx].val}
              </p>
            )}
          </div>
        )}
      </div>
      {/* Legend */}
      <div className="chart-legend-row" style={{ justifyContent: 'center', marginTop: '10px' }}>
        <span className="chart-legend-item curr">
          <span className="chart-legend-dot curr-dot" />
          {currLabel}
        </span>
        <span className="chart-legend-item prev">
          <span className="chart-legend-dot prev-dot" />
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
  const [tempStart, setTempStart] = useState(customStart);
  const [tempEnd, setTempEnd] = useState(customEnd);
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
    ? `${fmtDate(new Date(customStart + 'T00:00:00'))} – ${fmtDate(new Date(customEnd + 'T23:59:59'))}`
    : PRESETS.find(p => p.key === preset)?.label || 'Last 30 days';

  return (
    <div className="drp-wrap" ref={ref}>
      <button className="drp-btn" onClick={() => setOpen(!open)}>
        <CalIcon />
        <span>{label}</span>
        <ChevronDown />
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
                    onChange={e => setTempStart(e.target.value)} />
                </div>
                <div className="drp-custom-field">
                  <label>End date</label>
                  <input type="date" value={tempEnd} min={tempStart} max={new Date().toISOString().split('T')[0]}
                    onChange={e => setTempEnd(e.target.value)} />
                </div>
              </div>
            ) : (
              <div className="drp-preview">
                <div className="drp-preview-icon"><CalIcon /></div>
                <p className="drp-preview-range">
                  {fmtDate(computeRange(tempPreset).start)} — {fmtDate(computeRange(tempPreset).end)}
                </p>
                <p className="drp-preview-label">{PRESETS.find(p => p.key === tempPreset)?.label}</p>
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
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [liveOrders, setLiveOrders] = useState([]);
  const [liveStats, setLiveStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  // Interactive Shopify Tabs
  const [activeTab, setActiveTab] = useState('sales'); // 'sales', 'orders', 'aov', 'shoppers'

  // Date range
  const [preset, setPreset] = useState('30d');
  const [customStart, setCustomStart] = useState(
    new Date(new Date().setDate(new Date().getDate() - 29)).toISOString().split('T')[0]
  );
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().split('T')[0]);

  // Live widgets
  const [liveShoppers, setLiveShoppers] = useState(14);
  const [isEditingShoppers, setIsEditing] = useState(false);
  const [tempShoppers, setTempShoppers] = useState(14);
  const [liveActivities, setLiveActivities] = useState(INITIAL_LIVE_ACTIVITIES);
  const [chartTooltip, setChartTooltip] = useState(null);

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
  const baseStats = isDemoMode ? DEMO_STATS : (liveStats || DEMO_STATS);

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
  const currRevenue = useMemo(() => currOrders.reduce((s, o) => s + (o.total || o.totalAmount || 0), 0), [currOrders]);
  const prevRevenue = useMemo(() => prevOrders.reduce((s, o) => s + (o.total || o.totalAmount || 0), 0), [prevOrders]);
  const revenueGrowth = prevRevenue ? ((currRevenue - prevRevenue) / prevRevenue) * 100 : null;

  const currCount = currOrders.length;
  const prevCount = prevOrders.length;
  const orderGrowth = prevCount ? ((currCount - prevCount) / prevCount) * 100 : null;

  const currAOV = currCount ? Math.round(currRevenue / currCount) : 0;
  const prevAOV = prevCount ? Math.round(prevRevenue / prevCount) : 0;
  const aovGrowth = prevAOV ? ((currAOV - prevAOV) / prevAOV) * 100 : null;

  const pendingFulfill = useMemo(
    () => currOrders.filter(o => ['pending', 'processing'].includes(o.orderStatus || o.status)).length,
    [currOrders]
  );

  // ── Chart points count matching Shopify density
  const chartPointsCount = useMemo(() => {
    if (preset === '30d') return 30;
    if (preset === '90d') return 30;
    if (preset === '7d') return 7;
    if (preset === 'today' || preset === 'yesterday') return 24;

    const start = new Date(customStart);
    const end = new Date(customEnd);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    if (diffDays <= 1) return 24;
    if (diffDays <= 7) return 7;
    return Math.min(diffDays, 30);
  }, [preset, customStart, customEnd]);

  // ── Chart data builder
  const buildData = (orders, start, end, N = 7, metric = 'sales') => {
    if (!start) return [];
    const diff = (end - start) / N;
    const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return Array.from({ length: N }, (_, i) => {
      const s = new Date(start.getTime() + i * diff);
      const e = new Date(start.getTime() + (i + 1) * diff - 1);
      const matched = orders.filter(o => { const d = new Date(o.createdAt); return d >= s && d <= e; });

      let val = 0;
      if (metric === 'sales') {
        val = matched.reduce((sum, o) => sum + (o.total || o.totalAmount || 0), 0);
      } else if (metric === 'orders') {
        val = matched.length;
      } else if (metric === 'aov') {
        const rev = matched.reduce((sum, o) => sum + (o.total || o.totalAmount || 0), 0);
        val = matched.length ? Math.round(rev / matched.length) : 0;
      } else {
        // Live shoppers (simulated timeline wave)
        val = Math.max(1, Math.round(liveShoppers + Math.sin(i * 1.2) * 3 + (Math.sin(i * 0.4) * 2)));
      }

      // label: if span > 5 days → day name, else hour
      const spanDays = (end - start) / 86400000;
      let day;
      if (spanDays > 5) {
        day = s.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      } else if (spanDays > 0.5) {
        day = DAYS[s.getDay()];
      } else {
        const h = s.getHours();
        day = h < 12 ? `${h || 12}AM` : `${h === 12 ? 12 : h - 12}PM`;
      }
      return { day, val };
    });
  };

  // ── Sparklines (Always 7 points for tiny display)
  const sparkBuckets = useMemo(() => buildData(currOrders, currStart, currEnd, 7, 'sales'), [currOrders, currStart, currEnd]);
  const sparkRevData = useMemo(() => sparkBuckets.map(b => b.val), [sparkBuckets]);
  const sparkOrdData = useMemo(() => {
    const diff = (currEnd - currStart) / 7;
    return Array.from({ length: 7 }, (_, i) => {
      const s = new Date(currStart.getTime() + i * diff);
      const e = new Date(currStart.getTime() + (i + 1) * diff - 1);
      return currOrders.filter(o => { const d = new Date(o.createdAt); return d >= s && d <= e; }).length;
    });
  }, [currOrders, currStart, currEnd]);

  // ── Dual chart data
  const currChartData = useMemo(() => buildData(currOrders, currStart, currEnd, chartPointsCount, activeTab), [currOrders, currStart, currEnd, chartPointsCount, activeTab]);
  const prevChartData = useMemo(() => buildData(prevOrders, prevStart, prevEnd, chartPointsCount, activeTab).map((d, i) => ({ ...d, day: currChartData[i]?.day || d.day })), [prevOrders, prevStart, prevEnd, chartPointsCount, currChartData, activeTab]);

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

  const [isDrpOpen, setIsDrpOpen] = useState(false);
  const drpRef = useRef(null);

  // Close DateRangePicker on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (drpRef.current && !drpRef.current.contains(e.target)) {
        setIsDrpOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div className="store-dashboard-shopify-layout">
      {apiError && (
        <div className="api-error-banner" style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1000 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Using demo mockup data.
        </div>
      )}

      {/* Left Sidebar - Shopify-style Page Filters */}
      <div className="dashboard-left-sidebar">
        <span className="sidebar-channel-label">All channels</span>

        {/* Minimalist Date Picker */}
        <div className="drp-wrap" ref={drpRef}>
          <button className="drp-minimal-btn" onClick={() => setIsDrpOpen(!isDrpOpen)}>
            {preset === 'custom' ? `${customStart} to ${customEnd}` : preset === '30d' ? 'Last 30 days' : preset === '7d' ? 'Last 7 days' : preset === 'today' ? 'Today' : 'Yesterday'}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px' }}>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {isDrpOpen && (
            <div className="drp-panel" style={{ left: 0, right: 'auto' }}>
              <div className="drp-sidebar">
                {[['today', 'Today'], ['yesterday', 'Yesterday'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days'], ['custom', 'Custom Range']].map(([k, l]) => (
                  <button key={k} className={`drp-preset ${preset === k ? 'active' : ''}`} onClick={() => { if (k !== 'custom') { setPreset(k); setIsDrpOpen(false); } else { setPreset('custom'); } }}>{l}</button>
                ))}
              </div>
              {preset === 'custom' && (
                <div className="drp-body">
                  <div className="drp-custom-inputs">
                    <div className="drp-custom-field">
                      <label>Start Date</label>
                      <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} />
                    </div>
                    <div className="drp-custom-field">
                      <label>End Date</label>
                      <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                    </div>
                  </div>
                  <div className="drp-actions">
                    <button className="drp-cancel" onClick={() => setIsDrpOpen(false)}>Cancel</button>
                    <button className="drp-apply" onClick={() => setIsDrpOpen(false)}>Apply</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live / Demo toggle at the bottom of the sidebar */}
        <div className="mode-toggle-container-minimal">
          <span className={`mode-label ${!isDemoMode ? 'active' : ''}`} style={{ fontSize: '10px' }}>Live</span>
          <label className="switch-control" style={{ width: '34px', height: '18px' }}>
            <input type="checkbox" checked={isDemoMode} onChange={() => setIsDemoMode(!isDemoMode)} />
            <span className="switch-slider" style={{ borderRadius: '18px' }} />
          </label>
          <span className={`mode-label ${isDemoMode ? 'active' : ''}`} style={{ fontSize: '10px' }}>Demo</span>
        </div>
      </div>

      {/* Right Content Area */}
      <div className="dashboard-right-content">
        {/* Top Header Row with Live Visitors */}
        <div className="dashboard-right-header">
          <div className="live-visitors-indicator">
            <span>Live visitors</span>
            <span className="live-visitors-count">{liveShoppers}</span>
            <span className="live-pulse-dot" />
          </div>
        </div>

        {/* ── Shopify-style Tabbed KPI Chart Card ── */}
        <div className="kpi-summary-card">
          <div className="kpi-summary-grid">

            <div className={`kpi-metric-col ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}>
              <div className="kpi-metric-top">
                <span className="kpi-metric-label">Total Sales</span>
                <div className="kpi-metric-val-row">
                  <span className="kpi-metric-val">₹{(currRevenue / 100000).toFixed(2)}L</span>
                  <GrowthTag pct={revenueGrowth} />
                </div>
              </div>
              <Sparkline data={sparkRevData} color="#008060" />
            </div>

            <div className={`kpi-metric-col ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
              <div className="kpi-metric-top">
                <span className="kpi-metric-label">Orders</span>
                <div className="kpi-metric-val-row">
                  <span className="kpi-metric-val">{currCount}</span>
                  <GrowthTag pct={orderGrowth} />
                </div>
              </div>
              <Sparkline data={sparkOrdData} color="#2c6ecb" />
            </div>

            <div className={`kpi-metric-col ${activeTab === 'aov' ? 'active' : ''}`} onClick={() => setActiveTab('aov')}>
              <div className="kpi-metric-top">
                <span className="kpi-metric-label">Avg Order Value</span>
                <div className="kpi-metric-val-row">
                  <span className="kpi-metric-val">₹{currAOV.toLocaleString('en-IN')}</span>
                  <GrowthTag pct={aovGrowth} />
                </div>
              </div>
              <Sparkline data={sparkRevData.map((v, i) => (sparkOrdData[i] ? Math.round(v / sparkOrdData[i]) : 0))} color="#108043" />
            </div>

            <div className={`kpi-metric-col ${activeTab === 'shoppers' ? 'active' : ''}`} onClick={() => setActiveTab('shoppers')}>
              <div className="kpi-metric-top">
                <span className="kpi-metric-label">Conversion Rate</span>
                <div className="kpi-metric-val-row">
                  <span className="kpi-metric-val">0.46%</span>
                  <GrowthTag pct={-17} />
                </div>
              </div>
              <Sparkline data={[4, 5, 3, 6, 4, 5, 5]} color="#f49342" />
            </div>

          </div>

          {/* Shopify-style Active Tab Header */}
          <div style={{ padding: '1.25rem 1.5rem 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#6d7175' }}>
              {activeTab === 'sales' ? 'Total sales over time' : activeTab === 'orders' ? 'Orders over time' : activeTab === 'aov' ? 'Average order value over time' : 'Conversion rate over time'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 600, color: '#202223', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                {activeTab === 'sales' ? `₹${(currRevenue / 100000).toFixed(2)}L` : activeTab === 'orders' ? currCount : activeTab === 'aov' ? `₹${currAOV.toLocaleString('en-IN')}` : '0.46%'}
              </span>
              <GrowthTag pct={activeTab === 'sales' ? revenueGrowth : activeTab === 'orders' ? orderGrowth : activeTab === 'aov' ? aovGrowth : -17} />
            </div>
          </div>

          {/* Dual comparison chart */}
          <DualLineChart
            currData={currChartData}
            prevData={prevChartData}
            currLabel={currLabel}
            prevLabel={prevLabel}
            activeTab={activeTab}
          />
        </div>
      </div>
    </div>
  );
}
