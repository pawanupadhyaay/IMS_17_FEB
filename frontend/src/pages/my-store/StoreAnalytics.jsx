import { useState, useEffect, useMemo } from 'react';
import storeAdminService from '../../services/storeAdminService';
import './StoreAnalytics.css';

// ─────────────────────────────────────────────────────────────
// Demo data generator (30-day realistic dataset)
// ─────────────────────────────────────────────────────────────
const generateDemoOrders = () => {
  const statuses = ['delivered', 'delivered', 'delivered', 'shipped', 'shipped', 'processing', 'pending', 'cancelled'];
  const products = [
    { title: 'Tissot PRX Powermatic 80',          brand: 'TISSOT',   price: 68000  },
    { title: 'Rado Captain Cook Automatic',        brand: 'RADO',     price: 230000 },
    { title: 'Longines HydroConquest Blue Dial',   brand: 'LONGINES', price: 185000 },
    { title: 'Seiko Presage Cocktail Time',        brand: 'SEIKO',    price: 42000  },
    { title: 'Balmain Heritage Chrono',            brand: 'BALMAIN',  price: 115000 },
    { title: 'Citizen Promaster Diver',            brand: 'CITIZEN',  price: 32000  },
    { title: 'Tag Heuer Carrera Calibre',          brand: 'TAG HEUER',price: 320000 },
    { title: 'Omega Seamaster 300m',               brand: 'OMEGA',    price: 450000 },
  ];
  const customers = [
    'Rajesh Malhotra', 'Priya Sen', 'Vikram Aditya', 'Ananya Roy',
    'Kabir Mehta', 'Sneha Gupta', 'Arjun Nair', 'Divya Sharma',
    'Rohan Kapoor', 'Pooja Iyer',
  ];
  const orders = [];
  const now = new Date();
  for (let i = 0; i < 80; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(Math.floor(Math.random() * 23), Math.floor(Math.random() * 60), 0, 0);
    const prod = products[Math.floor(Math.random() * products.length)];
    const qty  = Math.random() > 0.8 ? 2 : 1;
    orders.push({
      _id: `D${i}`, orderId: `SMY-2026-${8700 + i}`,
      createdAt: d.toISOString(),
      totalAmount: prod.price * qty,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      items: [{ product: { title: prod.title, brand: prod.brand }, qty }],
      user: { name: customers[i % customers.length], email: `user${i}@example.com` },
    });
  }
  return orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};
const DEMO_ORDERS_ALL = generateDemoOrders();

// ─────────────────────────────────────────────────────────────
// Pure-SVG Chart Components
// ─────────────────────────────────────────────────────────────
const LineChart = ({ data, color = '#c6a74e', height = 180 }) => {
  const [tooltip, setTooltip] = useState(null);
  if (!data.length) return null;
  const W = 500, H = height;
  const maxV = Math.max(...data.map(d => d.val), 1);
  const pts = data.map((d, i) => ({
    x: 40 + i * ((W - 60) / (data.length - 1 || 1)),
    y: 20 + (1 - d.val / maxV) * (H - 40),
    ...d,
  }));
  let path = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const cpX1 = pts[i].x + 28, cpX2 = pts[i + 1].x - 28;
    path += ` C ${cpX1} ${pts[i].y}, ${cpX2} ${pts[i+1].y}, ${pts[i+1].x} ${pts[i+1].y}`;
  }
  const area = `${path} L ${pts[pts.length-1].x} ${H-10} L ${pts[0].x} ${H-10} Z`;
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" overflow="visible">
        <defs>
          <linearGradient id={`lg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.2, 0.4, 0.6, 0.8].map((f, i) => (
          <line key={i} x1="40" x2={W-20} y1={20 + f*(H-40)} y2={20 + f*(H-40)} stroke="#f1f5f9" strokeWidth="1" />
        ))}
        <path d={area} fill={`url(#lg-${color.replace('#','')})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 4px 8px ${color}40)` }} />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="5" fill="white" stroke={color} strokeWidth="2.5"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setTooltip(p)}
            onMouseLeave={() => setTooltip(null)} />
        ))}
      </svg>
      {tooltip && (
        <div className="an-tooltip" style={{ left: `${(tooltip.x / W) * 100}%`, top: `${(tooltip.y / H) * 100}%` }}>
          <strong>{tooltip.label}</strong>
          <span>₹{tooltip.val.toLocaleString('en-IN')}</span>
        </div>
      )}
      <div className="an-x-labels">
        {pts.map((p, i) => (
          <span key={i} className="an-x-label" style={{ left: `${(p.x / W) * 100}%` }}>{p.label}</span>
        ))}
      </div>
    </div>
  );
};

