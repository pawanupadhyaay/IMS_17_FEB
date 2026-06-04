import { useState, useEffect, useContext } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import storeAdminService from '../../services/storeAdminService';
import './MyStoreLayout.css';

const MyStoreLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [counts, setCounts] = useState({ orders: 0, queries: 0, reviews: 0 });

  const fetchCounts = async () => {
    try {
      const res = await storeAdminService.getNotificationCounts();
      if (res.success) {
        setCounts(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch counts');
    }
  };

  useEffect(() => {
    const isOwner = user?.role === 'Owner' || user?.role === 'owner';
    if (isOwner) {
      fetchCounts();
      const interval = setInterval(fetchCounts, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  // If the user navigates away from Reviews, we might want to re-fetch, but interval is enough.
  // Actually, whenever location changes, we can do a quick fetch to clear badges if they were read.
  useEffect(() => {
    const isOwner = user?.role === 'Owner' || user?.role === 'owner';
    if (isOwner) fetchCounts();
  }, [location.pathname]);

  // Close sidebar on navigation (mobile)
  const handleNavClick = () => {
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const isOwner = user?.role === 'Owner' || user?.role === 'owner';
  const isStaff = user?.role === 'staff' || user?.role === 'Staff';

  // Strict protection: Only Owners can access this section
  if (!isOwner) {
    return (
      <div className="unauthorized-access">
        <h2>Unauthorized Access</h2>
        <p>You do not have permission to view the store administration panel.</p>
        <button onClick={() => navigate('/dashboard')}>Return to IMS</button>
      </div>
    );
  }

  const menuItems = [
    { name: 'Dashboard', path: '/my-store/dashboard' },
    { name: 'Analytics', path: '/my-store/analytics' },
    { name: 'Orders', path: '/my-store/orders' },
    { name: 'Discounts & Coupons', path: '/my-store/coupons' },
    { name: 'Blogs', path: '/my-store/blogs' },
    { name: 'Reviews', path: '/my-store/reviews' },
    { name: 'Customers', path: '/my-store/customers' },
    { name: 'Queries', path: '/my-store/queries' },
  ];

  if (isOwner) {
    menuItems.push({ name: 'My Staffs', path: '/my-store/staffs' });
  }

  return (
    <div className={`store-admin-layout ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      {/* Top Navigation */}
      <header className="store-admin-header">
        <div className="header-left">
          <button 
            className="hamburger-btn" 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label="Toggle Menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isSidebarOpen ? (
                <path d="M18 6 6 18M6 6l12 12"/>
              ) : (
                <path d="M4 12h16M4 6h16M4 18h16"/>
              )}
            </svg>
          </button>
          <div className="store-admin-brand" onClick={() => navigate('/my-store/dashboard')}>
            <div className="store-brand-text">
              <h2>Samay Admin</h2>
              <span>Dashboard</span>
            </div>
          </div>
        </div>
        <div className="store-header-actions">
          <span className="badge-live desktop-only">Live</span>
          <button className="btn-outline" onClick={() => window.open('https://samaywatch.com', '_blank')}>View Store</button>
          <button className="btn-outline" onClick={logout}>Logout</button>
          <button className="btn-ims" onClick={() => navigate('/dashboard')}>IMS</button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="store-admin-body">
        {/* Sidebar */}
        <aside className={`store-sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <nav className="store-nav">
            {menuItems.map((item) => {
              let badgeCount = 0;
              if (item.name === 'Orders') badgeCount = counts.orders;
              if (item.name === 'Reviews') badgeCount = counts.reviews;
              if (item.name === 'Queries') badgeCount = counts.queries;

              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={({ isActive }) => `store-nav-item ${isActive ? 'active' : ''}`}
                  onClick={handleNavClick}
                >
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    {item.name}
                    {badgeCount > 0 && (
                      <span style={{
                        background: '#ef4444', 
                        color: 'white', 
                        fontSize: '0.7rem', 
                        padding: '2px 6px', 
                        borderRadius: '10px',
                        fontWeight: 'bold',
                        lineHeight: '1'
                      }}>
                        {badgeCount}
                      </span>
                    )}
                  </span>
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {/* Mobile Overlay */}
        {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

        {/* Page Content */}
        <main className="store-main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MyStoreLayout;
