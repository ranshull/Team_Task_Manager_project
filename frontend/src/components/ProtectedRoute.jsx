import { Navigate } from "react-router-dom";
import { useAuth } from "../api/hooks/useAuth.js";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, ready } = useAuth();
  if (!ready) return <div className="page">Loading...</div>;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}