const BarChart = ({ data, color = '#c6a74e', maxOverride }) => {
  const [tooltip, setTooltip] = useState(null);
  if (!data.length) return null;
  const W = 500, H = 180;
  const maxV = maxOverride || Math.max(...data.map(d => d.val), 1);
  const gap = 6;
  const barW = (W - 40) / data.length - gap;
  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto">
        {[0.25, 0.5, 0.75, 1].map((f, i) => (
          <line key={i} x1="30" x2={W} y1={H - 30 - f*(H-50)} y2={H - 30 - f*(H-50)} stroke="#f1f5f9" strokeWidth="1" />
        ))}
        {data.map((d, i) => {
          const barH = Math.max((d.val / maxV) * (H - 50), 2);
          const x = 35 + i * (barW + gap);
          const y = H - 30 - barH;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} fill={color} rx="4" opacity="0.85"
                style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                onMouseEnter={() => setTooltip({ ...d, x: x + barW / 2, y })}
                onMouseLeave={() => setTooltip(null)} />
              <text x={x + barW / 2} y={H - 14} textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="700">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      {tooltip && (
        <div className="an-tooltip" style={{ left: `${(tooltip.x / W) * 100}%`, top: `${(tooltip.y / H) * 100}%` }}>
          <strong>{tooltip.label}</strong>
          <span>{typeof tooltip.val === 'number' && tooltip.val > 1000 ? `₹${tooltip.val.toLocaleString('en-IN')}` : tooltip.val}</span>
        </div>
      )}
    </div>
  );
};

const HBarChart = ({ data, color = '#c6a74e' }) => {
  const maxV = Math.max(...data.map(d => d.val), 1);
  return (
    <div className="hbar-list">
      {data.map((d, i) => (
        <div key={i} className="hbar-row">
          <span className="hbar-label">{d.label}</span>
          <div className="hbar-track">
            <div className="hbar-fill" style={{ width: `${(d.val / maxV) * 100}%`, background: color }} />
          </div>
          <span className="hbar-value">{typeof d.val === 'number' && d.val > 999 ? `₹${(d.val/100000).toFixed(1)}L` : d.val}</span>
        </div>
      ))}
    </div>
  );
};

const DonutChart = ({ segments }) => {
  const total = segments.reduce((s, g) => s + g.val, 0) || 1;
  const r = 52, cx = 70, cy = 70, circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="an-donut-wrap">
      <svg viewBox="0 0 140 140" width="140" height="140">
        <circle r={r} cx={cx} cy={cy} fill="transparent" stroke="#f1f5f9" strokeWidth="14" />
        {segments.map((seg, i) => {
          const pct = seg.val / total;
          const dash = pct * circ;
          const el = (
            <circle key={i} r={r} cx={cx} cy={cy} fill="transparent"
              stroke={seg.color} strokeWidth="14"
              strokeDasharray={`${dash} ${circ}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} />
          );
          offset += dash;
          return el;
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="18" fontWeight="800" fill="#0f172a">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fontWeight="700" fill="#94a3b8" letterSpacing="1">ORDERS</text>
      </svg>
      <div className="an-donut-legend">
        {segments.map((seg, i) => (
          <div key={i} className="an-legend-row">
            <span className="an-legend-dot" style={{ background: seg.color }} />
            <span className="an-legend-name">{seg.label}</span>
            <span className="an-legend-count">{seg.val}</span>
            <span className="an-legend-pct">{Math.round((seg.val / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Growth Badge
// ─────────────────────────────────────────────────────────────
const GrowthBadge = ({ pct }) => {
  const up = pct >= 0;
  return (
    <span className={`growth-badge ${up ? 'up' : 'down'}`}>
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
    </span>
  );
};

// ─────────────────────────────────────────────────────────────
// Date filter helpers
// ─────────────────────────────────────────────────────────────
const getRange = (filter, custom) => {
  const now = new Date();
  if (filter === 'today') {
    const s = new Date(now); s.setHours(0,0,0,0); return { s, e: new Date() };
  }
  if (filter === 'yesterday') {
    const s = new Date(now); s.setDate(s.getDate()-1); s.setHours(0,0,0,0);
    const e = new Date(s); e.setHours(23,59,59,999); return { s, e };
  }
  if (filter === 'week') {
    const s = new Date(now); s.setDate(s.getDate()-6); s.setHours(0,0,0,0); return { s, e: new Date() };
  }
  if (filter === 'month') {
    const s = new Date(now); s.setDate(s.getDate()-29); s.setHours(0,0,0,0); return { s, e: new Date() };
  }
  if (filter === 'custom' && custom) {
    const s = new Date(custom+'T00:00:00'); const e = new Date(custom+'T23:59:59'); return { s, e };
  }
  return { s: null, e: null };
};

const filterByRange = (orders, filter, custom) => {
  const { s, e } = getRange(filter, custom);
  if (!s) return orders;
  return orders.filter(o => { const d = new Date(o.createdAt); return d >= s && d <= e; });
};

const getPrevRange = (filter, custom) => {
  const { s, e } = getRange(filter, custom);
  if (!s) return { s: null, e: null };
  const diff = e - s;
  return { s: new Date(s - diff), e: new Date(s) };
};

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function StoreAnalytics() {
  const [liveOrders, setLiveOrders] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(true);

  const [quickFilter, setQuickFilter] = useState('week');
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await storeAdminService.getOrders();
        if (res.success && res.data?.length) {
          setLiveOrders(res.data);
          setIsDemoMode(false);
        }
      } catch { /* use demo */ }
      setLoading(false);
    })();
  }, []);

  const sourceOrders = isDemoMode ? DEMO_ORDERS_ALL : liveOrders;

  // Current period orders
  const currOrders = useMemo(() => filterByRange(sourceOrders, quickFilter, selectedDate), [sourceOrders, quickFilter, selectedDate]);

  // Previous period orders (for growth %)
  const prevOrders = useMemo(() => {
    const { s, e } = getPrevRange(quickFilter, selectedDate);
    if (!s) return sourceOrders;
    return sourceOrders.filter(o => { const d = new Date(o.createdAt); return d >= s && d <= e; });
  }, [sourceOrders, quickFilter, selectedDate]);

  // KPIs
  const currRevenue = useMemo(() => currOrders.reduce((s, o) => s + (o.totalAmount || 0), 0), [currOrders]);
  const prevRevenue = useMemo(() => prevOrders.reduce((s, o) => s + (o.totalAmount || 0), 0), [prevOrders]);
  const revenueGrowth = prevRevenue ? ((currRevenue - prevRevenue) / prevRevenue) * 100 : 0;

  const currOrderCount = currOrders.length;
  const prevOrderCount = prevOrders.length;
  const orderGrowth = prevOrderCount ? ((currOrderCount - prevOrderCount) / prevOrderCount) * 100 : 0;

  const currAOV = currOrderCount ? Math.round(currRevenue / currOrderCount) : 0;
  const prevAOV = prevOrderCount ? Math.round(prevRevenue / prevOrderCount) : 0;
  const aovGrowth = prevAOV ? ((currAOV - prevAOV) / prevAOV) * 100 : 0;

  // Delivered rate
  const deliveredCount = currOrders.filter(o => o.status === 'delivered').length;
  const deliveryRate = currOrderCount ? Math.round((deliveredCount / currOrderCount) * 100) : 0;
  const prevDeliveredCount = prevOrders.filter(o => o.status === 'delivered').length;
  const prevDeliveryRate = prevOrderCount ? Math.round((prevDeliveredCount / prevOrderCount) * 100) : 0;
  const deliveryGrowth = prevDeliveryRate ? deliveryRate - prevDeliveryRate : 0;

  // Revenue chart data
  const revenueChartData = useMemo(() => {
    const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
    if (quickFilter === 'today' || quickFilter === 'yesterday' || quickFilter === 'custom') {
      const { s } = getRange(quickFilter, selectedDate);
      if (!s) return [];
      return [0,4,8,12,16,20,22].map((h, i, arr) => {
        const start = new Date(s); start.setHours(h,0,0,0);
        const end = new Date(s); end.setHours(i < arr.length-1 ? arr[i+1] : 24,0,0,0);
        const val = currOrders.filter(o => { const d = new Date(o.createdAt); return d>=start&&d<end; })
          .reduce((sum, o) => sum+(o.totalAmount||0), 0);
        return { label: h < 12 ? `${h===0?12:h}AM` : `${h===12?12:h-12}PM`, val };
      });
    }
    if (quickFilter === 'month') {
      const now = new Date();
      return Array.from({length:7}, (_,i) => {
        const start = new Date(now); start.setDate(start.getDate()-(6-i)*4-3); start.setHours(0,0,0,0);
        const end = new Date(now); end.setDate(end.getDate()-(6-i)*4); end.setHours(23,59,59,999);
        const val = currOrders.filter(o => { const d=new Date(o.createdAt); return d>=start&&d<=end; })
          .reduce((s,o) => s+(o.totalAmount||0), 0);
        return { label: `W${i+1}`, val };
      });
    }
    return Array.from({length:7}, (_,i) => {
      const d = new Date(); d.setDate(d.getDate()-(6-i));
      const ds = d.toISOString().split('T')[0];
      const val = currOrders.filter(o => o.createdAt&&new Date(o.createdAt).toISOString().startsWith(ds))
        .reduce((s,o) => s+(o.totalAmount||0), 0);
      return { label: DAYS[d.getDay()], val };
    });
  }, [currOrders, quickFilter, selectedDate]);

  // Orders count chart (same buckets)
  const ordersChartData = useMemo(() => revenueChartData.map(d => {
    const { s: rangeStart, e: rangeEnd } = getRange(quickFilter, selectedDate);
    return { ...d, val: currOrders.filter(o => {
      const od = new Date(o.createdAt);
      // approximate: just count all in each bucket based on order of revenue chart
      return true;
    }).length }; // we compute properly below
  }), [revenueChartData]);

  // Proper orders count per bucket
  const ordersCountData = useMemo(() => {
    const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
    if (quickFilter === 'today' || quickFilter === 'yesterday' || quickFilter === 'custom') {
      const { s } = getRange(quickFilter, selectedDate);
      if (!s) return [];
      return [0,4,8,12,16,20,22].map((h, i, arr) => {
        const start = new Date(s); start.setHours(h,0,0,0);
        const end = new Date(s); end.setHours(i<arr.length-1?arr[i+1]:24,0,0,0);
        const val = currOrders.filter(o => { const d=new Date(o.createdAt); return d>=start&&d<end; }).length;
        return { label: h<12?`${h===0?12:h}AM`:`${h===12?12:h-12}PM`, val };
      });
    }
    if (quickFilter === 'month') {
      const now = new Date();
      return Array.from({length:7},(_,i)=>{
        const start=new Date(now); start.setDate(start.getDate()-(6-i)*4-3); start.setHours(0,0,0,0);
        const end=new Date(now); end.setDate(end.getDate()-(6-i)*4); end.setHours(23,59,59,999);
        const val=currOrders.filter(o=>{const d=new Date(o.createdAt);return d>=start&&d<=end;}).length;
        return {label:`W${i+1}`,val};
      });
    }
    return Array.from({length:7},(_,i)=>{
      const d=new Date();d.setDate(d.getDate()-(6-i));
      const ds=d.toISOString().split('T')[0];
      const val=currOrders.filter(o=>o.createdAt&&new Date(o.createdAt).toISOString().startsWith(ds)).length;
      return {label:DAYS[d.getDay()],val};
    });
  }, [currOrders, quickFilter, selectedDate]);

  // Status breakdown
  const statusData = useMemo(() => {
    const counts = { delivered: 0, shipped: 0, processing: 0, pending: 0, cancelled: 0 };
    currOrders.forEach(o => { if (counts[o.status] !== undefined) counts[o.status]++; });
    return [
      { label: 'Delivered', val: counts.delivered,  color: '#10b981' },
      { label: 'Shipped',   val: counts.shipped,    color: '#3b82f6' },
      { label: 'Processing',val: counts.processing, color: '#f97316' },
      { label: 'Pending',   val: counts.pending,    color: '#eab308' },
      { label: 'Cancelled', val: counts.cancelled,  color: '#ef4444' },
    ];
  }, [currOrders]);

  // Revenue by day of week (always)
  const revenueByDow = useMemo(() => {
    const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    return DAYS.map((label, i) => ({
      label,
      val: currOrders.filter(o => new Date(o.createdAt).getDay() === i)
        .reduce((s, o) => s + (o.totalAmount || 0), 0),
    }));
  }, [currOrders]);

  // Revenue by hour of day
  const revenueByHour = useMemo(() => {
    const buckets = [
      { label:'Night\n12-6AM', hours:[0,1,2,3,4,5] },
      { label:'Morning\n6-12PM', hours:[6,7,8,9,10,11] },
      { label:'Afternoon\n12-6PM', hours:[12,13,14,15,16,17] },
      { label:'Evening\n6-12AM', hours:[18,19,20,21,22,23] },
    ];
    return buckets.map(b => ({
      label: b.label.split('\n')[0],
      val: currOrders.filter(o => b.hours.includes(new Date(o.createdAt).getHours()))
        .reduce((s, o) => s + (o.totalAmount || 0), 0),
    }));
  }, [currOrders]);

  // Top products by revenue
  const topProductsByRevenue = useMemo(() => {
    const map = {};
    currOrders.forEach(o => {
      const name = o.items?.[0]?.product?.title || 'Unknown';
      map[name] = (map[name] || 0) + (o.totalAmount || 0);
    });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,5)
      .map(([label, val]) => ({ label: label.length > 22 ? label.slice(0,22)+'…' : label, val }));
  }, [currOrders]);

  // Top products by order count
  const topProductsByOrders = useMemo(() => {
    const map = {};
    currOrders.forEach(o => {
      const name = o.items?.[0]?.product?.title || 'Unknown';
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,5)
      .map(([label, val]) => ({ label: label.length > 22 ? label.slice(0,22)+'…' : label, val }));
  }, [currOrders]);

  // Top customers
  const topCustomers = useMemo(() => {
    const map = {};
    currOrders.forEach(o => {
      const name = o.user?.name || 'Unknown';
      if (!map[name]) map[name] = { name, email: o.user?.email || '', spend: 0, orders: 0 };
      map[name].spend  += (o.totalAmount || 0);
      map[name].orders += 1;
    });
    return Object.values(map).sort((a,b)=>b.spend-a.spend).slice(0,5);
  }, [currOrders]);

  const filterLabel = { today:'Today', yesterday:'Yesterday', week:'This Week', month:'This Month', all:'All Time', custom: selectedDate||'Custom' }[quickFilter];

  // ───────────────── Render ─────────────────
  return (
    <div className="an-page">

      {/* Header */}
      <div className="an-page-header">
        <div>
          <p className="an-subtitle">STORE PERFORMANCE</p>
          <h1 className="an-title">Analytics</h1>
          <p className="an-desc">Deep-dive into revenue, orders, products, and customer behaviour.</p>
        </div>
        <div className="an-mode-row">
          <span className={`an-mode-dot ${isDemoMode ? 'demo' : 'live'}`} />
          <span className="an-mode-label">{isDemoMode ? 'Demo Data' : 'Live Data'}</span>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="an-filter-bar">
        <div className="an-filter-pills">
          {[['today','Today'],['yesterday','Yesterday'],['week','This Week'],['month','This Month'],['all','All Time']].map(([k,l])=>(
            <button key={k} className={`an-filter-pill ${quickFilter===k?'active':''}`}
              onClick={()=>{setQuickFilter(k);setSelectedDate('');}}>
              {l}
            </button>
          ))}
        </div>
        <div className="an-date-pick">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <input type="date" className="an-date-input" value={selectedDate}
            max={new Date().toISOString().split('T')[0]}
            onChange={e=>{setSelectedDate(e.target.value);setQuickFilter('custom');}} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="an-kpi-grid">
        <div className="an-kpi-card">
          <div className="an-kpi-top">
            <span className="an-kpi-label">Total Revenue</span>
            <div className="an-kpi-icon" style={{background:'#fdfaf2',color:'#c6a74e'}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            </div>
          </div>
          <div className="an-kpi-val" style={{color:'#10b981'}}>₹{(currRevenue/100000).toFixed(2)}L</div>
          <div className="an-kpi-foot">
            <GrowthBadge pct={revenueGrowth} />
            <span className="an-kpi-vs">vs prev period</span>
          </div>
        </div>

        <div className="an-kpi-card">
          <div className="an-kpi-top">
            <span className="an-kpi-label">Total Orders</span>
            <div className="an-kpi-icon" style={{background:'#fff7ed',color:'#f97316'}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
            </div>
          </div>
          <div className="an-kpi-val">{currOrderCount}</div>
          <div className="an-kpi-foot">
            <GrowthBadge pct={orderGrowth} />
            <span className="an-kpi-vs">vs prev period</span>
          </div>
        </div>

        <div className="an-kpi-card">
          <div className="an-kpi-top">
            <span className="an-kpi-label">Avg Order Value</span>
            <div className="an-kpi-icon" style={{background:'#f0f7ff',color:'#3b82f6'}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            </div>
          </div>
          <div className="an-kpi-val">₹{currAOV.toLocaleString('en-IN')}</div>
          <div className="an-kpi-foot">
            <GrowthBadge pct={aovGrowth} />
            <span className="an-kpi-vs">vs prev period</span>
          </div>
        </div>

        <div className="an-kpi-card">
          <div className="an-kpi-top">
            <span className="an-kpi-label">Delivery Rate</span>
            <div className="an-kpi-icon" style={{background:'#f0fdf4',color:'#10b981'}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          </div>
          <div className="an-kpi-val">{deliveryRate}%</div>
          <div className="an-kpi-foot">
            <GrowthBadge pct={deliveryGrowth} />
            <span className="an-kpi-vs">vs prev period</span>
          </div>
        </div>
      </div>

      {/* Revenue Trend Chart */}
      <div className="an-card">
        <div className="an-card-header">
          <div>
            <h3 className="an-card-title">Revenue Trend</h3>
            <p className="an-card-sub">{filterLabel} · ₹{(currRevenue/100000).toFixed(2)}L total</p>
          </div>
          <span className="an-card-badge gold">Revenue</span>
        </div>
        {revenueChartData.length > 0
          ? <LineChart data={revenueChartData} color="#c6a74e" height={190} />
          : <div className="an-empty">No revenue data for this period</div>}
      </div>

      {/* Orders Volume + Status Breakdown */}
      <div className="an-two-col">
        <div className="an-card">
          <div className="an-card-header">
            <div>
              <h3 className="an-card-title">Order Volume</h3>
              <p className="an-card-sub">{currOrderCount} orders this period</p>
            </div>
            <span className="an-card-badge orange">Orders</span>
          </div>
          <BarChart data={ordersCountData} color="#f97316" />
        </div>

        <div className="an-card">
          <div className="an-card-header">
            <div>
              <h3 className="an-card-title">Order Status</h3>
              <p className="an-card-sub">Fulfillment breakdown</p>
            </div>
            <span className="an-card-badge blue">Status</span>
          </div>
          <DonutChart segments={statusData} />
        </div>
      </div>

      {/* Revenue by Day of Week + Time of Day */}
      <div className="an-two-col">
        <div className="an-card">
          <div className="an-card-header">
            <div>
              <h3 className="an-card-title">Revenue by Day</h3>
              <p className="an-card-sub">Which days drive most sales</p>
            </div>
            <span className="an-card-badge gold">Weekday</span>
          </div>
          <HBarChart data={revenueByDow} color="#c6a74e" />
        </div>

        <div className="an-card">
          <div className="an-card-header">
            <div>
              <h3 className="an-card-title">Revenue by Time</h3>
              <p className="an-card-sub">Peak shopping hours</p>
            </div>
            <span className="an-card-badge blue">Hours</span>
          </div>
          <BarChart data={revenueByHour} color="#3b82f6" />
        </div>
      </div>

      {/* Product Performance */}
      <div className="an-two-col">
        <div className="an-card">
          <div className="an-card-header">
            <div>
              <h3 className="an-card-title">Top Products by Revenue</h3>
              <p className="an-card-sub">Highest grossing watches</p>
            </div>
            <span className="an-card-badge green">Revenue</span>
          </div>
          {topProductsByRevenue.length
            ? <HBarChart data={topProductsByRevenue} color="#10b981" />
            : <div className="an-empty">No product data for this period</div>}
        </div>

        <div className="an-card">
          <div className="an-card-header">
            <div>
              <h3 className="an-card-title">Top Products by Orders</h3>
              <p className="an-card-sub">Most frequently ordered</p>
            </div>
            <span className="an-card-badge orange">Volume</span>
          </div>
          {topProductsByOrders.length
            ? <HBarChart data={topProductsByOrders} color="#f97316" />
            : <div className="an-empty">No product data for this period</div>}
        </div>
      </div>

      {/* Top Customers */}
      <div className="an-card">
        <div className="an-card-header">
          <div>
            <h3 className="an-card-title">Top Customers</h3>
            <p className="an-card-sub">Highest-value buyers this period</p>
          </div>
          <span className="an-card-badge blue">Customers</span>
        </div>
        {topCustomers.length ? (
          <div className="an-customers-table-wrap">
            <table className="an-customers-table">
              <thead>
                <tr><th>#</th><th>Customer</th><th>Orders</th><th>Total Spend</th><th>Avg Order</th></tr>
              </thead>
              <tbody>
                {topCustomers.map((c, i) => (
                  <tr key={i}>
                    <td className="an-rank">{i + 1}</td>
                    <td>
                      <div className="an-cust-name">{c.name}</div>
                      <div className="an-cust-email">{c.email}</div>
                    </td>
                    <td><span className="an-order-count">{c.orders}</span></td>
                    <td className="an-spend">₹{c.spend.toLocaleString('en-IN')}</td>
                    <td className="an-aov">₹{Math.round(c.spend / c.orders).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="an-empty">No customer data for this period</div>
        )}
      </div>

      {/* Revenue Comparison Bar */}
      <div className="an-card">
        <div className="an-card-header">
          <div>
            <h3 className="an-card-title">Period Comparison</h3>
            <p className="an-card-sub">Current vs previous period</p>
          </div>
        </div>
        <div className="an-comparison-grid">
          {[
            { label:'Revenue', curr: currRevenue, prev: prevRevenue, fmt: v=>`₹${(v/100000).toFixed(2)}L` },
            { label:'Orders',  curr: currOrderCount, prev: prevOrderCount, fmt: v=>v },
            { label:'Avg Order Value', curr: currAOV, prev: prevAOV, fmt: v=>`₹${v.toLocaleString('en-IN')}` },
            { label:'Delivery Rate', curr: deliveryRate, prev: prevDeliveryRate, fmt: v=>`${v}%` },
          ].map((m, i) => {
            const maxV = Math.max(m.curr, m.prev, 1);
            return (
              <div key={i} className="an-comp-item">
                <span className="an-comp-label">{m.label}</span>
                <div className="an-comp-bars">
                  <div className="an-comp-bar-wrap">
                    <div className="an-comp-bar curr" style={{width:`${(m.curr/maxV)*100}%`}} />
                    <span className="an-comp-val">{m.fmt(m.curr)}</span>
                  </div>
                  <div className="an-comp-bar-wrap">
                    <div className="an-comp-bar prev" style={{width:`${(m.prev/maxV)*100}%`}} />
                    <span className="an-comp-val muted">{m.fmt(m.prev)}</span>
                  </div>
                </div>
                <GrowthBadge pct={m.prev ? ((m.curr - m.prev) / m.prev) * 100 : 0} />
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
