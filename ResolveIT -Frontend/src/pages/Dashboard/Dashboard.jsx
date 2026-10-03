/**
 * Dashboard Component - User's Grievance Management Interface
 * 
 * This is the main dashboard for regular users (ROLE_USER).
 * It provides a complete interface for managing personal grievances/complaints.
 * 
 * FEATURES:
 * 1. CREATE GRIEVANCE:
 *    - Form with title, description, category, priority
 *    - File attachment support (images, PDFs)
 *    - Anonymous submission option
 * 
 * 2. VIEW MY GRIEVANCES:
 *    - List of user's submitted complaints
 *    - Status badges (NEW, UNDER_REVIEW, RESOLVED, CLOSED)
 *    - Priority and category tags
 *    - Attachment display with download links
 * 
 * 3. GRIEVANCE ACTIONS:
 *    - Edit: Update title, description, category, priority
 *    - Delete: Remove grievance (with confirmation)
 *    - Timeline: View status change history
 *    - Upload: Add more attachments to existing grievances
 * 
 * 4. NOTIFICATIONS:
 *    - Bell icon shows unread count
 *    - Dropdown with status update notifications
 *    - Mark as read functionality
 * 
 * ACCESS CONTROL:
 * - Redirects to /login if not authenticated
 * - Redirects to /admin if user has ROLE_ADMIN
 * - Only shows user's own grievances (via /my-complaints API)
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchGrievances, createGrievance, deleteGrievance, updateGrievance, getComplaintTimeline, uploadAttachment, getAttachmentDownloadUrl } from '../../services/api';
import FeedbackForm from '../../components/FeedbackForm';
import api from '../../services/api';
import './Dashboard.css';
import './FeedbackDisplay.css';

/**
 * STATE MANAGEMENT:
 * - grievances: Array of user's complaints
 * - newGrievance: Form data for creating new complaint
 * - selectedFiles: Files to attach during creation
 * - editModal/editData: State for edit modal
 * - uploadModal/uploadFiles: State for attachment upload
 * - timelineModal: State for viewing complaint history
 */
