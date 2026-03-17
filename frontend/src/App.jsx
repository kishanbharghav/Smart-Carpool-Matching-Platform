import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import RideDetail from './components/RideDetail';
import PostRide from './components/PostRide';
import RideMap from './components/RideMap';
import Layout from './components/Layout';

function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
          <Route path="/rides/:id" element={<PrivateRoute><Layout><RideDetail /></Layout></PrivateRoute>} />
          <Route path="/rides/:id/map" element={<PrivateRoute><Layout><RideMap /></Layout></PrivateRoute>} />
          <Route path="/post" element={<PrivateRoute><Layout><PostRide /></Layout></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
