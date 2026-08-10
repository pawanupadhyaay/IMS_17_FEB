import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import ActivityHistory from './pages/ActivityHistory'
import Footer from './components/Footer'
import MyStoreLayout from './components/my-store/MyStoreLayout'
import StoreDashboard from './pages/my-store/StoreDashboard'
import StoreOrders from './pages/my-store/StoreOrders'
import StoreCoupons from './pages/my-store/StoreCoupons'
import StoreBlogs from './pages/my-store/StoreBlogs'
import StoreReviews from './pages/my-store/StoreReviews'
import StoreCustomers from './pages/my-store/StoreCustomers'
import StoreCustomersList from './pages/my-store/StoreCustomersList'
import StoreQueries from './pages/my-store/StoreQueries'
import StoreStaffs from './pages/my-store/StoreStaffs'
import StoreAnalytics from './pages/my-store/StoreAnalytics'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <div className="app-main">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/activity-history"
                element={
                  <PrivateRoute>
                    <ActivityHistory />
                  </PrivateRoute>
                }
              />
              
              {/* E-Commerce Admin Routes */}
              <Route path="/my-store" element={<PrivateRoute><MyStoreLayout /></PrivateRoute>}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<StoreDashboard />} />
                <Route path="orders" element={<StoreOrders />} />
                <Route path="coupons" element={<StoreCoupons />} />
                <Route path="blogs" element={<StoreBlogs />} />
                <Route path="reviews" element={<StoreReviews />} />
                <Route path="seo" element={<StoreCustomers />} />
                <Route path="customers" element={<StoreCustomersList />} />
                <Route path="queries" element={<StoreQueries type="query" />} />
                <Route path="tickets" element={<StoreQueries type="ticket" />} />
                <Route path="staffs" element={<StoreStaffs />} />
                <Route path="analytics" element={<StoreAnalytics />} />
              </Route>
              
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App

