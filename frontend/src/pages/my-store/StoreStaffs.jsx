import { useState, useEffect } from 'react';
import storeAdminService from '../../services/storeAdminService';
import { getBrands } from '../../services/productService';
import { getDisplayBrand } from '../../utils/brandUtils';
import './StoreDashboard.css';
import './StoreAdminTables.css';
import './StoreStaffs.css'; // New CSS file for modal and staff specific styles

const StoreStaffs = () => {
  const [staffs, setStaffs] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [currentStaff, setCurrentStaff] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    hasSeoAccess: false,
    allowedBrands: [],
    canEditProducts: true,
    canViewStats: true,
    canEditBasicInfo: true,
    canEditSeo: true,
    canAccessFilters: true
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchStaffs = async () => {
    try {
      const res = await storeAdminService.getStaffs();
      if (res.success) setStaffs(res.data);
    } catch (error) {
      console.error('Failed to fetch staffs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBrands = async () => {
    try {
      const res = await getBrands();
      if (res.success) setBrands(res.data || []);
    } catch (err) {
      console.error('Failed to fetch brands:', err);
    }
  };

  useEffect(() => {
    fetchStaffs();
    fetchBrands();
  }, []);

  const handleOpenModal = (mode, staff = null) => {
    setModalMode(mode);
    setCurrentStaff(staff);
    if (mode === 'edit' && staff) {
      setFormData({
        name: staff.name,
        email: staff.email,
        mobile: staff.mobile || '',
        password: '', // Don't show password, allow change only if provided
        hasSeoAccess: staff.hasSeoAccess || false,
        allowedBrands: staff.allowedBrands || [],
        canEditProducts: staff.canEditProducts ?? true,
        canViewStats: staff.canViewStats ?? true,
        canEditBasicInfo: staff.canEditBasicInfo ?? true,
        canEditSeo: staff.canEditSeo ?? true,
        canAccessFilters: staff.canAccessFilters ?? true
      });
    } else {
      setFormData({
        name: '',
        email: '',
        mobile: '',
        password: '',
        hasSeoAccess: false,
        allowedBrands: [],
        canEditProducts: true,
        canViewStats: true,
        canEditBasicInfo: true,
        canEditSeo: true,
        canAccessFilters: true
      });
    }
    setError('');
    setSuccess('');
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setError('');
    setSuccess('');
  };

  const handleDeleteStaff = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete the staff account for "${name}"? This action cannot be undone.`)) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      const res = await storeAdminService.deleteStaff(id);
      if (res.success) {
        setSuccess(`Staff "${name}" deleted successfully!`);
        fetchStaffs();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete staff member');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (modalMode === 'add') {
        const res = await storeAdminService.createStaff(formData);
        if (res.success) {
          setSuccess('Staff created successfully!');
          fetchStaffs();
          setTimeout(handleCloseModal, 1500);
        }
      } else {
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password;
        const res = await storeAdminService.updateStaff(currentStaff._id, updateData);
        if (res.success) {
          setSuccess('Staff updated successfully!');
          fetchStaffs();
          setTimeout(handleCloseModal, 1500);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    }
  };

  if (loading) return <div className="store-loading">Loading Staff Data...</div>;

  return (
    <div className="store-dashboard">
      <div className="store-page-header">
        <div className="page-title-box">
          <p className="page-subtitle">MANAGEMENT</p>
          <h1>Staff Members</h1>
          <p className="page-desc">Add and manage staff accounts who can access your IMS dashboard.</p>
        </div>
        <div className="page-actions">
          <button className="btn-primary" onClick={() => handleOpenModal('add')}>+ Create Staff</button>
        </div>
      </div>

      <div className="store-table-container">
        <div className="store-table-header">
          <div>
            <h3>Active Staff List</h3>
            <p>Direct login accounts associated with your store</p>
          </div>
          <button className="btn-outline" onClick={fetchStaffs}>Refresh</button>
        </div>
        
        {staffs.length === 0 ? (
          <div className="store-empty">
            <div className="empty-icon">👥</div>
            <h3>No staff members found</h3>
            <p>Start by adding your first staff member to help manage your store.</p>
            <button className="btn-primary" onClick={() => handleOpenModal('add')} style={{marginTop: '1rem'}}>Add Staff</button>
          </div>
        ) : (
          <table className="store-table">
            <colgroup>
              <col className="col-staff-name" />
              <col className="col-staff-email" />
              <col className="col-staff-mobile" />
              <col className="col-staff-permissions" />
              <col className="col-staff-date" />
              <col className="col-staff-actions" />
            </colgroup>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Permissions Summary</th>
                <th>Joined On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staffs.map((staff) => (
                <tr key={staff._id}>
                  <td data-label="Staff Profile">
                    <div className="staff-info-cell">
                      <div className="avatar-circle">
                        {staff.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="staff-details">
                        <span className="staff-name">{staff.name}</span>
                        <span className="staff-role-badge">Staff</span>
                      </div>
                    </div>
                  </td>
                  <td data-label="Email">{staff.email}</td>
                  <td data-label="Mobile">{staff.mobile || '-'}</td>
                  <td className="permissions-cell" data-label="Permissions Summary">
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <span className="badge-standard" style={{ backgroundColor: '#f1f5f9', color: '#334155', fontWeight: 'bold' }}>
                        {staff.allowedBrands && staff.allowedBrands.length > 0
                          ? `Brands: ${staff.allowedBrands.map(b => getDisplayBrand(b)).join(', ')}`
                          : 'Brands: All'}
                      </span>
                      <span className="badge-standard" style={{ backgroundColor: staff.canEditProducts !== false ? '#dcfce7' : '#fee2e2', color: staff.canEditProducts !== false ? '#15803d' : '#b91c1c' }}>
                        {staff.canEditProducts !== false ? 'Can Edit Products' : 'View Only'}
                      </span>
                      <span className="badge-standard" style={{ backgroundColor: staff.canViewStats !== false ? '#e0f2fe' : '#f1f5f9', color: staff.canViewStats !== false ? '#0369a1' : '#64748b' }}>
                        {staff.canViewStats !== false ? 'Stats: Visible' : 'Stats: Hidden'}
                      </span>
                      <span className="badge-standard" style={{ backgroundColor: staff.canEditBasicInfo !== false ? '#fef9c3' : '#f1f5f9', color: staff.canEditBasicInfo !== false ? '#a16207' : '#64748b' }}>
                        {staff.canEditBasicInfo !== false ? 'Basic Info: Edit' : 'Basic Info: Read-only'}
                      </span>
                      <span className="badge-standard" style={{ backgroundColor: staff.canEditSeo !== false ? '#fae8ff' : '#f1f5f9', color: staff.canEditSeo !== false ? '#a21caf' : '#64748b' }}>
                        {staff.canEditSeo !== false ? 'SEO: Edit' : 'SEO: Hidden'}
                      </span>
                      <span className="badge-standard" style={{ backgroundColor: staff.canAccessFilters !== false ? '#e2e8f0' : '#f1f5f9', color: staff.canAccessFilters !== false ? '#1e293b' : '#64748b' }}>
                        {staff.canAccessFilters !== false ? 'Filters: Enabled' : 'Filters: Disabled'}
                      </span>
                    </div>
                  </td>
                  <td data-label="Joined On">{new Date(staff.createdAt).toLocaleDateString('en-GB')}</td>
                  <td className="actions-cell">
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center' }}>
                      <button className="action-link" onClick={() => handleOpenModal('edit', staff)} title="Edit Account" style={{ fontSize: '1.2rem', padding: '4px' }}>✏️</button>
                      <button className="action-link delete-link" onClick={() => handleDeleteStaff(staff._id, staff.name)} title="Delete Account" style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', padding: '4px', fontSize: '1.2rem' }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="staff-modal-overlay">
          <div className="staff-modal">
            <div className="staff-modal-header">
              <h2>{modalMode === 'add' ? 'Add New Staff' : 'Edit Staff Account'}</h2>
              <button className="close-icon-btn" onClick={handleCloseModal}>&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="staff-form">
              {error && <div className="form-error">{error}</div>}
              {success && <div className="form-success">{success}</div>}
              
              <div className="form-row">
                <div className="form-field">
                  <label>Full Name</label>
                  <input 
                    type="text" 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    placeholder="e.g. Rahul Sharma" 
                    required 
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Email Address</label>
                  <input 
                    type="email" 
                    name="email" 
                    value={formData.email} 
                    onChange={handleChange} 
                    placeholder="staff@yourstore.com" 
                    required 
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Mobile Number</label>
                  <input 
                    type="text" 
                    name="mobile" 
                    value={formData.mobile} 
                    onChange={handleChange} 
                    placeholder="10 digit mobile number" 
                    required 
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>
                    {modalMode === 'add' ? 'Set Login Password' : 'Change Password (optional)'}
                  </label>
                  <div className="password-input-wrapper">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      name="password" 
                      value={formData.password} 
                      onChange={handleChange} 
                      placeholder={modalMode === 'add' ? "Assign a secure password" : "Leave blank to keep current"} 
                      required={modalMode === 'add'} 
                      minLength="6"
                    />
                    <button 
                      type="button" 
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? "👁️‍🗨️" : "👁️"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-row" style={{ marginTop: '10px', marginBottom: '15px' }}>
                <div className="form-field">
                  <label style={{ marginBottom: '8px', display: 'block', fontWeight: 'bold' }}>Allowed Brands Access Whitelist</label>
                  <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                    Select which brands this staff member can view/edit. Uncheck all to grant access to ALL brands.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', maxHeight: '150px', overflowY: 'auto' }}>
                    {brands.map((brand) => {
                      const isChecked = formData.allowedBrands.includes(brand);
                      return (
                        <label key={brand} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#334155', cursor: 'pointer', margin: 0 }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const updated = e.target.checked
                                ? [...formData.allowedBrands, brand]
                                : formData.allowedBrands.filter(b => b !== brand);
                              setFormData({ ...formData, allowedBrands: updated });
                            }}
                            style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                          />
                          <span>{getDisplayBrand(brand)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="form-row" style={{ marginBottom: '20px' }}>
                <div className="form-field">
                  <label style={{ marginBottom: '8px', display: 'block', fontWeight: 'bold' }}>Permissions Matrix</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13.5px', color: '#1e293b', cursor: 'pointer', margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={formData.canEditProducts}
                        onChange={(e) => setFormData({ ...formData, canEditProducts: e.target.checked })}
                        style={{ width: '17px', height: '17px', cursor: 'pointer', marginTop: '2px' }}
                      />
                      <div>
                        <strong>Can Create & Edit Products</strong>
                        <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>If unchecked, user runs in View-Only mode (cannot add/edit/delete products).</div>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13.5px', color: '#1e293b', cursor: 'pointer', margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={formData.canViewStats}
                        onChange={(e) => setFormData({ ...formData, canViewStats: e.target.checked })}
                        style={{ width: '17px', height: '17px', cursor: 'pointer', marginTop: '2px' }}
                      />
                      <div>
                        <strong>Can View Dashboard Stats</strong>
                        <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>If unchecked, main stats cards (Total Products, Value, Stock) are hidden.</div>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13.5px', color: '#1e293b', cursor: 'pointer', margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={formData.canEditBasicInfo}
                        onChange={(e) => setFormData({ ...formData, canEditBasicInfo: e.target.checked })}
                        style={{ width: '17px', height: '17px', cursor: 'pointer', marginTop: '2px' }}
                      />
                      <div>
                        <strong>Can Edit Basic Information</strong>
                        <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>If unchecked, details modal fields (Title, Brand, Price, Dial Color, etc.) are read-only.</div>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13.5px', color: '#1e293b', cursor: 'pointer', margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={formData.canEditSeo}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setFormData({ ...formData, canEditSeo: val, hasSeoAccess: val });
                        }}
                        style={{ width: '17px', height: '17px', cursor: 'pointer', marginTop: '2px' }}
                      />
                      <div>
                        <strong>Can Manage SEO details</strong>
                        <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>If unchecked, search engine preview and SEO inputs are completely hidden.</div>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13.5px', color: '#1e293b', cursor: 'pointer', margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={formData.canAccessFilters}
                        onChange={(e) => setFormData({ ...formData, canAccessFilters: e.target.checked })}
                        style={{ width: '17px', height: '17px', cursor: 'pointer', marginTop: '2px' }}
                      />
                      <div>
                        <strong>Can Access Search Filters & Sorting</strong>
                        <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>If unchecked, search bars, brand selectors, sorting, and date filters are hidden/disabled.</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="form-info-box">
                <span className="info-icon">ℹ️</span>
                <p>Staff members can login using their email and the password you set here.</p>
              </div>

              <div className="form-footer">
                <button type="button" className="btn-cancel" onClick={handleCloseModal}>Cancel</button>
                <button type="submit" className="btn-save">
                  {modalMode === 'add' ? 'Create Staff Account' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreStaffs;
