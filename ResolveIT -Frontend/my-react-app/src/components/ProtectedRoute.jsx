import React from 'react';
import { Navigate } from 'react-router-dom';

// Protected Route for authenticated users
export const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('token');

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

// Admin Protected Route - requires ROLE_ADMIN
export const AdminRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (role !== 'ROLE_ADMIN') {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

// User Route - redirects admin to admin dashboard
export const UserRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (role === 'ROLE_ADMIN') {
        return <Navigate to="/admin" replace />;
    }

    return children;
};

// Staff Route - requires ROLE_STAFF
export const StaffRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (role !== 'ROLE_STAFF') {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default ProtectedRoute;
