import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import RideDetail from './components/RideDetail';
import PostRide from './components/PostRide';
import RideMap from './components/RideMap';

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
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/rides/:id" element={<PrivateRoute><RideDetail /></PrivateRoute>} />
          <Route path="/rides/:id/map" element={<PrivateRoute><RideMap /></PrivateRoute>} />
          <Route path="/post" element={<PrivateRoute><PostRide /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
