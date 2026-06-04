import { useState, useEffect } from 'react';
import storeAdminService from '../../services/storeAdminService';
import './StoreDashboard.css';
import './StoreAdminTables.css';
import './StoreCustomers.css'; // New CSS file for traffic bars

const StoreCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = async () => {
    try {
      const res = await storeAdminService.getCustomers();
      if (res.success) setCustomers(res.data);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const totalCustomers = customers.length;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const newCustomers = customers.filter(c => new Date(c.createdAt) > thirtyDaysAgo).length;

  // Placeholder Traffic Data (To be connected to real tracking later)
  const trafficData = {
    google: 42,
    facebook: 72,
    instagram: 1197,
    direct: 821,
    other: 79,
  };
  const totalTraffic = Object.values(trafficData).reduce((a, b) => a + b, 0);

  if (loading) return <div className="store-loading">Loading Performance Data...</div>;

  return (
    <div className="store-dashboard">
      <div className="store-page-header">
        <div className="page-title-box">
          <p className="page-subtitle">PERFORMANCE MARKETING</p>
          <h1>Traffic & Customers</h1>
          <p className="page-desc">Monitor store traffic sources, conversion rates, and registered user acquisition.</p>
        </div>
        <div className="page-actions">
          <div className="date-picker-placeholder">
            FROM <strong>20-02-2026</strong> TO <strong>22-03-2026</strong>
          </div>
          <button className="btn-outline">Export</button>
        </div>
      </div>

      <div className="store-metrics-grid">
        <div className="metric-card">
          <p className="metric-label">TOTAL SESSIONS</p>
          <h2>{totalTraffic}</h2>
        </div>
        <div className="metric-card">
          <p className="metric-label">REGISTERED CUSTOMERS</p>
          <h2>{totalCustomers}</h2>
        </div>
        <div className="metric-card">
          <p className="metric-label">NEW (LAST 30 DAYS)</p>
          <h2 style={{color: '#00b86b'}}>{newCustomers}</h2>
        </div>
        <div className="metric-card">
          <p className="metric-label">CONVERSION RATE</p>
          <h2 className="revenue-text">
            {totalTraffic > 0 ? ((totalCustomers / totalTraffic) * 100).toFixed(1) : 0}%
          </h2>
        </div>
      </div>

      <div className="performance-grid">
        {/* Traffic Sources Box */}
        <div className="traffic-card">
          <h3>Traffic Sources</h3>
          <div className="traffic-list">
            <div className="traffic-item">
              <span className="source-label"><span className="dot google"></span> Google</span>
              <div className="bar-bg"><div className="bar-fill blue" style={{ width: `${(trafficData.google/totalTraffic)*100}%` }}></div></div>
              <span className="source-value">{trafficData.google}</span>
            </div>
            <div className="traffic-item">
              <span className="source-label"><span className="dot facebook"></span> Facebook</span>
              <div className="bar-bg"><div className="bar-fill dark-blue" style={{ width: `${(trafficData.facebook/totalTraffic)*100}%` }}></div></div>
              <span className="source-value">{trafficData.facebook}</span>
            </div>
            <div className="traffic-item">
              <span className="source-label"><span className="dot instagram"></span> Instagram</span>
              <div className="bar-bg"><div className="bar-fill pink" style={{ width: `${(trafficData.instagram/totalTraffic)*100}%` }}></div></div>
              <span className="source-value">{trafficData.instagram}</span>
            </div>
            <div className="traffic-item">
              <span className="source-label"><span className="dot direct"></span> Direct</span>
              <div className="bar-bg"><div className="bar-fill green" style={{ width: `${(trafficData.direct/totalTraffic)*100}%` }}></div></div>
              <span className="source-value">{trafficData.direct}</span>
            </div>
            <div className="traffic-item">
              <span className="source-label"><span className="dot other"></span> Other</span>
              <div className="bar-bg"><div className="bar-fill gray" style={{ width: `${(trafficData.other/totalTraffic)*100}%` }}></div></div>
              <span className="source-value">{trafficData.other}</span>
            </div>
          </div>
        </div>

        {/* Traffic vs Units Chart Box (Placeholder for Recharts or similar) */}
        <div className="traffic-card">
          <div style={{display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-start'}}>
             <div>
                <h3>Traffic vs Registered Users</h3>
                <p style={{fontSize:'0.75rem', color:'#888', marginTop:'0.25rem'}}>HEIGHT: VISITORS | NUMBER: REGISTRATIONS</p>
             </div>
             <div className="date-badge">2026-02-20 - 2026-03-22</div>
          </div>
          <div className="chart-placeholder">
            {/* Visual proxy for the bar chart in the screenshot */}
            <div className="chart-bars">
                <div className="chart-col"><div className="chart-bar tall" style={{height:'80%'}}></div><span className="chart-val">17</span></div>
                <div className="chart-col"><div className="chart-bar medium" style={{height:'60%'}}></div><span className="chart-val">30</span></div>
                <div className="chart-col"><div className="chart-bar short" style={{height:'20%'}}></div><span className="chart-val">0</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="store-table-container">
        <div className="store-table-header">
          <div>
            <h3>Retained Customers Database</h3>
            <p>List of successfully registered e-commerce users</p>
          </div>
          <button className="btn-outline" onClick={fetchCustomers}>Refresh</button>
        </div>
        
        {customers.length === 0 ? (
          <div className="store-empty">No customers found.</div>
        ) : (
          <table className="store-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Registered On</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        {customer.name?.charAt(0) || 'U'}
                      </div>
                      <strong>{customer.name}</strong>
                    </div>
                  </td>
                  <td>{customer.email}</td>
                  <td>{customer.mobile || '-'}</td>
                  <td>{new Date(customer.createdAt).toLocaleDateString('en-GB')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default StoreCustomers;
