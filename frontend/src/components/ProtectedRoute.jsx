
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ allowedRoles }) => {
    const { user, isAuthenticated } = useAuth();

    // Redirect users who are not logged in
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Check user role
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        if (user.role === "customer") {
            return <Navigate to="/customer/dashboard" replace />;
        }

        return <Navigate to="/agent/dashboard" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
