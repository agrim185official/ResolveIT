import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';
import {
    getNotifications, getUnreadNotificationCount, markNotificationAsRead, markAllNotificationsAsRead,
    getUserNotifications, getUnreadUserNotificationCount, markUserNotificationAsRead, markAllUserNotificationsAsRead
} from '../services/api';
import './Navbar.css';

const Navbar = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Use state for token and role to make navbar reactive
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [role, setRole] = useState(localStorage.getItem('role'));
    const isAdmin = role === 'ROLE_ADMIN';
    const isStaff = role === 'ROLE_STAFF';
    // const isUser = !isAdmin && !isStaff; // Not strictly needed but helpful for context

    // Theme toggle
    const { theme, toggleTheme } = useTheme();

    // Re-check auth state on location change
    useEffect(() => {
        setToken(localStorage.getItem('token'));
        setRole(localStorage.getItem('role'));
    }, [location.pathname]);

    // Unified Notification State
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch notifications based on role
    const fetchNotifications = async () => {
        if (!token) return;

        try {
            let notifs = [];
            let countData = { count: 0 };

            if (isAdmin) {
                // Admin API
                const [n, c] = await Promise.all([
                    getNotifications(),
                    getUnreadNotificationCount()
                ]);
                notifs = n;
                countData = c;
            } else {
                // User & Staff API (Assuming Staff uses user notifications for now)
                const [n, c] = await Promise.all([
                    getUserNotifications(),
                    getUnreadUserNotificationCount()
                ]);
                notifs = n;
                countData = c;
            }

            setNotifications(notifs || []);
            setUnreadCount(countData?.count || 0);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    // Initial fetch and polling
    useEffect(() => {
        if (token) {
            fetchNotifications();
            // Poll every 30 seconds
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        } else {
            setNotifications([]);
            setUnreadCount(0);
        }
    }, [token, role, isAdmin]); // Re-run if role changes

    const handleMarkAllRead = async () => {
        try {
            if (isAdmin) {
                await markAllNotificationsAsRead();
            } else {
                await markAllUserNotificationsAsRead();
            }
            // Refresh
            await fetchNotifications();
        } catch (error) {
            console.error('Error marking all read:', error);
        }
    };

    const handleNotificationClick = async (notif) => {
        // Mark specific notification as read
        try {
            if (!notif.isRead) {
                if (isAdmin) {
                    await markNotificationAsRead(notif.id);
                } else {
                    await markUserNotificationAsRead(notif.id);
                }
                // Refresh count/list
                fetchNotifications();
            }
        } catch (error) {
            console.error('Error marking read:', error);
        }

        // Navigation logic could go here if needed
        // For now just close dropdown
        // setShowNotifications(false); // Optional: keep open or close? User usually expects close if navigating.
    };

    const getDashboardPath = () => {
        if (role === 'ROLE_ADMIN') return '/admin';
        if (role === 'ROLE_STAFF') return '/staff';
        return '/dashboard';
    };

    const isDashboardPage = ['/dashboard', '/admin', '/staff'].some(path =>
        location.pathname.startsWith(path)
    );

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        navigate('/login');
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                {/* Logo on LEFT */}
                <Link to="/" className="navbar-logo" style={{ paddingLeft: '60px' }}>
                    <span className="logo-icon">🛡️</span>
                    <span className="logo-text">ResolveIT</span>
                </Link>

                {/* Links on RIGHT */}
                <div className="navbar-links">
                    <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
                        Home
                    </Link>

                    {token ? (
                        <>
                            <Link
                                to={getDashboardPath()}
                                className={`nav-link btn-dashboard ${isDashboardPage ? 'active' : ''}`}
                            >
                                Dashboard
                            </Link>

                            {/* Unified Notification Bell */}
                            <div className="notification-wrapper">
                                <button
                                    className="nav-link notification-bell"
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    title="Notifications"
                                >
                                    🔔
                                    {unreadCount > 0 && (
                                        <span className="notification-badge">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </button>

                                {showNotifications && (
                                    <div className="notification-dropdown">
                                        <div className="notification-header">
                                            <h4>📬 Notifications</h4>
                                            {unreadCount > 0 && (
                                                <button onClick={handleMarkAllRead} className="mark-read-btn">
                                                    Mark all read
                                                </button>
                                            )}
                                        </div>
                                        <div className="notification-list">
                                            {notifications.length === 0 ? (
                                                <div className="no-notifications">No notifications</div>
                                            ) : (
                                                notifications.slice(0, 10).map(notif => (
                                                    <div
                                                        key={notif.id}
                                                        className={`notification-item ${!notif.isRead ? 'unread' : ''}`}
                                                        onClick={() => handleNotificationClick(notif)}
                                                    >
                                                        <span className="notif-icon">
                                                            {/* Simple icon logic based on type if available, else generic */}
                                                            {isAdmin
                                                                ? (notif.type === 'RESOLVED_PENDING' ? '✅' : '📌')
                                                                : (notif.type === 'STATUS_UPDATE' ? '📝' : '🔔')
                                                            }
                                                        </span>
                                                        <div className="notif-content">
                                                            <p>{notif.message}</p>
                                                            <span className="notif-time">
                                                                {new Date(notif.createdAt).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Theme Toggle */}
                            <button onClick={toggleTheme} className="nav-link theme-btn" title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
                                {theme === 'light' ? '🌙' : '☀️'}
                            </button>

                            <button onClick={handleLogout} className="nav-link btn-logout">
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Theme Toggle */}
                            <button onClick={toggleTheme} className="nav-link theme-btn" title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
                                {theme === 'light' ? '🌙' : '☀️'}
                            </button>

                            <Link to="/login" className={`nav-link sign-in ${location.pathname === '/login' ? 'active' : ''}`}>
                                Sign In
                            </Link>
                            <Link to="/register" className="nav-link btn-get-started">
                                Get Started
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
