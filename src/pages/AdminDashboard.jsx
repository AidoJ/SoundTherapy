import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminPanel from '../components/AdminPanel';

const AdminDashboard = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated
    const isAuth = sessionStorage.getItem('adminAuth');
    if (!isAuth) {
      navigate('/admin');
    }
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('adminAuth');
    navigate('/');
  };

  const handleStartSession = (bookingData) => {
    // Navigate to the main app with booking data
    // This will be handled by the main App component
    navigate('/', { state: { bookingData } });
  };

  return (
    <div>
      <AdminPanel onLogout={handleLogout} onStartSession={handleStartSession} />
    </div>
  );
};

export default AdminDashboard;