const Dashboard = () => {
    const [grievances, setGrievances] = useState([]);
    const [newGrievance, setNewGrievance] = useState({ title: '', description: '', category: 'General', priority: 'Medium' });
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [timelineModal, setTimelineModal] = useState({ open: false, complaintId: null, timeline: [], loading: false });
    const navigate = useNavigate();

    // Edit Modal State
    const [editModal, setEditModal] = useState({ open: false, grievance: null });
    const [editData, setEditData] = useState({ title: '', description: '', category: '', priority: '' });
    const [editLoading, setEditLoading] = useState(false);

    // Upload Modal State
    const [uploadModal, setUploadModal] = useState({ open: false, grievanceId: null });
    const [uploadFiles, setUploadFiles] = useState([]);
    const [uploadLoading, setUploadLoading] = useState(false);

    // Feedback State
    const [feedbackEligibility, setFeedbackEligibility] = useState({});
    const [existingFeedbacks, setExistingFeedbacks] = useState({});
    const [showFeedbackForm, setShowFeedbackForm] = useState({}); // New state to toggle form

    const toggleFeedbackForm = (id) => {
        setShowFeedbackForm(prev => ({ ...prev, [id]: !prev[id] }));
    };



    useEffect(() => {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('role');

        if (!token) {
            navigate('/login');
            return;
        }

        if (role === 'ROLE_ADMIN') {
            navigate('/admin');
            return;
        }

        const loadData = async () => {
            try {
                const data = await fetchGrievances();
                setGrievances(data);

                // Check feedback eligibility for resolved/closed complaints
                const eligibility = {};
                const feedbacks = {};

                for (const grievance of data) {
                    if (grievance.status === 'RESOLVED' || grievance.status === 'CLOSED') {
                        try {
                            // Check if feedback already exists
                            const feedbackResponse = await api.get(`/feedback/complaint/${grievance.id}`);

                            // If response has hasFeedback: false, no feedback exists yet
                            if (feedbackResponse.data.hasFeedback === false) {
                                // Check if user can submit feedback
                                const canSubmitResponse = await api.get(`/feedback/can-submit/${grievance.id}`);
                                eligibility[grievance.id] = canSubmitResponse.data.canSubmit;
                            }
                            // If response has an id property, it's a FeedbackResponse - feedback exists
                            else if (feedbackResponse.data.id) {
                                feedbacks[grievance.id] = feedbackResponse.data;
                                eligibility[grievance.id] = false;
                            }
                            // Fallback: check eligibility anyway
                            else {
                                const canSubmitResponse = await api.get(`/feedback/can-submit/${grievance.id}`);
                                eligibility[grievance.id] = canSubmitResponse.data.canSubmit;
                            }
                        } catch (err) {
                            console.error(`Failed to check feedback for complaint ${grievance.id}:`, err);
                            // On error, still try to check eligibility
                            try {
                                const canSubmitResponse = await api.get(`/feedback/can-submit/${grievance.id}`);
                                eligibility[grievance.id] = canSubmitResponse.data.canSubmit;
                            } catch (eligibilityErr) {
                                eligibility[grievance.id] = false;
                            }
                        }
                    }
                }

                setFeedbackEligibility(eligibility);
                setExistingFeedbacks(feedbacks);
                setLoading(false);
            } catch (error) {
                console.error("Failed to fetch", error);
                setError('Failed to load grievances');
                setLoading(false);
                if (error.response && error.response.status === 403) {
                    navigate('/login');
                }
            }
        };
        loadData();
    }, [navigate]);



    const handleInputChange = (e) => {
        setNewGrievance({ ...newGrievance, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        setSelectedFiles(Array.from(e.target.files));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setUploading(true);
            const grievanceData = {
                ...newGrievance,
                anonymous: isAnonymous
            };
            const created = await createGrievance(grievanceData);

            // Upload attached files if any
            if (selectedFiles.length > 0) {
                for (const file of selectedFiles) {
                    try {
                        await uploadAttachment(created.id, file);
                    } catch (uploadErr) {
                        console.error('Failed to upload file:', file.name, uploadErr);
                    }
                }
            }

            // Refresh grievances to get updated data with attachments
            const updatedList = await fetchGrievances();
            setGrievances(updatedList);

            setNewGrievance({ title: '', description: '', category: 'General', priority: 'Medium' });
            setSelectedFiles([]);
            setIsAnonymous(false);
            const fileInput = document.getElementById('file-input');
            if (fileInput) fileInput.value = '';
        } catch (err) {
            console.error("Failed to create", err);
            alert("Failed to create grievance. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this grievance?")) return;
        try {
            await deleteGrievance(id);
            setGrievances(grievances.filter(item => item.id !== id));
        } catch (err) {
            console.error("Failed to delete", err);
            alert("Failed to delete grievance.");
        }
    };

    // NOTE: handleLogout removed - logout handled in Navbar component
    const viewTimeline = async (complaintId) => {
        setTimelineModal({ open: true, complaintId, timeline: [], loading: true });
        try {
            const timeline = await getComplaintTimeline(complaintId);
            setTimelineModal({ open: true, complaintId, timeline, loading: false });
        } catch (err) {
            console.error('Failed to load timeline:', err);
            setTimelineModal({ open: true, complaintId, timeline: [], loading: false });
        }
    };

    const closeTimelineModal = () => {
        setTimelineModal({ open: false, complaintId: null, timeline: [], loading: false });
    };

    // Edit Modal Functions
    const openEditModal = (grievance) => {
        setEditData({
            title: grievance.title,
            description: grievance.description,
            category: grievance.category,
            priority: grievance.priority
        });
        setEditModal({ open: true, grievance });
    };

    const closeEditModal = () => {
        setEditModal({ open: false, grievance: null });
        setEditData({ title: '', description: '', category: '', priority: '' });
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setEditLoading(true);
        try {
            await updateGrievance(editModal.grievance.id, editData);
            const updatedList = await fetchGrievances();
            setGrievances(updatedList);
            closeEditModal();
            alert('Grievance updated successfully!');
        } catch (err) {
            console.error('Failed to update grievance:', err);
            alert('Failed to update grievance. Please try again.');
        } finally {
            setEditLoading(false);
        }
    };

    // Upload Modal Functions
    const openUploadModal = (grievanceId) => {
        setUploadModal({ open: true, grievanceId });
        setUploadFiles([]);
    };

    const closeUploadModal = () => {
        setUploadModal({ open: false, grievanceId: null });
        setUploadFiles([]);
    };

    const handleUploadFiles = async (e) => {
        e.preventDefault();
        if (uploadFiles.length === 0) {
            alert('Please select files to upload');
            return;
        }
        setUploadLoading(true);
        try {
            for (const file of uploadFiles) {
                await uploadAttachment(uploadModal.grievanceId, file);
            }
            const updatedList = await fetchGrievances();
            setGrievances(updatedList);
            closeUploadModal();
            alert('Files uploaded successfully!');
        } catch (err) {
            console.error('Failed to upload files:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Upload failed';
            alert(`Upload failed: ${errorMessage}`);
        } finally {
            setUploadLoading(false);
        }
    };

    const handleFeedbackSubmitted = async () => {
        // Reload grievances after feedback is submitted
        try {
            const updatedList = await fetchGrievances();
            setGrievances(updatedList);

            // Update feedback eligibility
            const eligibility = {};
            const feedbacks = {};

            for (const grievance of updatedList) {
                if (grievance.status === 'RESOLVED' || grievance.status === 'CLOSED') {
                    try {
                        const feedbackResponse = await api.get(`/feedback/complaint/${grievance.id}`);
                        if (feedbackResponse.data.hasFeedback === false) {
                            const canSubmitResponse = await api.get(`/feedback/can-submit/${grievance.id}`);
                            eligibility[grievance.id] = canSubmitResponse.data.canSubmit;
                        } else {
                            feedbacks[grievance.id] = feedbackResponse.data;
                            eligibility[grievance.id] = false;
                        }
                    } catch (err) {
                        eligibility[grievance.id] = false;
                    }
                }
            }

            setFeedbackEligibility(eligibility);
            setExistingFeedbacks(feedbacks);
        } catch (err) {
            console.error('Failed to reload after feedback:', err);
        }
    };

    if (loading) return <div className="dashboard-container"><p>Loading...</p></div>;

    return (
        <div className="dashboard-container">

            <header className="dashboard-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <h1>Dashboard - Welcome, {localStorage.getItem('username') || 'User'}</h1>
                    {localStorage.getItem('role') === 'ROLE_STAFF' && (
                        <button
                            onClick={() => navigate('/staff')}
                            className="btn btn-secondary"
                            style={{
                                padding: '0.5rem 1rem',
                                fontSize: '0.9rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            🛡️ Staff Dashboard
                        </button>
                    )}
                </div>
            </header>

            {/* Staff Application Promo */}
            <div className="staff-promo-banner" onClick={() => navigate('/apply-for-staff')}>
                <span className="promo-icon">🛡️</span>
                <div className="promo-text">
                    <strong>Want to help others?</strong>
                    <span>Apply to become a staff member and help resolve grievances!</span>
                </div>
                <button className="promo-btn">Apply Now →</button>
            </div>

            <div className="dashboard-content">
                <section className="create-section">
                    <div className="card">
                        <h3>Submit New Grievance</h3>
                        {error && <p className="error-msg">{error}</p>}
                        <form onSubmit={handleSubmit}>
                            <input
                                type="text"
                                name="title"
                                className="input-field"
                                placeholder="Title (e.g., WiFi Issue)"
                                value={newGrievance.title}
                                onChange={handleInputChange}
                                required
                            />
                            <textarea
                                name="description"
                                className="input-field"
                                placeholder="Describe your issue..."
                                rows="3"
                                value={newGrievance.description}
                                onChange={handleInputChange}
                                required
                            ></textarea>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Category</label>
                                    <select
                                        name="category"
                                        className="input-field select-field"
                                        value={newGrievance.category}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="General">General</option>
                                        <option value="Technical">Technical</option>
                                        <option value="Administrative">Administrative</option>
                                        <option value="Facilities">Facilities</option>
                                        <option value="Academic">Academic</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Urgency</label>
                                    <select
                                        name="priority"
                                        className="input-field select-field"
                                        value={newGrievance.priority}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                        <option value="Critical">Critical</option>
                                    </select>
                                </div>
                            </div>
                            <div className="file-input-wrapper">
                                <label htmlFor="file-input" className="file-label">
                                    📎 Attach Files (Images/PDFs)
                                </label>
                                <input
                                    type="file"
                                    id="file-input"
                                    className="file-input"
                                    accept="image/*,.pdf"
                                    multiple
                                    onChange={handleFileChange}
                                />
                                {selectedFiles.length > 0 && (
                                    <div className="selected-files">
                                        {selectedFiles.map((file, index) => (
                                            <span key={index} className="file-tag">{file.name}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="anonymous-toggle">
                                <label className="toggle-label">
                                    <input
                                        type="checkbox"
                                        checked={isAnonymous}
                                        onChange={(e) => setIsAnonymous(e.target.checked)}
                                    />
                                    <span className="toggle-text">Submit Anonymously</span>
                                </label>
                            </div>
                            <button type="submit" className="btn btn-primary" disabled={uploading}>
                                {uploading ? 'Submitting...' : 'Submit'}
                            </button>
                        </form>
                    </div>
                </section>

                <section className="list-section">
                    <h3>Your Grievances</h3>
                    <div className="grievance-grid">
                        {grievances.map(item => (
                            <div key={item.id} className="card grievance-card">
                                <div className="card-header">
                                    <div className="card-title-section">
                                        <div className="card-badges">
                                            {item.complaintNumber && (
                                                <span className="complaint-id">{item.complaintNumber}</span>
                                            )}
                                            {item.anonymous && (
                                                <span className="anonymous-badge">🔒 Anonymous</span>
                                            )}
                                        </div>
                                        <h4>{item.title}</h4>
                                    </div>
                                    <span className={`status-badge ${item.status ? item.status.toLowerCase() : 'pending'}`}>
                                        {item.status}
                                    </span>
                                </div>
                                <p className="text-dim">{item.description}</p>
                                <div className="card-meta">
                                    {item.category && <span className="meta-tag category-tag">{item.category}</span>}
                                    {item.priority && <span className={`meta-tag priority-tag priority-${item.priority.toLowerCase()}`}>{item.priority}</span>}
                                </div>

                                {/* Attachments */}
                                {item.attachments && item.attachments.length > 0 && (
                                    <div className="attachments-section">
                                        <span className="attachments-label">
                                            📎 Attachments ({item.attachments.length})
                                        </span>
                                        <div className="attachments-list">
                                            {item.attachments.map((att, idx) => (
                                                <button
                                                    key={idx}
                                                    className="attachment-link"
                                                    onClick={() => window.open(getAttachmentDownloadUrl(att.fileName), '_blank')}
                                                >
                                                    ⬇️ {att.fileName || `File ${idx + 1}`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Feedback Section - Show for RESOLVED/CLOSED complaints */}
                                {(item.status === 'RESOLVED' || item.status === 'CLOSED') && (
                                    <>
                                        {existingFeedbacks[item.id] ? (
                                            <div className="feedback-display">
                                                <div className="feedback-header">
                                                    <span className="feedback-label">✅ Your Feedback</span>
                                                    <div className="feedback-stars">
                                                        {[...Array(5)].map((_, i) => (
                                                            <span key={i} className={i < existingFeedbacks[item.id].rating ? 'star-filled' : 'star-empty'}>
                                                                ★
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                {existingFeedbacks[item.id].comment && (
                                                    <p className="feedback-comment">"{existingFeedbacks[item.id].comment}"</p>
                                                )}
                                                <small className="feedback-date">
                                                    Submitted on {new Date(existingFeedbacks[item.id].createdAt).toLocaleDateString()}
                                                </small>
                                            </div>
                                        ) : feedbackEligibility[item.id] && showFeedbackForm[item.id] && (
                                            <FeedbackForm
                                                complaintId={item.id}
                                                complaintTitle={item.title}
                                                onFeedbackSubmitted={handleFeedbackSubmitted}
                                            />
                                        )}
                                    </>
                                )}

                                <div className="card-actions">
                                    {/* Feedback Button - Visible for RESOLVED/CLOSED and eligible */}
                                    {(item.status === 'RESOLVED' || item.status === 'CLOSED') &&
                                     feedbackEligibility[item.id] && (
                                        <button
                                            className="btn-icon feedback-btn"
                                            onClick={() => toggleFeedbackForm(item.id)}
                                            title="Give Feedback"
                                        >
                                            ⭐ Feedback
                                        </button>
                                    )}

                                    <button className="btn-icon edit-btn" onClick={() => openEditModal(item)} title="Edit">
                                        ✏️ Edit
                                    </button>

                                    <button className="btn-icon timeline-btn" onClick={() => viewTimeline(item.id)} title="View Timeline">
                                        📋 Timeline
                                    </button>
                                    <button className="btn-icon delete" onClick={() => handleDelete(item.id)} title="Delete">
                                        🗑️ Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            {/* Timeline Modal */}
            {timelineModal.open && (
                <div className="modal-overlay" onClick={closeTimelineModal}>
                    <div className="modal-content timeline-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Status Timeline</h3>
                            <button className="modal-close" onClick={closeTimelineModal}>×</button>
                        </div>
                        <div className="modal-body">
                            {timelineModal.loading ? (
                                <p>Loading timeline...</p>
                            ) : timelineModal.timeline.length === 0 ? (
                                <p className="text-dim">No status updates yet.</p>
                            ) : (
                                <div className="timeline">
                                    {timelineModal.timeline.map((update, index) => (
                                        <div key={update.id || index} className="timeline-item">
                                            <div className="timeline-dot"></div>
                                            <div className="timeline-content">
                                                <div className="timeline-header">
                                                    <span className="timeline-status">
                                                        {update.oldStatus} → {update.newStatus}
                                                    </span>
                                                    <span className="timeline-date">
                                                        {new Date(update.updatedAt).toLocaleString()}
                                                    </span>
                                                </div>
                                                {update.updatedBy && (
                                                    <p className="timeline-admin">By: {update.updatedBy}</p>
                                                )}
                                                {update.comments && (
                                                    <p className="timeline-comment">{update.comments}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Grievance Modal */}
            {editModal.open && (
                <div className="modal-overlay" onClick={closeEditModal}>
                    <div className="modal-content edit-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>✏️ Edit Grievance</h3>
                            <button className="modal-close" onClick={closeEditModal}>×</button>
                        </div>
                        <form onSubmit={handleEditSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Title</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={editData.title}
                                        onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea
                                        className="input-field"
                                        rows="4"
                                        value={editData.description}
                                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Category</label>
                                        <select
                                            className="input-field"
                                            value={editData.category}
                                            onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                                        >
                                            <option value="General">General</option>
                                            <option value="Technical">Technical</option>
                                            <option value="Billing">Billing</option>
                                            <option value="Service">Service</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Priority</label>
                                        <select
                                            className="input-field"
                                            value={editData.priority}
                                            onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                                        >
                                            <option value="Low">Low</option>
                                            <option value="Medium">Medium</option>
                                            <option value="High">High</option>
                                            <option value="Critical">Critical</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => openUploadModal(editModal.grievance.id)}
                                    style={{ marginRight: 'auto' }}
                                >
                                    📎 Add Files
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={closeEditModal}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={editLoading}>
                                    {editLoading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Upload Modal */}
            {uploadModal.open && (
                <div className="modal-overlay" onClick={closeUploadModal}>
                    <div className="modal-content upload-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>📎 Upload Attachments</h3>
                            <button className="modal-close" onClick={closeUploadModal}>×</button>
                        </div>
                        <form onSubmit={handleUploadFiles}>
                            <div className="modal-body">
                                <p className="upload-info">Allowed file types: <strong>PDF, JPG, MP4</strong></p>
                                <div className="file-input-wrapper">
                                    <label htmlFor="upload-file-input" className="file-label large">
                                        📂 Select Files to Upload
                                    </label>
                                    <input
                                        type="file"
                                        id="upload-file-input"
                                        className="file-input"
                                        accept=".pdf,.jpg,.jpeg,.mp4"
                                        multiple
                                        onChange={(e) => setUploadFiles(Array.from(e.target.files))}
                                    />
                                </div>
                                {uploadFiles.length > 0 && (
                                    <div className="selected-files">
                                        {uploadFiles.map((file, index) => (
                                            <span key={index} className="file-tag">{file.name}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={closeUploadModal}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={uploadLoading || uploadFiles.length === 0}>
                                    {uploadLoading ? 'Uploading...' : 'Upload Files'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
