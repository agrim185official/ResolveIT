import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAssignedGrievances, reportComplaintResolved, getAttachmentDownloadUrl, requestStatusChange } from '../../services/api';
import './StaffDashboard.css';

const StaffDashboard = () => {
    const [grievances, setGrievances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const [detailsModal, setDetailsModal] = useState({ open: false, grievance: null });
    const [statusModal, setStatusModal] = useState({ open: false, grievance: null, requestedStatus: '', comment: '' });

    useEffect(() => {
        loadAssignedGrievances();
    }, []);

    const handleDownload = (fileName) => {
        const fullUrl = `http://localhost:8081/api/public/files/${fileName}`;
        window.open(fullUrl, '_blank');
    };

    const loadAssignedGrievances = async () => {
        try {
            setLoading(true);
            const data = await getAssignedGrievances();
            setGrievances(data || []);
            setError('');
        } catch (err) {
            console.error('Failed to load assigned grievances:', err);
            setError('Failed to load assigned complaints.');
        } finally {
            setLoading(false);
        }
    };

    const handleReportResolved = async (grievance) => {
        if (grievance.status !== 'UNDER_REVIEW') {
            alert('Only complaints under review can be reported as resolved.');
            return;
        }

        const confirmed = window.confirm(`Report "${grievance.title}" as RESOLVED?\n\nThis will notify the admin for approval. The status will be updated by the admin.`);
        if (!confirmed) return;

        try {
            setLoading(true);
            await reportComplaintResolved(grievance.id);
            alert('✅ Complaint reported as resolved. Admin has been notified for approval.');
            await loadAssignedGrievances();
        } catch (err) {
            console.error('Failed to report as resolved:', err);
            alert('Failed to report as resolved: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    // Get valid next statuses based on current status
    const getValidNextStatuses = (currentStatus) => {
        switch (currentStatus) {
            case 'NEW': return ['UNDER_REVIEW'];
            case 'UNDER_REVIEW': return ['RESOLVED', 'NEW'];
            case 'RESOLVED': return ['CLOSED', 'UNDER_REVIEW'];
            case 'CLOSED': return [];
            default: return [];
        }
    };

    // Handle status change request
    const handleRequestStatusChange = async () => {
        const { grievance, requestedStatus, comment } = statusModal;

        if (!requestedStatus) {
            alert('Please select a status to request.');
            return;
        }

        try {
            setLoading(true);
            await requestStatusChange(grievance.id, requestedStatus, comment);
            alert(`✅ Status change request submitted! Admin will be notified to update to ${requestedStatus}.`);
            setStatusModal({ open: false, grievance: null, requestedStatus: '', comment: '' });
            await loadAssignedGrievances();
        } catch (err) {
            console.error('Failed to request status change:', err);
            alert('Failed to submit request: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        navigate('/login');
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'NEW': return 'status-badge new';
            case 'UNDER_REVIEW': return 'status-badge under-review';
            case 'RESOLVED': return 'status-badge resolved';
            case 'CLOSED': return 'status-badge closed';
            default: return 'status-badge';
        }
    };

    return (
        <div className="staff-dashboard">
            <header className="staff-header">
                <h1>Staff Dashboard</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                        onClick={() => navigate('/dashboard')}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'var(--surface-color)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            color: 'var(--text-main)',
                            fontWeight: '500'
                        }}
                    >
                        Go to User Dashboard ↗️
                    </button>
                    <p style={{ margin: 0 }}>Assigned Complaints</p>
                </div>
            </header>

            {error && <div className="error-banner">{error}</div>}

            <section className="complaints-section">
                <h2>My Assigned Complaints ({grievances?.length || 0})</h2>

                {loading ? (
                    <p className="loading-text">Loading...</p>
                ) : grievances.length === 0 ? (
                    <p className="empty-text">No complaints assigned to you.</p>
                ) : (
                    <div className="table-container">
                        <table className="complaints-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Title</th>
                                    <th>Category</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {grievances.map(grievance => (
                                    <tr key={grievance.id}>
                                        <td className="id-cell">{grievance.complaintNumber}</td>
                                        <td className="title-cell">{grievance.title}</td>
                                        <td className="category-cell">{grievance.category}</td>
                                        <td>
                                            <span className={getStatusBadgeClass(grievance.status)}>
                                                {grievance.status?.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="date-cell">
                                            {grievance.createdAt ? new Date(grievance.createdAt).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="actions-cell">
                                            {getValidNextStatuses(grievance.status).length > 0 && (
                                                <button
                                                    className="btn-status-request"
                                                    onClick={() => setStatusModal({
                                                        open: true,
                                                        grievance,
                                                        requestedStatus: '',
                                                        comment: ''
                                                    })}
                                                    disabled={loading}
                                                    style={{
                                                        padding: '0.4rem 0.8rem',
                                                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.85rem',
                                                        marginRight: '0.5rem'
                                                    }}
                                                >
                                                    📝 Request Status
                                                </button>
                                            )}
                                            <button
                                                className="btn-view-details"
                                                onClick={() => setDetailsModal({ open: true, grievance })}
                                                style={{
                                                    padding: '0.4rem 0.8rem',
                                                    background: 'rgba(79, 70, 229, 0.1)',
                                                    color: '#4f46e5',
                                                    border: '1px solid rgba(79, 70, 229, 0.3)',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.85rem'
                                                }}
                                            >
                                                👁️ View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Complaint Details Modal */}
            {detailsModal.open && detailsModal.grievance && (
                <div className="modal-overlay" onClick={() => setDetailsModal({ open: false, grievance: null })} style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                        background: 'var(--surface-color)', padding: '1.5rem', borderRadius: '12px',
                        width: '90%', maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                    }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                            <h3 style={{ margin: 0, color: 'var(--primary-color)' }}>Details: {detailsModal.grievance.complaintNumber}</h3>
                            <button onClick={() => setDetailsModal({ open: false, grievance: null })} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-dim)' }}>×</button>
                        </div>
                        <div className="modal-body">
                            <h4 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>{detailsModal.grievance.title}</h4>
                            <p style={{ color: 'var(--text-dim)', marginBottom: '1.5rem', lineHeight: '1.6' }}>{detailsModal.grievance.description}</p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: '600' }}>Category</label>
                                    <p style={{ margin: '0.25rem 0', color: 'var(--text-main)' }}>{detailsModal.grievance.category}</p>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: '600' }}>Priority</label>
                                    <p style={{ margin: '0.25rem 0', color: 'var(--text-main)' }}>{detailsModal.grievance.priority}</p>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: '600' }}>Status</label>
                                    <p style={{ margin: '0.25rem 0', color: 'var(--text-main)' }}>{detailsModal.grievance.status}</p>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: '600' }}>Created</label>
                                    <p style={{ margin: '0.25rem 0', color: 'var(--text-main)' }}>{new Date(detailsModal.grievance.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-dim)', fontWeight: '600', marginBottom: '0.75rem' }}>Attachments</label>
                                {detailsModal.grievance.attachments && detailsModal.grievance.attachments.length > 0 ? (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {detailsModal.grievance.attachments.map((attachment, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleDownload(attachment.fileName || attachment.name)}
                                                style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                                    padding: '0.5rem 0.8rem', background: 'var(--bg-color)',
                                                    border: '1px solid var(--border-color)', borderRadius: '6px',
                                                    cursor: 'pointer', fontSize: '0.9rem', color: 'var(--primary-color)'
                                                }}
                                            >
                                                📎 {attachment.fileName || attachment.name || `File ${idx + 1}`}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>No attachments</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Change Request Modal */}
            {statusModal.open && statusModal.grievance && (
                <div className="modal-overlay" onClick={() => setStatusModal({ open: false, grievance: null, requestedStatus: '', comment: '' })} style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                        background: 'var(--surface-color)', padding: '1.5rem', borderRadius: '12px',
                        maxWidth: '450px', width: '90%', border: '1px solid var(--border-color)'
                    }}>
                        <h3 style={{ marginTop: 0, color: 'var(--primary-color)' }}>📝 Request Status Change</h3>
                        <p style={{ color: 'var(--text-dim)', marginBottom: '1rem' }}>
                            Complaint: <strong>{statusModal.grievance.title}</strong>
                        </p>
                        <p style={{ color: 'var(--text-dim)', marginBottom: '1rem' }}>
                            Current Status: <span className={getStatusBadgeClass(statusModal.grievance.status)}>
                                {statusModal.grievance.status?.replace('_', ' ')}
                            </span>
                        </p>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                Request Status Change To:
                            </label>
                            <select
                                value={statusModal.requestedStatus}
                                onChange={(e) => setStatusModal({ ...statusModal, requestedStatus: e.target.value })}
                                style={{
                                    width: '100%', padding: '0.75rem', borderRadius: '8px',
                                    border: '1px solid var(--border-color)', background: 'var(--bg-color)',
                                    color: 'var(--text-main)', fontSize: '1rem'
                                }}
                            >
                                <option value="">Select Status...</option>
                                {getValidNextStatuses(statusModal.grievance.status).map(status => (
                                    <option key={status} value={status}>{status.replace('_', ' ')}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                Comment (Optional):
                            </label>
                            <textarea
                                value={statusModal.comment}
                                onChange={(e) => setStatusModal({ ...statusModal, comment: e.target.value })}
                                placeholder="Add reason or notes for the admin..."
                                style={{
                                    width: '100%', padding: '0.75rem', borderRadius: '8px',
                                    border: '1px solid var(--border-color)', background: 'var(--bg-color)',
                                    color: 'var(--text-main)', fontSize: '1rem', minHeight: '80px', resize: 'vertical'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setStatusModal({ open: false, grievance: null, requestedStatus: '', comment: '' })}
                                style={{
                                    padding: '0.6rem 1.2rem', background: 'var(--bg-color)',
                                    border: '1px solid var(--border-color)', borderRadius: '6px',
                                    cursor: 'pointer', color: 'var(--text-main)'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRequestStatusChange}
                                disabled={loading || !statusModal.requestedStatus}
                                style={{
                                    padding: '0.6rem 1.2rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                    border: 'none', borderRadius: '6px', cursor: 'pointer', color: 'white', fontWeight: '600',
                                    opacity: loading || !statusModal.requestedStatus ? 0.5 : 1
                                }}
                            >
                                {loading ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffDashboard;
