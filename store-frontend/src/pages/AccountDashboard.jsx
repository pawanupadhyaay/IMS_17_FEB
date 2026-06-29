import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { 
  Package, User as UserIcon, Heart, LogOut, ChevronRight, MapPin, Clock, Save, 
  Loader2, CheckCircle2, AlertCircle, ArrowLeft, Check, Truck, CreditCard, 
  Download, Phone, ShieldAlert, HelpCircle, Plus, Trash2, Edit3, MessageSquare, Key, ShieldCheck, X
} from 'lucide-react';
import storeOrderService from '../services/storeOrderService';
import authService from '../services/authService';
import storeQueryService from '../services/storeQueryService';
import { downloadInvoice } from '../utils/invoiceGenerator';

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal',
];

export default function AccountDashboard() {
  const { user, setUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('orders'); // orders, profile, wishlist, help
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Shiprocket Live Tracking State
  const [trackingInfo, setTrackingInfo] = useState(null);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [trackingError, setTrackingError] = useState('');

  // Fetch live tracking details from Shiprocket
  useEffect(() => {
    if (selectedOrder) {
      const fetchTracking = async () => {
        try {
          setLoadingTracking(true);
          setTrackingError('');
          setTrackingInfo(null);
          const res = await storeOrderService.getOrderTracking(selectedOrder._id);
          if (res.success) {
            setTrackingInfo(res);
          } else {
            setTrackingError(res.message || 'Could not fetch tracking data');
          }
        } catch (err) {
          setTrackingError(err.response?.data?.message || 'Failed to retrieve shipment updates');
        } finally {
          setLoadingTracking(false);
        }
      };
      fetchTracking();
    } else {
      setTrackingInfo(null);
    }
  }, [selectedOrder]);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    mobile: user?.mobile || ''
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Saved Addresses State
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressForm, setAddressForm] = useState({
    fullName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    isDefault: false
  });
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressFormError, setAddressFormError] = useState('');
  const [submittingAddress, setSubmittingAddress] = useState(false);
  const [isPincodeLoading, setIsPincodeLoading] = useState(false);

  // Change Password State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Support Queries / Help State
  const [queries, setQueries] = useState([]);
  const [loadingQueries, setLoadingQueries] = useState(false);
  const [queryForm, setQueryForm] = useState({ message: '' });
  const [submittingQuery, setSubmittingQuery] = useState(false);
  const [querySuccess, setQuerySuccess] = useState(false);
  const [queryError, setQueryError] = useState('');

  // Fetch addresses
  const fetchAddresses = async () => {
    try {
      setLoadingAddresses(true);
      const res = await authService.getAddresses();
      if (res.success) {
        setAddresses(res.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch addresses:", err);
    } finally {
      setLoadingAddresses(false);
    }
  };

  // Fetch support tickets
  const fetchQueries = async () => {
    try {
      setLoadingQueries(true);
      const res = await storeQueryService.getMyQueries();
      if (res.success) {
        setQueries(res.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch queries:", err);
    } finally {
      setLoadingQueries(false);
    }
  };

  // Tab activation fetches
  useEffect(() => {
    if (user) {
      if (activeTab === 'profile') {
        fetchAddresses();
      } else if (activeTab === 'help') {
        fetchQueries();
      }
    }
  }, [user, activeTab]);

  // Auto-fill City & State from Pincode in Profile Address Modal
  useEffect(() => {
    const pin = addressForm.pincode ? String(addressForm.pincode).trim() : '';
    if (pin.length === 6 && /^\d{6}$/.test(pin)) {
      const fetchLocation = async () => {
        setIsPincodeLoading(true);
        try {
          const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
          const data = await res.json();
          if (data[0] && data[0].Status === 'Success' && data[0].PostOffice?.[0]) {
            const info = data[0].PostOffice[0];
            const fetchedCity = info.District || info.Block || '';
            const fetchedState = info.State || '';
            const matchedState = STATES.find(s => s.toLowerCase() === fetchedState.toLowerCase()) || fetchedState;

            setAddressForm(prev => ({
              ...prev,
              city: fetchedCity || prev.city,
              state: matchedState || prev.state
            }));
          }
        } catch (err) {
          console.warn('Auto-pincode resolution skipped.');
        } finally {
          setIsPincodeLoading(false);
        }
      };
      fetchLocation();
    }
  }, [addressForm.pincode]);

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    setAddressFormError('');
    
    const { fullName, addressLine1, city, state, pincode, phone } = addressForm;
    if (!fullName.trim() || !addressLine1.trim() || !city.trim() || !state || !pincode.trim() || !phone.trim()) {
      setAddressFormError('Please fill in all required fields');
      return;
    }
    if (!/^\d{6}$/.test(pincode.trim())) {
      setAddressFormError('Please enter a valid 6-digit pincode');
      return;
    }
    if (!/^\d{10}$/.test(phone.trim())) {
      setAddressFormError('Please enter a valid 10-digit mobile number');
      return;
    }

    try {
      setSubmittingAddress(true);
      if (editingAddressId) {
        const res = await authService.updateAddress(editingAddressId, addressForm);
        if (res.success) {
          setAddresses(res.data);
          setShowAddressModal(false);
        }
      } else {
        const res = await authService.addAddress(addressForm);
        if (res.success) {
          setAddresses(res.data);
          setShowAddressModal(false);
        }
      }
    } catch (err) {
      setAddressFormError(err.response?.data?.message || 'Failed to save address');
    } finally {
      setSubmittingAddress(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm("Are you sure you want to delete this address?")) return;
    try {
      const res = await authService.deleteAddress(id);
      if (res.success) {
        setAddresses(res.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete address');
    }
  };

  const handleSetDefaultAddress = async (id) => {
    try {
      const res = await authService.updateAddress(id, { isDefault: true });
      if (res.success) {
        setAddresses(res.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to set default address');
    }
  };

  const handleAddNewAddressClick = () => {
    setAddressForm({
      fullName: user?.name || '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      pincode: '',
      phone: user?.mobile || '',
      isDefault: false
    });
    setEditingAddressId(null);
    setAddressFormError('');
    setShowAddressModal(true);
  };

  const handleEditAddressClick = (addr) => {
    setAddressForm({
      fullName: addr.fullName,
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2 || '',
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      phone: addr.phone,
      isDefault: addr.isDefault
    });
    setEditingAddressId(addr._id);
    setAddressFormError('');
    setShowAddressModal(true);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    try {
      setChangingPassword(true);
      const res = await authService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });

      if (res.success) {
        setPasswordSuccess(true);
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSubmitQuery = async (e) => {
    e.preventDefault();
    setQueryError('');
    setQuerySuccess(false);

    if (!queryForm.message.trim()) {
      setQueryError('Please type a message');
      return;
    }

    try {
      setSubmittingQuery(true);
      const nameParts = user.name.split(' ');
      const firstName = nameParts[0] || 'Customer';
      const lastName = nameParts.slice(1).join(' ') || '';

      const res = await storeQueryService.submitQuery({
        firstName,
        lastName,
        email: user.email,
        mobile: user.mobile || '0000000000',
        message: queryForm.message,
        type: 'ticket',
        userId: user._id
      });

      if (res.success) {
        setQuerySuccess(true);
        setQueryForm({ message: '' });
        fetchQueries();
      }
    } catch (err) {
      setQueryError(err.response?.data?.message || 'Failed to submit support ticket');
    } finally {
      setSubmittingQuery(false);
    }
  };

  // Sync form when user data is available
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name,
        mobile: user.mobile || ''
      });
    }
  }, [user]);
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    // Validation: 10 digits
    if (!/^\d{10}$/.test(profileForm.mobile)) {
      setProfileError('Mobile number must be exactly 10 digits');
      return;
    }
    
    try {
      setSavingProfile(true);
      setProfileError('');
      setProfileSuccess(false);
      
      const res = await authService.updateProfile(profileForm);
      if (res.success) {
        setUser(res.user);
        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 3000);
      }
    } catch (error) {
      setProfileError(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  // Reset selected order details sub-view on tab change
  useEffect(() => {
    setSelectedOrder(null);
  }, [activeTab]);

  const handleDownloadInvoice = (order) => {
    const mappedOrder = {
      orderId: order.orderNumber || order._id,
      amount: order.total,
      subtotal: order.subtotal,
      discount: Math.max(0, order.subtotal - order.total + (order.shipping || 0)),
      date: new Date(order.paidAt || order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }),
      items: order.items.map(item => ({
        title: item.product?.title || item.name,
        price: item.price,
        qty: item.quantity,
        product: item.product,
        image: item.image || item.product?.images?.[0]
      })),
      shippingAddress: {
        fullName: order.shippingAddress?.fullName || order.shippingAddress?.name || 'Valued Customer',
        addressLine1: order.shippingAddress?.addressLine1 || order.shippingAddress?.address || '',
        addressLine2: order.shippingAddress?.addressLine2 || '',
        city: order.shippingAddress?.city || '',
        pincode: order.shippingAddress?.pincode || order.shippingAddress?.zip || '',
        state: order.shippingAddress?.state || ''
      }
    };
    downloadInvoice(mappedOrder);
  };

  const renderOrderDetail = (order) => {
    const discount = Math.max(0, order.subtotal - order.total + (order.shipping || 0));
    
    const statusSteps = [
      { label: 'Ordered', status: 'pending', date: order.createdAt },
      { label: 'Confirmed', status: 'confirmed', date: order.paidAt || order.createdAt },
      { label: 'Shipped', status: 'shipped', date: null },
      { label: 'Delivered', status: 'delivered', date: null }
    ];

    const getStepIndex = (status) => {
      const statusMap = {
        'pending': 0,
        'confirmed': 1,
        'processing': 1,
        'shipped': 2,
        'out_for_delivery': 2,
        'delivered': 3,
        'cancelled': -1
      };
      return statusMap[status] ?? 0;
    };

    const currentStepIndex = getStepIndex(order.orderStatus);
    const isCancelled = order.orderStatus === 'cancelled';

    return (
      <div className="space-y-8 animate-fadeIn">
        {/* Top action bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-100">
          <button 
            onClick={() => setSelectedOrder(null)}
            className="flex items-center gap-2 text-sm font-bold text-neutral-600 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to My Orders</span>
          </button>
          <button
            onClick={() => handleDownloadInvoice(order)}
            className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-xs font-bold text-neutral-800 hover:bg-neutral-50 active:scale-95 transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Invoice</span>
          </button>
        </div>

        {/* Meta details bar */}
        <div className="bg-neutral-50 rounded-xl p-4 sm:p-6 border border-neutral-100 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-neutral-500 font-medium text-[10px] uppercase tracking-wider mb-1">Order Placed</p>
            <p className="text-xs sm:text-sm font-semibold text-neutral-800">
              {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div>
            <p className="text-neutral-500 font-medium text-[10px] uppercase tracking-wider mb-1">Order ID</p>
            <p className="text-xs sm:text-sm font-black text-neutral-900">{order.orderNumber || `#ORD-${order._id.slice(-6).toUpperCase()}`}</p>
          </div>
          <div>
            <p className="text-neutral-500 font-medium text-[10px] uppercase tracking-wider mb-1">Ship To</p>
            <p className="text-xs sm:text-sm font-semibold text-neutral-800 truncate max-w-[120px]" title={order.shippingAddress?.fullName || order.shippingAddress?.name}>
              {order.shippingAddress?.fullName || order.shippingAddress?.name || 'Valued Customer'}
            </p>
          </div>
          <div>
            <p className="text-neutral-500 font-medium text-[10px] uppercase tracking-wider mb-1">Total</p>
            <p className="text-xs sm:text-sm font-black text-neutral-900">₹{order.total?.toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* Visual Tracking Progress Timeline */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          <div className="flex items-center justify-between mb-8 border-b border-neutral-100 pb-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Delivery Progress</h3>
            {(trackingInfo || order.awbCode) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-black text-white shadow-sm">
                <Truck className="w-3 h-3 text-gold" />
                {trackingInfo?.status || (order.orderStatus === 'shipped' ? 'In Transit' : order.orderStatus === 'out_for_delivery' ? 'Out for Delivery' : order.orderStatus === 'delivered' ? 'Delivered' : 'Processing')}
              </span>
            )}
          </div>

          {/* Custom Tracking / Courier details if dispatched outside Shiprocket */}
          {order.awbCode && (
            <div className="mb-6 p-4 rounded-xl bg-neutral-50 border border-neutral-100 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase text-neutral-400 tracking-wider">Courier Partner</p>
                <p className="text-xs font-bold text-neutral-800">{order.courierName || 'Custom Partner'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase text-neutral-400 tracking-wider">AWB Number</p>
                <p className="text-xs font-black text-neutral-900 tracking-wider">{order.awbCode}</p>
              </div>
              {order.trackingUrl && (
                <a 
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-black px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white hover:bg-neutral-800 transition-all active:scale-95 shadow-sm"
                >
                  <Truck className="w-3.5 h-3.5 text-gold" />
                  Track on Courier Website
                </a>
              )}
            </div>
          )}
          
          {isCancelled ? (
            <div className="flex items-center gap-4 p-4 bg-red-50 rounded-xl border border-red-100 text-red-700">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <div>
                <p className="text-sm font-bold">This order has been Cancelled</p>
                <p className="text-xs text-red-500 mt-0.5 font-medium">Please contact support or concierge at orders@samaywatch.in if you require assistance.</p>
              </div>
            </div>
          ) : loadingTracking ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-neutral-900 animate-spin" />
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest animate-pulse">Fetching live tracking updates...</p>
            </div>
          ) : trackingInfo && trackingInfo.trackingSteps && trackingInfo.trackingSteps.length > 0 ? (
            /* Shiprocket Live Tracking Timeline */
            <div className="relative py-2 space-y-8">
              {/* Connecting vertical line */}
              <div className="absolute left-[11px] top-4 bottom-4 w-[2px] bg-neutral-100 rounded-full" />

              {trackingInfo.trackingSteps.map((step, idx) => {
                const isCompleted = step.status === 'completed';
                const isCurrent = step.status === 'in-transit' || (!isCompleted && idx === 0) || (idx > 0 && trackingInfo.trackingSteps[idx - 1].status === 'completed' && step.status !== 'completed');

                return (
                  <div key={idx} className="relative flex gap-4 items-start animate-fadeIn">
                    {/* Visual Node Pin (aligned with vertical line) */}
                    <div className="z-10 shrink-0 w-6 h-6 flex items-center justify-center">
                      {isCompleted ? (
                        <div className="w-6 h-6 rounded-full bg-black border-2 border-black flex items-center justify-center text-white shadow-md">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : isCurrent ? (
                        <div className="w-6 h-6 rounded-full bg-white border-2 border-neutral-900 flex items-center justify-center text-neutral-900 ring-4 ring-neutral-100 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-black" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-white border-2 border-neutral-200 flex items-center justify-center text-neutral-300">
                          <span className="w-2 h-2 rounded-full bg-neutral-200" />
                        </div>
                      )}
                    </div>

                    {/* Step description detail */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <p className={`text-[12px] font-black uppercase tracking-wider ${isCompleted || isCurrent ? 'text-black font-extrabold' : 'text-neutral-400'}`}>
                          {step.activity}
                        </p>
                        {step.date && (
                          <span className="text-[10px] text-neutral-400 font-semibold">
                            {new Date(step.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-medium text-neutral-500 mt-1 uppercase tracking-wide">
                        {step.location || 'Hub Facility'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Fallback Original Static Progress Timeline */
            <div className="relative pt-4 pb-4 px-2">
              {/* Horizontal Line behind steps */}
              <div className="absolute top-[36px] left-[12.5%] right-[12.5%] h-[2px] bg-neutral-100 -translate-y-1/2 hidden md:block rounded-full">
                <div 
                  className="h-full bg-black transition-all duration-500 rounded-full"
                  style={{ width: `${(Math.max(0, currentStepIndex) / 3) * 100}%` }}
                />
              </div>

              {/* Vertical Line for mobile */}
              <div className="absolute left-[36px] top-[36px] bottom-[36px] w-[2px] bg-neutral-100 md:hidden rounded-full">
                <div 
                  className="w-full bg-black transition-all duration-500 rounded-full"
                  style={{ height: `${(Math.max(0, currentStepIndex) / 3) * 100}%` }}
                />
              </div>

              {/* Timeline Steps */}
              <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8 md:gap-4">
                {statusSteps.map((step, idx) => {
                  const isCompleted = idx <= currentStepIndex;
                  const isCurrent = idx === currentStepIndex;
                  
                  return (
                    <div key={idx} className="flex md:flex-col items-center gap-4 md:gap-3 md:text-center flex-1 relative z-10 w-full md:w-auto">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 shrink-0 ${
                        isCompleted 
                          ? 'bg-black border-black text-white shadow-md' 
                          : isCurrent 
                            ? 'bg-white border-black text-black ring-4 ring-neutral-100 font-extrabold' 
                            : 'bg-white border-neutral-200 text-neutral-300 font-medium'
                      }`}>
                        {isCompleted ? (
                          <Check className="w-5 h-5 stroke-[2.5]" />
                        ) : (
                          <span className="text-xs font-bold">{idx + 1}</span>
                        )}
                      </div>

                      <div>
                        <p className={`text-[11px] font-black uppercase tracking-widest ${
                          isCompleted ? 'text-black font-extrabold' : 'text-neutral-400'
                        }`}>
                          {step.label}
                        </p>
                        {step.date && isCompleted && (
                          <p className="text-[10px] text-neutral-400 font-semibold mt-1">
                            {new Date(step.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </p>
                        )}
                        {!step.date && isCompleted && idx === 2 && (
                          <p className="text-[10px] text-neutral-400 font-semibold mt-1">Dispatched</p>
                        )}
                        {!step.date && isCompleted && idx === 3 && (
                          <p className="text-[10px] text-neutral-400 font-semibold mt-1">Completed</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Items in the Order (Interconnected) */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="bg-neutral-50 px-6 py-4 border-b border-neutral-100">
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-700">Items Ordered</h3>
          </div>
          <ul className="divide-y divide-neutral-100">
            {order.items.map((item, idx) => {
              const isClickable = !!item.product?.slug;
              const productLink = isClickable ? `/products/${item.product.slug}` : '#';
              
              return (
                <li key={idx} className="p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                  {/* Product Image */}
                  <a 
                    href={productLink} 
                    className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50 p-1 flex items-center justify-center transition-transform hover:scale-105 ${!isClickable && 'pointer-events-none'}`}
                  >
                    {item.image || item.product?.images?.[0] ? (
                      <img 
                        src={item.image || item.product?.images?.[0]} 
                        alt={item.name} 
                        className="h-full w-full object-contain mix-blend-multiply" 
                      />
                    ) : (
                      <Package className="w-8 h-8 text-neutral-200" />
                    )}
                  </a>

                  {/* Product Metadata */}
                  <div className="flex-1">
                    <span className="text-[10px] font-black text-gold uppercase tracking-[0.2em] block mb-1">
                      {item.product?.brand || 'Premium Collection'}
                    </span>
                    <a 
                      href={productLink}
                      className={`text-sm font-bold text-neutral-900 hover:text-gold transition-colors leading-snug line-clamp-2 ${!isClickable && 'pointer-events-none'}`}
                    >
                      {item.product?.title || item.name}
                    </a>
                    <div className="mt-2 flex flex-wrap gap-3 items-center text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                      <span>Qty: {item.quantity}</span>
                      <span className="text-neutral-300 font-light">•</span>
                      <span>₹{item.price?.toLocaleString('en-IN')} / unit</span>
                      {item.variantSku && (
                        <>
                          <span className="text-neutral-300 font-light">•</span>
                          <span>SKU: {item.variantSku}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Pricing / Sub-actions */}
                  <div className="text-left sm:text-right shrink-0">
                    <p className="text-base font-black text-black">
                      ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                    </p>
                    {isClickable && (
                      <a 
                        href={productLink}
                        className="inline-flex items-center gap-1 mt-3 rounded-lg bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 px-3 py-1.5 text-[9px] font-black tracking-widest uppercase text-neutral-800 transition-all shadow-sm"
                      >
                        Buy it again
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Grid for Shipping, Payment, and Summary details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Shipping Address Card */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 mb-4">
                <MapPin className="w-4 h-4 text-gold" />
                <h4 className="text-xs font-black uppercase tracking-widest text-neutral-700">Shipping Address</h4>
              </div>
              <p className="text-sm font-extrabold text-neutral-900 mb-2">
                {order.shippingAddress?.fullName || order.shippingAddress?.name || 'Valued Customer'}
              </p>
              <p className="text-xs text-neutral-500 font-medium leading-relaxed">
                {order.shippingAddress?.addressLine1 || order.shippingAddress?.address || ''}
                {order.shippingAddress?.addressLine2 && `, ${order.shippingAddress.addressLine2}`}
                <br />
                {order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.pincode || order.shippingAddress?.zip}
                <br />
                {order.shippingAddress?.country || 'India'}
              </p>
            </div>
            {order.shippingAddress?.phone && (
              <div className="mt-4 pt-3 border-t border-neutral-50 flex items-center gap-2 text-xs font-bold text-neutral-600">
                <Phone className="w-3.5 h-3.5 text-neutral-400" />
                <span>{order.shippingAddress.phone}</span>
              </div>
            )}
          </div>

          {/* Payment details Card */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 mb-4">
                <CreditCard className="w-4 h-4 text-gold" />
                <h4 className="text-xs font-black uppercase tracking-widest text-neutral-700">Payment Details</h4>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-0.5">Method</p>
                  <p className="text-xs font-extrabold text-neutral-800 uppercase tracking-wider">
                    {order.paymentMethod || 'Razorpay Online'}
                  </p>
                </div>
                {order.paymentVpa && (
                  <div>
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-0.5">VPA / UPI ID</p>
                    <p className="text-xs font-extrabold text-neutral-800">{order.paymentVpa}</p>
                  </div>
                )}
                {order.razorpayPaymentId && (
                  <div>
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-0.5">Transaction ID</p>
                    <p className="text-xs font-semibold text-neutral-500 font-mono tracking-tight">{order.razorpayPaymentId}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-50 flex items-center justify-between">
              <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Status</span>
              <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {order.paymentStatus?.toUpperCase() || 'PENDING'}
              </span>
            </div>
          </div>

          {/* Pricing Summary Breakdown Card */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 mb-4">
                <Package className="w-4 h-4 text-gold" />
                <h4 className="text-xs font-black uppercase tracking-widest text-neutral-700">Order Summary</h4>
              </div>
              <div className="space-y-2.5 text-xs font-medium text-neutral-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-bold text-neutral-800">₹{order.subtotal?.toLocaleString('en-IN')}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span className="font-bold">Discount</span>
                    <span className="font-extrabold">-₹{discount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Shipping & Handling</span>
                  <span className="font-bold text-neutral-800">
                    {order.shipping > 0 ? `₹${order.shipping.toLocaleString('en-IN')}` : 'FREE'}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-200 flex items-center justify-between text-neutral-900">
              <span className="text-xs font-black uppercase tracking-widest">Total Paid</span>
              <span className="text-lg font-black text-green-600 font-sans">
                ₹{order.total?.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Shipment info if present */}
        {(order.awbCode || order.courierName) && (
          <div className="bg-neutral-50 rounded-xl p-6 border border-neutral-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-black text-white rounded-full flex items-center justify-center shadow-sm shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-neutral-400 uppercase tracking-widest">Shipment Courier</p>
                <p className="text-sm font-bold text-neutral-800">{order.courierName || 'Shiprocket Insured Partner'}</p>
              </div>
            </div>
            {order.awbCode && (
              <div>
                <p className="text-xs font-black text-neutral-400 uppercase tracking-widest">Tracking Number (AWB)</p>
                <p className="text-sm font-mono font-bold text-neutral-800 tracking-wider">{order.awbCode}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (user && activeTab === 'orders') {
      const fetchOrders = async () => {
        try {
          setLoadingOrders(true);
          const data = await storeOrderService.getMyOrders();
          if (data.success) {
            setOrders(data.data);
          }
        } catch (error) {
          console.error("Failed to fetch orders:", error);
        } finally {
          setLoadingOrders(false);
        }
      };
      fetchOrders();
    }
  }, [user, activeTab]);

  if (!user) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center bg-[#FAFAFA]">
        <h2 className="text-2xl font-serif text-neutral-900 mb-4">You are not logged in</h2>
        <p className="text-neutral-500 mb-6 font-medium">Please sign in to view your account dashboard.</p>
      </div>
    );
  }

  const TABS = [
    { id: 'orders', label: 'My Orders', shortLabel: 'Orders', icon: Package },
    { id: 'profile', label: 'Profile Settings', shortLabel: 'Profile', icon: UserIcon },
    { id: 'help', label: 'Help & Support', shortLabel: 'Support', icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-[#F6F6F6] text-neutral-900 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10 text-center md:text-left border-b border-neutral-200 pb-6">
          <h1 className="text-4xl font-serif text-black font-medium tracking-tight">My Account</h1>
          <p className="mt-2 text-sm text-neutral-500 uppercase tracking-widest font-bold">Welcome back, {user.name}</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
          {/* Sidebar Navigation */}
          <div className="w-full md:w-64 shrink-0">
            <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-neutral-100">
              <nav className="flex md:flex-col p-1.5 overflow-x-auto scrollbar-hide gap-1 items-center">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center justify-between shrink-0 md:w-full px-4 py-2.5 md:py-3.5 rounded-xl transition-all duration-300 ${
                        isActive 
                          ? 'bg-black text-white shadow-md' 
                          : 'text-neutral-600 hover:bg-neutral-50 hover:text-black'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon strokeWidth={isActive ? 2.5 : 1.5} className="w-4 h-4" />
                        <span className="text-xs md:text-sm font-semibold tracking-wide whitespace-nowrap md:inline hidden">{tab.label}</span>
                        <span className="text-xs md:text-sm font-semibold tracking-wide whitespace-nowrap md:hidden inline">{tab.shortLabel}</span>
                      </div>
                      {isActive && <ChevronRight className="w-4 h-4 opacity-50 hidden md:block" />}
                    </button>
                  );
                })}
                <div className="md:hidden h-5 w-px bg-neutral-200 mx-1 shrink-0" />
                <button
                  onClick={logout}
                  className="flex md:hidden items-center gap-2.5 shrink-0 px-4 py-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-colors duration-300"
                >
                  <LogOut strokeWidth={1.5} className="w-4.5 h-4.5" />
                  <span className="text-xs font-semibold tracking-wide whitespace-nowrap">Logout</span>
                </button>
              </nav>
              
              <div className="hidden md:block border-t border-neutral-100 p-2 mt-2">
                <button
                  onClick={logout}
                  className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-red-500 hover:bg-red-50 transition-colors duration-300"
                >
                  <LogOut strokeWidth={1.5} className="w-5 h-5" />
                  <span className="text-sm font-semibold tracking-wide">Logout</span>
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              {activeTab === 'orders' && (
                <motion.div
                  key="orders"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 p-6 md:p-8">
                    <h2 className="text-xl font-serif text-black font-bold mb-6 border-b border-neutral-100 pb-4">
                      {selectedOrder ? 'Order Details' : 'Order History'}
                    </h2>
                    
                    {loadingOrders ? (
                      <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
                      </div>
                    ) : selectedOrder ? (
                      renderOrderDetail(selectedOrder)
                    ) : orders.length === 0 ? (
                      <div className="text-center py-16 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                        <Package className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-neutral-900">No orders yet</h3>
                        <p className="mt-1 text-sm text-neutral-500">When you place an order, it will appear here.</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {orders.map((order) => (
                          <div key={order._id} className="block overflow-hidden rounded-xl border border-neutral-200 bg-white transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                            {/* Card Header: Fully optimized for mobile */}
                            <div className="border-b border-neutral-100 bg-neutral-50/70 px-4 sm:px-6 py-4">
                              <div className="flex flex-col md:grid md:grid-cols-6 gap-4 text-xs sm:text-sm items-stretch md:items-center">
                                {/* Row 1: ID and Date */}
                                <div className="flex justify-between items-center md:block">
                                  <div>
                                    <p className="text-neutral-400 font-bold text-[9px] uppercase tracking-wider mb-0.5 md:block hidden">Order ID</p>
                                    <p className="font-extrabold text-neutral-900 text-xs md:text-sm">#ORD-{order._id.slice(-6).toUpperCase()}</p>
                                  </div>
                                  <div className="md:hidden text-right">
                                    <p className="text-neutral-400 font-bold text-[9px] uppercase tracking-wider mb-0.5">Date Placed</p>
                                    <p className="font-semibold text-neutral-800 text-xs">{new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                  </div>
                                </div>

                                {/* Desktop Date Column */}
                                <div className="hidden md:block">
                                  <p className="text-neutral-400 font-bold text-[9px] uppercase tracking-wider mb-0.5">Date Placed</p>
                                  <p className="font-semibold text-neutral-900">{new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                </div>

                                {/* Total Amount */}
                                <div>
                                  <p className="text-neutral-400 font-bold text-[9px] uppercase tracking-wider mb-0.5 md:block hidden">Total Amount</p>
                                  <div className="flex justify-between md:block py-1 md:py-0 border-t border-neutral-100 md:border-0 mt-1 md:mt-0">
                                    <span className="md:hidden text-neutral-500 font-semibold text-xs">Total Amount:</span>
                                    <span className="font-black text-black text-sm md:text-base">₹{order.total?.toLocaleString('en-IN')}</span>
                                  </div>
                                </div>

                                {/* Ship To */}
                                <div>
                                  <p className="text-neutral-400 font-bold text-[9px] uppercase tracking-wider mb-0.5 md:block hidden">Ship To</p>
                                  <div className="flex justify-between md:block py-1 md:py-0 border-b border-neutral-100 md:border-0 mb-1 md:mb-0">
                                    <span className="md:hidden text-neutral-500 font-semibold text-xs">Ship To:</span>
                                    <span className="font-semibold text-neutral-800 text-xs md:text-sm truncate max-w-[150px] md:max-w-none block text-right md:text-left" title={`${order.shippingAddress?.city}, ${order.shippingAddress?.state}`}>
                                      {order.shippingAddress?.city}, {order.shippingAddress?.state}
                                    </span>
                                  </div>
                                </div>

                                {/* Status Badges */}
                                <div className="flex flex-row md:flex-col gap-2 md:gap-1 items-center md:items-start py-1 md:py-0">
                                  <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                    order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {order.paymentStatus === 'paid' ? '● PAID' : '● UNPAID'}
                                  </span>
                                  <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                    ['confirmed', 'shipped', 'delivered'].includes(order.orderStatus) ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-500'
                                  }`}>
                                    {order.orderStatus ? order.orderStatus.toUpperCase() : 'PENDING'}
                                  </span>
                                </div>

                                {/* Actions Column */}
                                <div className="flex items-center justify-end md:justify-center mt-2 md:mt-0">
                                  <button
                                    onClick={() => setSelectedOrder(order)}
                                    className="w-full md:w-auto text-center rounded-xl bg-white border border-neutral-200 px-4 py-2 text-[10px] font-black tracking-widest uppercase text-neutral-800 hover:bg-neutral-50 active:scale-95 transition-all hover:text-black shadow-sm"
                                  >
                                    View Details
                                  </button>
                                </div>
                              </div>
                            </div>
                            
                            {/* Card Body: Items and Metadata */}
                            <div className="px-4 sm:px-6 py-4">
                              <ul className="divide-y divide-neutral-100">
                                {order.items.map((item, idx) => (
                                  <li key={idx} className="flex py-4 first:pt-0 last:pb-0">
                                    <div className="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50 p-1 flex items-center justify-center">
                                      {item.image || (item.product?.images?.[0]) ? (
                                        <img 
                                          src={item.image || item.product?.images?.[0]} 
                                          alt={item.name} 
                                          className="h-full w-full object-contain mix-blend-multiply" 
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-neutral-50">
                                          <Package className="w-5 h-5 text-neutral-200" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="ml-4 flex-1 flex flex-col justify-center">
                                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                        <div className="min-w-0">
                                          <p className="text-[9px] font-black text-gold uppercase tracking-[0.15em] mb-0.5">
                                            {item.product?.brand || 'Premium Collection'}
                                          </p>
                                          <h4 className="text-xs sm:text-sm font-semibold text-neutral-900 leading-snug line-clamp-2 pr-4">
                                            {item.product?.title || item.name}
                                          </h4>
                                        </div>
                                        <div className="text-left sm:text-right shrink-0">
                                          <p className="text-xs sm:text-sm font-black text-neutral-900">₹{(item.price * item.quantity).toLocaleString('en-IN')}</p>
                                          <p className="text-[10px] font-medium text-neutral-400 mt-0.5">₹{item.price?.toLocaleString('en-IN')} × {item.quantity}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                              
                              {/* Footer Info */}
                              <div className="mt-4 pt-4 border-t border-dotted border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[9px] font-bold uppercase tracking-widest text-neutral-400">
                                <div className="flex items-center gap-3">
                                  <span>{order.paymentMethod?.toUpperCase() || 'Razorpay Secured'}</span>
                                  <span>•</span>
                                  <span className="font-mono">{order.razorpayOrderId?.slice(-12) || order._id.slice(-12).toUpperCase()}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-neutral-900 min-w-0">
                                   <MapPin className="size-3 text-gold shrink-0" />
                                   <span className="truncate">Deliver to: {order.shippingAddress?.fullName || order.shippingAddress?.name}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 p-6 md:p-8 space-y-10">
                    <div>
                      <h2 className="text-xl font-serif text-black font-bold mb-4 border-b border-neutral-100 pb-4">Profile Information</h2>
                      
                      <form onSubmit={handleUpdateProfile} className="max-w-2xl">
                        {profileError && (
                          <div className="mb-6 flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600 border border-red-100">
                            <AlertCircle className="size-4 shrink-0" />
                            {profileError}
                          </div>
                        )}

                        {profileSuccess && (
                          <div className="mb-6 flex items-center gap-2 rounded-xl bg-green-50 p-4 text-sm font-semibold text-green-600 border border-green-100">
                            <CheckCircle2 className="size-4 shrink-0" />
                            Profile updated successfully! Historical orders synced.
                          </div>
                        )}

                        <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-8">
                          <div>
                            <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2">Full Name</label>
                            <input
                              type="text"
                              value={profileForm.name}
                              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900 font-medium outline-none focus:border-black transition-all"
                              placeholder="Your name"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2">Mobile Number (10 Digits)</label>
                            <input
                              type="text"
                              maxLength="10"
                              value={profileForm.mobile}
                              onChange={(e) => setProfileForm({ ...profileForm, mobile: e.target.value.replace(/\D/g, '') })}
                              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900 font-medium outline-none focus:border-black transition-all"
                              placeholder="e.g. 9876543210"
                            />
                          </div>

                          <div className="sm:col-span-2 opacity-60">
                            <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2">Email Address (Primary Identity)</label>
                            <div className="w-full rounded-xl border border-neutral-200 bg-neutral-100 px-4 py-3 text-neutral-900 font-medium cursor-not-allowed">
                               {user.email}
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-8 pt-6 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-4">
                          <button
                            type="submit"
                            disabled={savingProfile}
                            className="flex items-center gap-2 rounded-xl bg-black px-8 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-neutral-800 active:scale-95 disabled:bg-neutral-400"
                          >
                            {savingProfile ? (
                              <>
                                <Loader2 className="size-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="size-4" />
                                Save Changes
                              </>
                            )}
                          </button>
                          <p className="text-[11px] text-neutral-400 font-medium flex items-center gap-1.5 uppercase tracking-widest leading-loose">
                            <Clock className="w-3.5 h-3.5"/> Last sync: {new Date().toLocaleTimeString()}
                          </p>
                        </div>
                      </form>
                    </div>

                    {/* Saved Delivery Addresses */}
                    <div className="border-t border-neutral-100 pt-8">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                        <div>
                          <h3 className="text-lg font-serif text-black font-bold">Saved Delivery Addresses</h3>
                          <p className="text-xs text-neutral-500 mt-0.5">Manage your shipping locations for rapid checkout</p>
                        </div>
                        <button
                          onClick={handleAddNewAddressClick}
                          className="flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-md hover:bg-neutral-800 transition-all active:scale-95 self-start sm:self-auto"
                        >
                          <Plus className="size-4" />
                          <span>Add New Address</span>
                        </button>
                      </div>

                      {loadingAddresses ? (
                        <div className="flex justify-center items-center py-10">
                          <Loader2 className="size-6 animate-spin text-neutral-400" />
                        </div>
                      ) : addresses.length === 0 ? (
                        <div className="text-center py-12 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200 px-4">
                          <MapPin className="size-10 text-neutral-300 mx-auto mb-3" />
                          <h4 className="text-sm font-bold text-neutral-700">No saved addresses yet</h4>
                          <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">Add a delivery address now to pre-fill shipping info in checkout modals instantly.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {addresses.map((addr) => (
                            <div 
                              key={addr._id} 
                              className={`p-5 rounded-2xl border flex flex-col justify-between transition-all hover:shadow-sm ${
                                addr.isDefault 
                                  ? 'border-black bg-neutral-50/40 shadow-[0_4px_20px_rgb(0,0,0,0.01)]' 
                                  : 'border-neutral-200 hover:border-neutral-300 bg-white'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-3 mb-2">
                                  <span className="text-sm font-extrabold text-neutral-900 leading-none">{addr.fullName}</span>
                                  {addr.isDefault && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-black text-white">
                                      Default
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-neutral-500 font-semibold leading-relaxed mb-3">
                                  {addr.addressLine1}
                                  {addr.addressLine2 && `, ${addr.addressLine2}`}
                                  <br />
                                  {addr.city}, {addr.state} - {addr.pincode}
                                </p>
                                <p className="text-xs font-bold text-neutral-600 flex items-center gap-1.5 mb-4">
                                  <Phone className="size-3.5 text-neutral-400" />
                                  <span>+91 {addr.phone}</span>
                                </p>
                              </div>

                              <div className="flex items-center justify-between border-t border-neutral-100 pt-3.5 mt-auto">
                                {!addr.isDefault ? (
                                  <button
                                    onClick={() => handleSetDefaultAddress(addr._id)}
                                    className="text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-black transition-colors"
                                  >
                                    Set as default
                                  </button>
                                ) : (
                                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 cursor-default">
                                    Primary Address
                                  </span>
                                )}

                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleEditAddressClick(addr)}
                                    className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg transition-all"
                                    title="Edit Address"
                                  >
                                    <Edit3 className="size-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAddress(addr._id)}
                                    className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    title="Delete Address"
                                  >
                                    <Trash2 className="size-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Change Password / Security */}
                    <div className="border-t border-neutral-100 pt-8">
                      <div className="mb-6">
                        <h3 className="text-lg font-serif text-black font-bold">Security Settings</h3>
                        <p className="text-xs text-neutral-500 mt-0.5">Change your account password securely</p>
                      </div>

                      <form onSubmit={handleChangePassword} className="max-w-2xl">
                        {passwordError && (
                          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-4 text-xs font-semibold text-red-600 border border-red-100">
                            <AlertCircle className="size-4 shrink-0" />
                            {passwordError}
                          </div>
                        )}

                        {passwordSuccess && (
                          <div className="mb-4 flex items-center gap-2 rounded-xl bg-green-50 p-4 text-xs font-semibold text-green-600 border border-green-100">
                            <CheckCircle2 className="size-4 shrink-0" />
                            Password changed successfully!
                          </div>
                        )}

                        <div className="grid grid-cols-1 gap-y-5 sm:grid-cols-3 sm:gap-x-6">
                          <div>
                            <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2">Current Password</label>
                            <input
                              type="password"
                              value={passwordForm.currentPassword}
                              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900 font-medium outline-none focus:border-black transition-all"
                              placeholder="••••••••"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2">New Password</label>
                            <input
                              type="password"
                              value={passwordForm.newPassword}
                              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900 font-medium outline-none focus:border-black transition-all"
                              placeholder="Min 6 characters"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2">Confirm Password</label>
                            <input
                              type="password"
                              value={passwordForm.confirmPassword}
                              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900 font-medium outline-none focus:border-black transition-all"
                              placeholder="••••••••"
                              required
                            />
                          </div>
                        </div>

                        <div className="mt-6">
                          <button
                            type="submit"
                            disabled={changingPassword}
                            className="flex items-center gap-2 rounded-xl bg-black px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-md hover:bg-neutral-800 active:scale-95 disabled:bg-neutral-400"
                          >
                            {changingPassword ? (
                              <>
                                <Loader2 className="size-3.5 animate-spin" />
                                <span>Updating...</span>
                              </>
                            ) : (
                              <>
                                <Key className="size-3.5" />
                                <span>Update Password</span>
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'help' && (
                <motion.div
                  key="help"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 p-6 md:p-8">
                    <div className="border-b border-neutral-100 pb-4 mb-6">
                      <h2 className="text-xl font-serif text-black font-bold">Help &amp; Support Desk</h2>
                      <p className="text-xs text-neutral-500 mt-0.5">Submit support queries and track ticket status in real-time</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Ticket submission Form */}
                      <div className="lg:col-span-1 border-b lg:border-b-0 lg:border-r border-neutral-100 pb-8 lg:pb-0 lg:pr-8">
                        <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-4 flex items-center gap-1.5">
                          <MessageSquare className="size-3.5 text-gold" />
                          <span>Open a Ticket</span>
                        </h3>

                        <form onSubmit={handleSubmitQuery} className="space-y-4">
                          {queryError && (
                            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-xs font-semibold text-red-600 border border-red-100">
                              <AlertCircle className="size-4 shrink-0" />
                              {queryError}
                            </div>
                          )}

                          {querySuccess && (
                            <div className="flex items-center gap-2 rounded-xl bg-green-50 p-4 text-xs font-semibold text-green-600 border border-green-100 font-sans">
                              <CheckCircle2 className="size-4 shrink-0" />
                              Ticket opened successfully! We will review and respond shortly.
                            </div>
                          )}

                          <div className="space-y-3 opacity-70">
                            <div>
                              <label className="block text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">Requester Identity</label>
                              <div className="w-full rounded-xl border border-neutral-200 bg-neutral-100 px-4 py-2.5 text-xs text-neutral-700 font-bold cursor-not-allowed truncate">
                                {user.name} ({user.email})
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-1">Your Message / Request</label>
                            <textarea
                              value={queryForm.message}
                              onChange={(e) => setQueryForm({ message: e.target.value })}
                              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-900 font-medium outline-none focus:border-black transition-all min-h-[120px]"
                              placeholder="Please describe your order request, delivery update, size query or other issue here..."
                              required
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={submittingQuery}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-black py-3 text-xs font-black uppercase tracking-widest text-white shadow-md hover:bg-neutral-800 transition-all active:scale-95 disabled:bg-neutral-400"
                          >
                            {submittingQuery ? (
                              <>
                                <Loader2 className="size-4 animate-spin" />
                                <span>Submitting...</span>
                              </>
                            ) : (
                              <>
                                <MessageSquare className="size-3.5" />
                                <span>Submit Ticket</span>
                              </>
                            )}
                          </button>
                        </form>
                      </div>

                      {/* Ticket History List */}
                      <div className="lg:col-span-2 space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-4">Ticket History</h3>

                        {loadingQueries ? (
                          <div className="flex justify-center items-center py-12">
                            <Loader2 className="size-6 animate-spin text-neutral-300" />
                          </div>
                        ) : queries.length === 0 ? (
                          <div className="text-center py-12 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200 px-4">
                            <HelpCircle className="size-10 text-neutral-300 mx-auto mb-3" />
                            <h4 className="text-sm font-bold text-neutral-700">No active support tickets</h4>
                            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">Any past queries linked to your verified email or mobile number will appear here automatically.</p>
                          </div>
                        ) : (
                          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                            {queries.map((q) => (
                              <div key={q._id} className="p-5 rounded-2xl border border-neutral-100 bg-white hover:shadow-[0_4px_20px_rgb(0,0,0,0.02)] transition-all flex flex-col gap-3">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-50 pb-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                                      Ticket #{q._id.slice(-6).toUpperCase()}
                                    </span>
                                    <span className="text-neutral-300 text-xs">•</span>
                                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                                      {new Date(q.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                  </div>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                    q.status === 'new' 
                                      ? 'bg-blue-50 text-blue-700 border-blue-100' 
                                      : q.status === 'read' 
                                        ? 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse'
                                        : q.status === 'responded' 
                                          ? 'bg-green-50 text-green-700 border-green-100'
                                          : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                                  }`}>
                                    {q.status === 'new' && '● Opened'}
                                    {q.status === 'read' && '● In Review'}
                                    {q.status === 'responded' && '● Resolved'}
                                    {q.status === 'archived' && 'Archived'}
                                  </span>
                                </div>
                                <p className="text-xs text-neutral-700 font-medium leading-relaxed whitespace-pre-line bg-neutral-50/50 p-3 rounded-xl border border-neutral-50">
                                  {q.message}
                                </p>
                                {q.response && (
                                  <div className="pl-4 border-l-2 border-gold/40 py-1 space-y-1 mt-1">
                                    <span className="text-[9px] font-black text-gold uppercase tracking-widest block">Concierge Response</span>
                                    <p className="text-xs text-neutral-800 font-bold leading-relaxed whitespace-pre-line">
                                      {q.response}
                                    </p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Address Modal Overlay */}
              <AnimatePresence>
                {showAddressModal && (
                  <>
                    <motion.div
                      key="address-modal-backdrop"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
                      onClick={() => setShowAddressModal(false)}
                    />
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 pointer-events-none">
                      <motion.div
                        key="address-modal-card"
                        initial={{ scale: 0.95, y: 20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.95, y: 20, opacity: 0 }}
                        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col pointer-events-auto"
                      >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4.5">
                          <h3 className="text-base font-serif text-black font-black">
                            {editingAddressId ? 'Edit Address' : 'Add New Address'}
                          </h3>
                          <button
                            onClick={() => setShowAddressModal(false)}
                            className="p-1.5 rounded-full border border-neutral-100 text-neutral-400 hover:text-black hover:border-neutral-200 transition-all"
                          >
                            <X className="size-4.5" />
                          </button>
                        </div>

                        {/* Modal Body / Form */}
                        <form onSubmit={handleSaveAddress} className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
                          {addressFormError && (
                            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-xs font-semibold text-red-600 border border-red-100">
                              <AlertCircle className="size-4 shrink-0" />
                              {addressFormError}
                            </div>
                          )}

                          <div>
                            <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5">
                              Full Name<span className="text-gold ml-0.5">*</span>
                            </label>
                            <input
                              type="text"
                              value={addressForm.fullName}
                              onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-900 font-semibold outline-none focus:border-black transition-all"
                              placeholder="e.g. Rahul Sharma"
                              required
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5">
                                Phone Number<span className="text-gold ml-0.5">*</span>
                              </label>
                              <input
                                type="tel"
                                maxLength="10"
                                value={addressForm.phone}
                                onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value.replace(/\D/g, '') })}
                                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-900 font-semibold outline-none focus:border-black transition-all"
                                placeholder="10-digit mobile"
                                required
                              />
                            </div>
                            <div className="relative">
                              <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5">
                                Pincode<span className="text-gold ml-0.5">*</span>
                              </label>
                              <input
                                type="text"
                                maxLength="6"
                                value={addressForm.pincode}
                                onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value.replace(/\D/g, '') })}
                                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-900 font-semibold outline-none focus:border-black transition-all"
                                placeholder="6-digit PIN"
                                required
                              />
                              {isPincodeLoading && (
                                <div className="absolute top-8.5 right-3 flex items-center gap-1 bg-white/80 px-1.5 py-0.5 rounded-full">
                                  <Loader2 className="size-3 animate-spin text-gold" />
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5">
                              Address Line 1<span className="text-gold ml-0.5">*</span>
                            </label>
                            <input
                              type="text"
                              value={addressForm.addressLine1}
                              onChange={(e) => setAddressForm({ ...addressForm, addressLine1: e.target.value })}
                              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-900 font-semibold outline-none focus:border-black transition-all"
                              placeholder="Flat/House no, building, apartment"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5">
                              Address Line 2 (Optional)
                            </label>
                            <input
                              type="text"
                              value={addressForm.addressLine2}
                              onChange={(e) => setAddressForm({ ...addressForm, addressLine2: e.target.value })}
                              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-900 font-semibold outline-none focus:border-black transition-all"
                              placeholder="Street, area, nearby landmark"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5">
                                City<span className="text-gold ml-0.5">*</span>
                              </label>
                              <input
                                type="text"
                                value={addressForm.city}
                                onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-900 font-semibold outline-none focus:border-black transition-all"
                                placeholder="e.g. New Delhi"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5">
                                State<span className="text-gold ml-0.5">*</span>
                              </label>
                              <select
                                value={addressForm.state}
                                onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-900 font-semibold outline-none focus:border-black transition-all"
                                required
                              >
                                <option value="" disabled>Select State</option>
                                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1 pb-4">
                            <input
                              type="checkbox"
                              id="isDefault"
                              checked={addressForm.isDefault}
                              onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                              className="size-4 rounded accent-black cursor-pointer"
                            />
                            <label htmlFor="isDefault" className="text-xs font-bold text-neutral-500 cursor-pointer select-none">
                              Set as primary default address
                            </label>
                          </div>
                          
                          {/* Modal Footer */}
                          <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-3 shrink-0">
                            <button
                              type="button"
                              onClick={() => setShowAddressModal(false)}
                              className="px-5 py-2.5 rounded-xl border border-neutral-200 text-[10px] font-black uppercase tracking-widest text-neutral-700 hover:bg-neutral-50 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={submittingAddress}
                              className="px-6 py-2.5 rounded-xl bg-black text-[10px] font-black uppercase tracking-widest text-white shadow-md hover:bg-neutral-800 transition-all active:scale-95 disabled:bg-neutral-400"
                            >
                              {submittingAddress ? 'Saving...' : 'Save Address'}
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    </div>
                  </>
                )}
              </AnimatePresence>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
