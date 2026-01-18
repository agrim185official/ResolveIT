import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    fetchAllGrievances,
    updateGrievanceStatusWithComment,
    getPendingStaffApplications,
    approveStaffApplication,
    rejectStaffApplication,
    getStaffList,
    escalateComplaint
} from '../../services/api';
import Reports from './Reports';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const [grievances, setGrievances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('ALL');
    const [statusModal, setStatusModal] = useState({ open: false, grievance: null, newStatus: '', comments: '', mode: 'UPDATE' });
    const [assignModal, setAssignModal] = useState({ open: false, grievance: null, assignedTo: '', comments: '' });

    // Staff members for assignment dropdown (fetched dynamically)
    const [staffMembers, setStaffMembers] = useState([]);
    const [viewCommentModal, setViewCommentModal] = useState({ open: false, comment: '', title: '' });
    const [detailsModal, setDetailsModal] = useState({ open: false, grievance: null, fromNotification: false });



    // Tab state for switching between Complaints, Reports, and Staff Applications
    const [activeTab, setActiveTab] = useState('complaints');

    // Staff Applications state
    const [staffApplications, setStaffApplications] = useState([]);
    const [applicationsLoading, setApplicationsLoading] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('role');

        if (!token) {
            navigate('/login');
            return;
        }

        if (role !== 'ROLE_ADMIN') {
            navigate('/dashboard');
            return;
        }

        loadGrievances();
        loadStaffMembers();
    }, [navigate]);

    // Lock body scroll when any modal is open
    useEffect(() => {
        const isAnyModalOpen = statusModal.open || assignModal.open || viewCommentModal.open || detailsModal.open;

        if (isAnyModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }

        // Cleanup on unmount
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [statusModal.open, assignModal.open, viewCommentModal.open, detailsModal.open]);



    const loadGrievances = async () => {
        try {
            setLoading(true);
            const data = await fetchAllGrievances();
            setGrievances(data);
            setError('');
        } catch (err) {
            console.error('Failed to fetch grievances:', err);
            setError('Failed to load grievances. Access denied or server error.');
            if (err.response?.status === 403) {
                navigate('/dashboard');
            }
        } finally {
            setLoading(false);
        }
    };

    // Load staff members for assignment dropdown
    const loadStaffMembers = async () => {
        try {
            const data = await getStaffList();
            setStaffMembers(data);
        } catch (err) {
            console.error('Failed to fetch staff members:', err);
        }
    };

    // Load pending staff applications
    const loadStaffApplications = async () => {
        try {
            setApplicationsLoading(true);
            const data = await getPendingStaffApplications();
            setStaffApplications(data);
        } catch (err) {
            console.error('Failed to fetch staff applications:', err);
        } finally {
            setApplicationsLoading(false);
        }
    };

    // Handle approve staff application
    const handleApproveApplication = async (applicationId) => {
        if (!window.confirm('Approve this application? The user will be promoted to Staff.')) return;
        try {
            await approveStaffApplication(applicationId);
            alert('✅ Application approved! User is now a Staff member.');
            loadStaffApplications();
            loadStaffMembers(); // Refresh staff list after approval
        } catch (err) {
            console.error('Failed to approve:', err);
            alert('Failed to approve application: ' + (err.response?.data?.message || err.message));
        }
    };

    // Handle reject staff application
    const handleRejectApplication = async (applicationId) => {
        const reason = window.prompt('Enter rejection reason (optional):');
        try {
            await rejectStaffApplication(applicationId, reason);
            alert('Application rejected.');
            loadStaffApplications();
        } catch (err) {
            console.error('Failed to reject:', err);
            alert('Failed to reject application');
        }
    };

    // Load staff applications when switching to applications tab
    useEffect(() => {
        if (activeTab === 'applications') {
            loadStaffApplications();
        }
    }, [activeTab]);

    // NOTE: handleResetData removed - Reset Data button is hidden





    // Approve resolution from notification
    const handleApproveResolution = async () => {
        if (!detailsModal.grievance) return;

        try {
            setLoading(true);
            await updateGrievanceStatusWithComment(
                detailsModal.grievance.id,
                'RESOLVED',
                'Resolution approved by Admin',
                null
            );
            await loadGrievances();

            setDetailsModal({ open: false, grievance: null, fromNotification: false });
            alert('Complaint has been marked as RESOLVED!');
        } catch (err) {
            console.error('Failed to approve resolution:', err);
            const errorMsg = typeof err.response?.data === 'string'
                ? err.response.data
                : (err.response?.data?.message || err.message);
            alert('Failed to approve resolution: ' + errorMsg);
        } finally {
            setLoading(false);
        }
    };

    // NOTE: handleLogout removed - logout handled in Navbar component

    // View attachment using API endpoint (inline)
    const handleDownload = (fileName) => {
        const fullUrl = `http://localhost:8080/api/public/files/${fileName}`;
        window.open(fullUrl, '_blank');
    };

    const getValidNextStatuses = (currentStatus) => {
        switch (currentStatus) {
            case 'NEW':
                return ['UNDER_REVIEW'];
            case 'UNDER_REVIEW':
                return ['RESOLVED'];
            case 'RESOLVED':
                return ['CLOSED'];
            case 'CLOSED':
            default:
                return [];
        }
    };

    // NOTE: handleSingleClickUpdate removed - not used, status updates done via modal

    const openStatusModal = (grievance, mode = 'UPDATE') => {
        let nextStatus = '';

        if (mode === 'UPDATE') {
            const nextStatuses = getValidNextStatuses(grievance.status);
            if (nextStatuses.length === 0) {
                alert('This complaint is already in its final state (CLOSED).');
                return;
            }
            nextStatus = nextStatuses[0];
        } else {
            // COMMENT Mode: Keep status same
            nextStatus = grievance.status;
        }

        setStatusModal({
            open: true,
            grievance,
            newStatus: nextStatus,
            comments: '',
            mode: mode
        });
    };

    const closeStatusModal = () => {
        setStatusModal({ open: false, grievance: null, newStatus: '', comments: '', mode: 'UPDATE' });
    };

    const handleStatusUpdate = async () => {
        try {
            console.log('Updating status:', {
                id: statusModal.grievance.id,
                newStatus: statusModal.newStatus,
                comments: statusModal.comments
            });

            await updateGrievanceStatusWithComment(
                statusModal.grievance.id,
                statusModal.newStatus,
                statusModal.comments,
                null // No assignment change here
            );

            // Reload all grievances to get fresh data from server
            await loadGrievances();
            closeStatusModal();
        } catch (err) {
            console.error('Failed to update status:', err);
            console.error('Error response:', err.response);
            console.error('Error response data:', err.response?.data);
            console.error('Error response status:', err.response?.status);
            const errorMsg = typeof err.response?.data === 'string'
                ? err.response.data
                : (err.response?.data?.message || err.message);
            alert('Failed to update status: ' + errorMsg);
        }
    };

    // Handle Manual Escalation
    const handleEscalation = async () => {
        if (!detailsModal.grievance) return;

        if (!window.confirm('⚠️ Are you sure you want to manually ESCALATE this complaint? This marks it as high priority/urgent.')) {
            return;
        }

        try {
            setLoading(true);
            await escalateComplaint(detailsModal.grievance.id);
            await loadGrievances();
            alert('Complaint has been marked as ESCALATED! ⚠️');
            // Update local modal state to reflect change immediately if we keep it open
            setDetailsModal(prev => ({
                ...prev,
                grievance: { ...prev.grievance, escalated: true, escalatedAt: new Date().toISOString() }
            }));
        } catch (err) {
            console.error('Failed to escalate:', err);
            const errorMsg = typeof err.response?.data === 'string'
                ? err.response.data
                : (err.response?.data?.message || err.message);
            alert('Failed to escalate: ' + errorMsg);
        } finally {
            setLoading(false);
        }
    };

    // Assignment Handlers
    const openAssignModal = (grievance) => {
        setAssignModal({
            open: true,
            grievance,
            assignedTo: grievance.assignedTo?.email || '',
            comments: ''
        });
    };

    const closeAssignModal = () => {
        setAssignModal({ open: false, grievance: null, assignedTo: '', comments: '' });
    };

    const handleAssignStaff = async () => {
        try {
            console.log('Assigning staff:', {
                id: assignModal.grievance.id,
                assignedTo: assignModal.assignedTo,
                comments: assignModal.comments
            });

            // Keep status same, just update assignment
            await updateGrievanceStatusWithComment(
                assignModal.grievance.id,
                assignModal.grievance.status,
                assignModal.comments,
                assignModal.assignedTo
            );

            await loadGrievances();
            closeAssignModal();
        } catch (err) {
            console.error('Failed to assign staff:', err);
            const errorMsg = typeof err.response?.data === 'string'
                ? err.response.data
                : (err.response?.data?.message || err.message);
            alert('Failed to assign staff: ' + errorMsg);
        }
    };

    const filteredGrievances = filter === 'ALL'
        ? grievances
        : grievances.filter(g => g.status === filter);

    const stats = {
        total: grievances.length,
        new: grievances.filter(g => g.status === 'NEW').length,
        underReview: grievances.filter(g => g.status === 'UNDER_REVIEW').length,
        resolved: grievances.filter(g => g.status === 'RESOLVED').length,
        closed: grievances.filter(g => g.status === 'CLOSED').length
    };

    if (loading) {
        return (
            <div className="admin-dashboard">
                <div className="loading-spinner">Loading...</div>
            </div>
        );
    }

    return (
        <div className="admin-dashboard">
            {error && <div className="error-banner">{error}</div>}

            {/* Main Tab Navigation */}
            <div className="main-tabs">
                <button
                    className={`main-tab ${activeTab === 'complaints' ? 'active' : ''}`}
                    onClick={() => setActiveTab('complaints')}
                >
                    📋 Complaints
                </button>
                <button
                    className={`main-tab ${activeTab === 'reports' ? 'active' : ''}`}
                    onClick={() => setActiveTab('reports')}
                >
                    📊 Reports
                </button>
                <button
                    className={`main-tab ${activeTab === 'applications' ? 'active' : ''}`}
                    onClick={() => setActiveTab('applications')}
                >
                    👥 Staff Applications {staffApplications.length > 0 && `(${staffApplications.length})`}
                </button>
            </div>

            {activeTab === 'reports' ? (
                <Reports />
            ) : activeTab === 'applications' ? (
                <section className="applications-section">
                    <h2>Pending Staff Applications</h2>
                    {applicationsLoading ? (
                        <p>Loading applications...</p>
                    ) : staffApplications.length === 0 ? (
                        <div className="no-applications">
                            <p>📭 No pending staff applications</p>
                        </div>
                    ) : (
                        <div className="applications-grid">
                            {staffApplications.map(app => (
                                <div key={app.id} className="application-card">
                                    <div className="app-header">
                                        <div className="app-info">
                                            <h4>{app.applicantName}</h4>
                                            <span className="app-email">{app.applicantEmail}</span>
                                        </div>
                                        <div className={`app-score ${app.isPassing ? 'passing' : 'failing'}`}>
                                            {app.testScore}/{app.totalQuestions}
                                            <span className="score-percent">({app.scorePercentage?.toFixed(0)}%)</span>
                                        </div>
                                    </div>
                                    <div className="app-meta">
                                        <span>Submitted: {new Date(app.submittedAt).toLocaleDateString()}</span>
                                        <span className={`pass-status ${app.isPassing ? 'pass' : 'fail'}`}>
                                            {app.isPassing ? '✅ Passed' : '⚠️ Below threshold'}
                                        </span>
                                    </div>
                                    <div className="app-actions">
                                        <button
                                            className="btn-approve"
                                            onClick={() => handleApproveApplication(app.id)}
                                        >
                                            ✅ Approve
                                        </button>
                                        <button
                                            className="btn-reject"
                                            onClick={() => handleRejectApplication(app.id)}
                                        >
                                            ❌ Reject
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            ) : (
                <>
                    {/* Statistics Cards */}
                    <section className="stats-section">
                        <div className="stats-grid">
                            <div className="stat-card total">
                                <div className="stat-icon">📊</div>
                                <div className="stat-info">
                                    <h3>{stats.total}</h3>
                                    <p>Total Grievances</p>
                                </div>
                            </div>
                            <div className="stat-card new">
                                <div className="stat-icon">🆕</div>
                                <div className="stat-info">
                                    <h3>{stats.new}</h3>
                                    <p>New</p>
                                </div>
                            </div>
                            <div className="stat-card review">
                                <div className="stat-icon">🔍</div>
                                <div className="stat-info">
                                    <h3>{stats.underReview}</h3>
                                    <p>Under Review</p>
                                </div>
                            </div>
                            <div className="stat-card resolved">
                                <div className="stat-icon">✅</div>
                                <div className="stat-info">
                                    <h3>{stats.resolved}</h3>
                                    <p>Resolved</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Filter Tabs */}
                    <section className="filter-section">
                        <div className="filter-tabs">
                            {['ALL', 'NEW', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED'].map(status => (
                                <button
                                    key={status}
                                    className={`filter-tab ${filter === status ? 'active' : ''}`}
                                    onClick={() => setFilter(status)}
                                >
                                    {status.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Grievances Table */}
                    <section className="grievances-section">
                        <div className="table-container">
                            <table className="grievances-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Title</th>
                                        <th>Submitted By</th>
                                        <th>Category</th>
                                        <th>Priority</th>
                                        <th>Status</th>
                                        <th>Escalation</th>
                                        <th>Created</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredGrievances.length === 0 ? (
                                        <tr>
                                            <td colSpan="9" className="no-data">No grievances found</td>
                                        </tr>
                                    ) : (
                                        filteredGrievances.map(grievance => (
                                            <tr key={grievance.id}>
                                                <td className="id-cell">{grievance.complaintNumber || `#${grievance.id}`}</td>
                                                <td className="title-cell">
                                                    <div className="title-wrapper">
                                                        {grievance.title}
                                                        {grievance.anonymous && <span className="anon-badge">🔒</span>}
                                                    </div>
                                                </td>
                                                <td>{grievance.anonymous ? 'Anonymous' : grievance.createdBy || 'Unknown'}</td>
                                                <td><span className="category-tag">{grievance.category}</span></td>
                                                <td>
                                                    <span className={`priority-tag priority-${grievance.priority?.toLowerCase()}`}>
                                                        {grievance.priority}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`status-badge ${grievance.status?.toLowerCase()}`}>
                                                        {grievance.status}
                                                    </span>
                                                </td>
                                                <td className="escalation-cell">
                                                    {grievance.escalated ? (
                                                        <span className="escalation-badge" title={`Escalated on ${grievance.escalatedAt ? new Date(grievance.escalatedAt).toLocaleDateString() : 'N/A'}`}>
                                                            ⚠️ ESCALATED
                                                        </span>
                                                    ) : (
                                                        <span className="no-escalation">—</span>
                                                    )}
                                                </td>
                                                <td className="date-cell">
                                                    {grievance.createdAt ? new Date(grievance.createdAt).toLocaleDateString() : 'N/A'}
                                                </td>
                                                <td className="actions-cell">
                                                    {grievance.status !== 'CLOSED' && (
                                                        <div className="action-buttons" style={{ display: 'flex', gap: '0.5rem' }}>
                                                            <button
                                                                className="btn-action info"
                                                                onClick={() => setDetailsModal({ open: true, grievance })}
                                                                title="View Full Details"
                                                                style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}
                                                            >
                                                                📋 Details
                                                            </button>
                                                            <button
                                                                className="btn-action primary"
                                                                onClick={() => openStatusModal(grievance, 'UPDATE')}
                                                                title="Move to Next Status"
                                                                style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}
                                                            >
                                                                Next Step ➡️
                                                            </button>
                                                            <button
                                                                className="btn-action secondary"
                                                                onClick={() => openAssignModal(grievance)}
                                                                title="Assign Staff"
                                                                style={{ background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' }}
                                                            >
                                                                👤
                                                            </button>
                                                            <button
                                                                className="btn-action secondary"
                                                                onClick={() => openStatusModal(grievance, 'COMMENT')}
                                                                title="Add Comment Only"
                                                                style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}
                                                            >
                                                                💬
                                                            </button>
                                                        </div>
                                                    )}
                                                    {grievance.status === 'CLOSED' && (
                                                        <span className="status-badge closed">Closed</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Reset Data Section - HIDDEN (backend endpoint still exists at /api/complaints/reset-data)
                        <div className="reset-data-section" style={{
                            marginTop: '2rem',
                            padding: '1.5rem',
                            background: 'rgba(239, 68, 68, 0.05)',
                            borderRadius: '12px',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            textAlign: 'center'
                        }}>
                            <p style={{ color: 'var(--text-dim)', marginBottom: '1rem' }}>
                                ⚠️ Danger Zone: Reset all complaint data
                            </p>
                            <button
                                className="btn-reset-data"
                                onClick={async () => {
                                    if (window.confirm('Are you sure you want to reset all data? This cannot be undone!')) {
                                        try {
                                            const token = localStorage.getItem('token');
                                            await fetch('http://localhost:8080/api/complaints/reset-data', {
                                                method: 'POST',
                                                headers: { Authorization: `Bearer ${token}` }
                                            });
                                            alert('Data reset successfully!');
                                            window.location.reload();
                                        } catch (error) {
                                            alert('Failed to reset data');
                                        }
                                    }
                                }}
                                style={{
                                    background: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem'
                                }}
                            >
                                🗑️ Reset All Complaints Data
                            </button>
                        </div>
                        */}
                    </section>

                    {/* Status Update Modal */}
                    {statusModal.open && (
                        <div className="modal-overlay fade-in" onClick={closeStatusModal}>
                            <div className="modal-content status-update-modal scale-up" onClick={e => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h3>{statusModal.mode === 'UPDATE' ? 'Update Status' : 'Add Admin Comment'}</h3>
                                    <button className="modal-close" onClick={closeStatusModal}>×</button>
                                </div>
                                <div className="modal-body">
                                    <p className="grievance-title">
                                        {statusModal.grievance?.title}
                                        <span style={{ marginLeft: '10px', fontSize: '0.8em', color: '#666' }}>
                                            (Current: {statusModal.grievance?.status.replace('_', ' ')})
                                        </span>
                                    </p>

                                    {statusModal.mode === 'UPDATE' && (
                                        <div className="admin-form-group">
                                            <label>Next Status</label>
                                            <input
                                                type="text"
                                                className="admin-input-field"
                                                value={statusModal.newStatus?.replace('_', ' ')}
                                                readOnly
                                                style={{ background: '#f3f4f6', cursor: 'not-allowed', color: '#6b7280' }}
                                            />
                                            <small style={{ color: '#666' }}>Status will advance to the next stage.</small>
                                        </div>
                                    )}



                                    {statusModal.mode === 'UPDATE' && (
                                        <div className="admin-form-group">
                                            <label>Staff Notes <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>(visible to admins only)</span></label>
                                            <textarea
                                                className="admin-input-field"
                                                rows="3"
                                                placeholder="Add notes for staff/admin reference (optional)..."
                                                value={statusModal.comments}
                                                onChange={(e) => setStatusModal({ ...statusModal, comments: e.target.value })}
                                            ></textarea>
                                        </div>
                                    )}

                                    {statusModal.mode === 'COMMENT' && (
                                        <div className="admin-form-group">
                                            <p style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: '4px', fontSize: '0.9rem', color: '#475569' }}>
                                                Adding comment to timeline. Status will remain <strong>{statusModal.grievance?.status.replace('_', ' ')}</strong>.
                                            </p>
                                        </div>
                                    )}

                                    {statusModal.mode === 'COMMENT' && (
                                        <div className="admin-form-group">
                                            <label>Admin Comments</label>
                                            <textarea
                                                className="admin-input-field"
                                                rows="3"
                                                placeholder="Type your comment here..."
                                                value={statusModal.comments}
                                                onChange={(e) => setStatusModal({ ...statusModal, comments: e.target.value })}
                                                autoFocus
                                            ></textarea>
                                        </div>
                                    )}
                                </div>
                                <div className="modal-actions">
                                    <button className="modal-btn secondary" onClick={closeStatusModal}>Cancel</button>
                                    <button className="modal-btn primary" onClick={handleStatusUpdate} disabled={statusModal.mode === 'COMMENT' && !statusModal.comments.trim()}>
                                        {statusModal.mode === 'UPDATE' ? 'Update Status' : 'Post Comment'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}


                    {/* Assignment Modal */}
                    {
                        assignModal.open && (
                            <div className="modal-overlay fade-in" onClick={closeAssignModal}>
                                <div className="modal-content status-update-modal assign-modal scale-up" onClick={e => e.stopPropagation()}>
                                    <div className="modal-header">
                                        <h3>👤 Assign Staff</h3>
                                        <button className="modal-close" onClick={closeAssignModal}>×</button>
                                    </div>
                                    <div className="modal-body">
                                        <p className="grievance-title">
                                            {assignModal.grievance?.title}
                                            <span style={{ marginLeft: '10px', fontSize: '0.8em', color: '#666' }}>
                                                (Current: {assignModal.grievance?.status.replace('_', ' ')})
                                            </span>
                                        </p>

                                        <div className="admin-form-group">
                                            <label>Assign to Staff</label>
                                            <select
                                                className="admin-input-field"
                                                value={assignModal.assignedTo}
                                                onChange={(e) => setAssignModal({ ...assignModal, assignedTo: e.target.value })}
                                            >
                                                <option value="">-- Select Staff --</option>
                                                {staffMembers.map(staff => (
                                                    <option key={staff.id} value={staff.id}>{staff.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="admin-form-group">
                                            <label>Comments (Optional)</label>
                                            <textarea
                                                className="admin-input-field"
                                                rows="3"
                                                placeholder="Add notes about this assignment..."
                                                value={assignModal.comments}
                                                onChange={(e) => setAssignModal({ ...assignModal, comments: e.target.value })}
                                            ></textarea>
                                        </div>

                                        <div className="modal-actions">
                                            <button className="modal-btn secondary" onClick={closeAssignModal}>Cancel</button>
                                            <button className="modal-btn primary" onClick={handleAssignStaff} disabled={!assignModal.assignedTo}>
                                                Assign Staff
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                    {/* View Comment Modal */}
                    {
                        viewCommentModal.open && (
                            <div className="modal-overlay fade-in" onClick={() => setViewCommentModal({ ...viewCommentModal, open: false })}>
                                <div className="modal-content comment-view-modal scale-up" onClick={e => e.stopPropagation()}>
                                    <div className="modal-header">
                                        <h3>Admin Comment</h3>
                                        <button className="modal-close" onClick={() => setViewCommentModal({ ...viewCommentModal, open: false })}>×</button>
                                    </div>
                                    <div className="modal-body">
                                        <p className="comment-context">Complaint: <strong>{viewCommentModal.title}</strong></p>
                                        <div className="full-comment-box">
                                            {viewCommentModal.comment}
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button className="btn btn-primary" onClick={() => setViewCommentModal({ ...viewCommentModal, open: false })}>Close</button>
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    {/* Complaint Details Modal */}
                    {
                        detailsModal.open && detailsModal.grievance && (
                            <div className="modal-overlay fade-in" onClick={() => setDetailsModal({ open: false, grievance: null })}>
                                <div className="modal-content details-modal scale-up" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '80vh', overflow: 'auto' }}>
                                    <div className="modal-header" style={{ background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.15) 0%, rgba(0, 150, 200, 0.1) 100%)', borderBottom: '1px solid rgba(0, 217, 255, 0.2)' }}>
                                        <h3 style={{ color: '#00f2fe' }}>📋 Complaint Details</h3>
                                        <button className="modal-close" onClick={() => setDetailsModal({ open: false, grievance: null })}>×</button>
                                    </div>
                                    <div className="modal-body" style={{ padding: '1.5rem' }}>
                                        {/* Header Info */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                            <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#00d9ff' }}>
                                                {detailsModal.grievance.complaintNumber || `#${detailsModal.grievance.id}`}
                                            </span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span className={`status-badge ${detailsModal.grievance.status?.toLowerCase()}`}>
                                                    {detailsModal.grievance.status?.replace('_', ' ')}
                                                </span>
                                                {detailsModal.grievance.escalated && (
                                                    <span style={{
                                                        background: 'rgba(239, 68, 68, 0.2)',
                                                        color: '#ef4444',
                                                        border: '1px solid rgba(239, 68, 68, 0.5)',
                                                        padding: '0.25rem 0.75rem',
                                                        borderRadius: '20px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 'bold',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.25rem'
                                                    }}>
                                                        ⚠️ ESCALATED
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Title */}
                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <label style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', fontWeight: '500' }}>Title</label>
                                            <h4 style={{ margin: '0.25rem 0', color: '#ffffff', fontSize: '1.25rem' }}>
                                                {detailsModal.grievance.title}
                                                {detailsModal.grievance.anonymous && <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#ff6b6b' }}>🔒 Anonymous</span>}
                                            </h4>
                                        </div>

                                        {/* Description */}
                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <label style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', fontWeight: '500' }}>Description</label>
                                            <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1rem', borderRadius: '8px', marginTop: '0.25rem', lineHeight: '1.6', color: 'rgba(255, 255, 255, 0.9)', whiteSpace: 'pre-wrap', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                                {detailsModal.grievance.description || 'No description provided.'}
                                            </div>
                                        </div>

                                        {/* Metadata Grid */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                            <div>
                                                <label style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', fontWeight: '500' }}>Category</label>
                                                <p style={{ margin: '0.25rem 0', color: '#ffffff' }}><span className="category-tag">{detailsModal.grievance.category}</span></p>
                                            </div>
                                            <div>
                                                <label style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', fontWeight: '500' }}>Priority</label>
                                                <p style={{ margin: '0.25rem 0' }}><span className={`priority-tag priority-${detailsModal.grievance.priority?.toLowerCase()}`}>{detailsModal.grievance.priority}</span></p>
                                            </div>
                                            <div>
                                                <label style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', fontWeight: '500' }}>Submitted By</label>
                                                <p style={{ margin: '0.25rem 0', color: '#ffffff' }}>{detailsModal.grievance.anonymous ? 'Anonymous' : (detailsModal.grievance.createdBy || detailsModal.grievance.submittedBy || 'Unknown')}</p>
                                            </div>
                                            <div>
                                                <label style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', fontWeight: '500' }}>Assigned To</label>
                                                <p style={{ margin: '0.25rem 0', color: '#ffffff' }}>{detailsModal.grievance.assignedTo || 'Not assigned'}</p>
                                            </div>
                                            <div>
                                                <label style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', fontWeight: '500' }}>Created</label>
                                                <p style={{ margin: '0.25rem 0', color: 'rgba(255, 255, 255, 0.8)' }}>{detailsModal.grievance.createdAt ? new Date(detailsModal.grievance.createdAt).toLocaleString() : 'N/A'}</p>
                                            </div>
                                            <div>
                                                <label style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', fontWeight: '500' }}>Last Updated</label>
                                                <p style={{ margin: '0.25rem 0', color: 'rgba(255, 255, 255, 0.8)' }}>{detailsModal.grievance.updatedAt ? new Date(detailsModal.grievance.updatedAt).toLocaleString() : 'N/A'}</p>
                                            </div>
                                        </div>

                                        {/* Attachments */}
                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <label style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                📎 Attachments
                                                {detailsModal.grievance.attachments && detailsModal.grievance.attachments.length > 0 && (
                                                    <span style={{
                                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                        color: '#fff',
                                                        padding: '0.15rem 0.5rem',
                                                        borderRadius: '12px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600'
                                                    }}>
                                                        {detailsModal.grievance.attachments.length}
                                                    </span>
                                                )}
                                            </label>
                                            {detailsModal.grievance.attachments && detailsModal.grievance.attachments.length > 0 ? (
                                                <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                                    {detailsModal.grievance.attachments.map((attachment, idx) => {
                                                        // Determine file type styling
                                                        const isPdf = attachment.fileType?.includes('pdf');
                                                        const isImage = attachment.fileType?.includes('image');
                                                        const isVideo = attachment.fileType?.includes('video');

                                                        const getStyle = () => {
                                                            if (isPdf) return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.4)', icon: '📄' };
                                                            if (isImage) return { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: 'rgba(34, 197, 94, 0.4)', icon: '🖼️' };
                                                            if (isVideo) return { bg: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', border: 'rgba(168, 85, 247, 0.4)', icon: '🎬' };
                                                            return { bg: 'rgba(0, 217, 255, 0.15)', color: '#00d9ff', border: 'rgba(0, 217, 255, 0.3)', icon: '📎' };
                                                        };

                                                        const style = getStyle();

                                                        return (
                                                            <button
                                                                key={idx}
                                                                onClick={() => handleDownload(attachment.fileName || attachment.name)}
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '0.5rem',
                                                                    padding: '0.6rem 1rem',
                                                                    background: style.bg,
                                                                    color: style.color,
                                                                    borderRadius: '8px',
                                                                    textDecoration: 'none',
                                                                    fontSize: '0.9rem',
                                                                    fontWeight: '500',
                                                                    border: `1px solid ${style.border}`,
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s ease',
                                                                    boxShadow: `0 2px 8px ${style.bg}`
                                                                }}
                                                                onMouseOver={(e) => {
                                                                    e.target.style.transform = 'translateY(-2px)';
                                                                    e.target.style.boxShadow = `0 4px 12px ${style.bg}`;
                                                                }}
                                                                onMouseOut={(e) => {
                                                                    e.target.style.transform = 'translateY(0)';
                                                                    e.target.style.boxShadow = `0 2px 8px ${style.bg}`;
                                                                }}
                                                            >
                                                                <span style={{ fontSize: '1.1rem' }}>{style.icon}</span>
                                                                {attachment.fileName || attachment.name || `File ${idx + 1}`}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <p style={{ margin: '0.5rem 0', color: 'rgba(255, 255, 255, 0.4)', fontStyle: 'italic', fontSize: '0.9rem' }}>No attachments uploaded</p>
                                            )}
                                        </div>

                                        {/* Admin Comments History */}
                                        <div style={{ marginTop: '1rem' }}>
                                            <label style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', fontWeight: '500' }}>💬 Admin Comments History</label>
                                            {detailsModal.grievance.updates && detailsModal.grievance.updates.length > 0 ? (
                                                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                    {detailsModal.grievance.updates.map((update, idx) => (
                                                        <div
                                                            key={idx}
                                                            style={{
                                                                padding: '0.75rem',
                                                                background: 'rgba(0, 217, 255, 0.08)',
                                                                borderRadius: '8px',
                                                                borderLeft: '3px solid #00d9ff'
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                                <span style={{ color: '#00d9ff', fontSize: '0.8rem', fontWeight: '500' }}>
                                                                    {update.updatedBy || 'Admin'}
                                                                </span>
                                                                <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem' }}>
                                                                    {update.updatedAt ? new Date(update.updatedAt).toLocaleString() : ''}
                                                                </span>
                                                            </div>
                                                            {update.oldStatus && update.newStatus && update.oldStatus !== update.newStatus && (
                                                                <div style={{ marginBottom: '0.5rem' }}>
                                                                    <span className={`status-badge ${update.oldStatus?.toLowerCase()}`} style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>
                                                                        {update.oldStatus?.replace('_', ' ')}
                                                                    </span>
                                                                    <span style={{ margin: '0 0.5rem', color: 'rgba(255, 255, 255, 0.5)' }}>→</span>
                                                                    <span className={`status-badge ${update.newStatus?.toLowerCase()}`} style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>
                                                                        {update.newStatus?.replace('_', ' ')}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                                                                {update.comments}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p style={{ margin: '0.25rem 0', color: 'rgba(255, 255, 255, 0.4)', fontStyle: 'italic' }}>No comments yet</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Manual Escalation Action */}
                                    {!detailsModal.grievance.escalated && detailsModal.grievance.status !== 'CLOSED' && detailsModal.grievance.status !== 'RESOLVED' && (
                                        <div className="modal-actions" style={{ padding: '0 1.5rem 1.5rem 1.5rem', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                            <button
                                                className="modal-btn"
                                                onClick={handleEscalation}
                                                style={{
                                                    background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                                                    color: 'white',
                                                    fontWeight: 'bold',
                                                    border: 'none',
                                                    padding: '0.75rem 1.5rem',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
                                                    transition: 'all 0.2s',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem'
                                                }}
                                                onMouseOver={e => {
                                                    e.target.style.transform = 'translateY(-2px)';
                                                    e.target.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.4)';
                                                }}
                                                onMouseOut={e => {
                                                    e.target.style.transform = 'translateY(0)';
                                                    e.target.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.3)';
                                                }}
                                            >
                                                ⚠️ Escalate Complaint
                                            </button>
                                        </div>
                                    )}

                                    {/* Approve Button - Visible when opened from notification and status is UNDER_REVIEW */}
                                    {detailsModal.fromNotification && detailsModal.grievance.status === 'UNDER_REVIEW' && (
                                        <div className="modal-actions" style={{ background: 'transparent', borderTop: '1px solid rgba(0, 217, 255, 0.2)', padding: '1.5rem' }}>
                                            <button
                                                className="modal-btn secondary"
                                                onClick={() => setDetailsModal({ open: false, grievance: null, fromNotification: false })}
                                            >
                                                Close
                                            </button>
                                            <button
                                                className="modal-btn primary"
                                                onClick={handleApproveResolution}
                                                style={{ background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)', boxShadow: '0 4px 15px rgba(52, 211, 153, 0.3)' }}
                                            >
                                                ✅ Approve Resolution
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    }
                </>
            )}
        </div >
    );
};

export default AdminDashboard;
