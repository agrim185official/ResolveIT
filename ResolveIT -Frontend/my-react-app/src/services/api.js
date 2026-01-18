import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api'; // Adjust based on your Java backend port

// Create an Axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to attach the token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Auto logout on server down or 5xx errors
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const token = localStorage.getItem('token');

    // Check if server is down (network error) or 5xx server error
    const isServerDown = !error.response || (error.response && error.response.status >= 500);
    const isNetworkError = error.message === 'Network Error' || error.code === 'ERR_NETWORK';

    if (token && (isServerDown || isNetworkError)) {
      console.error('Server appears to be down. Logging out for security.');
      // Clear auth data
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      // Show alert and redirect to login
      alert('Server connection lost. You have been logged out for security reasons.');
      window.location.href = '/login';
    }

    console.error('API Error:', error.response || error.message);
    return Promise.reject(error);
  }
);

export const loginUser = async (credentials) => {
  try {
    // Matches AuthController @RequestMapping("/api/auth") and @PostMapping("/login")
    return await apiClient.post('/auth/login', credentials);
  } catch (error) {
    throw error;
  }
};

export const registerUser = async (userData) => {
  try {
    // Matches AuthController @RequestMapping("/api/auth") and @PostMapping("/register")
    return await apiClient.post('/auth/register', userData);
  } catch (error) {
    throw error;
  }
};

export const fetchGrievances = async () => {
  try {
    // Matches ComplaintController @GetMapping("/my-complaints")
    return await apiClient.get('/complaints/my-complaints');
  } catch (error) {
    throw error;
  }
};

export const createGrievance = async (grievanceData) => {
  try {
    // Matches ComplaintController @PostMapping
    return await apiClient.post('/complaints', grievanceData);
  } catch (error) {
    throw error;
  }
};

export const deleteGrievance = async (id) => {
  try {
    // Matches ComplaintController @DeleteMapping("/{id}")
    return await apiClient.delete(`/complaints/${id}`);
  } catch (error) {
    throw error;
  }
};

export const updateGrievance = async (id, grievanceData) => {
  try {
    // Matches ComplaintController @PutMapping("/{id}")
    return await apiClient.put(`/complaints/${id}`, grievanceData);
  } catch (error) {
    throw error;
  }
};

export const updateGrievanceStatus = async (id, status) => {
  try {
    // Matches ComplaintController @PutMapping("/{id}/status")
    // Note: Backend expects StatusUpdateRequest body
    return await apiClient.put(`/complaints/${id}/status`, { status });
  } catch (error) {
    throw error;
  }
};

export const escalateComplaint = async (id) => {
  try {
    // Admin only endpoint to manually escalate
    return await apiClient.post(`/complaints/${id}/escalate`);
  } catch (error) {
    throw error;
  }
};

export const uploadAttachment = async (complaintId, file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');
    // Use axios directly for multipart/form-data
    const response = await axios.post(
      `${API_BASE_URL}/complaints/${complaintId}/attachments`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getAttachments = async (complaintId) => {
  try {
    return await apiClient.get(`/complaints/${complaintId}/attachments`);
  } catch (error) {
    throw error;
  }
};

export const getAttachmentDownloadUrl = (attachmentId) => {
  return `${API_BASE_URL}/complaints/attachments/${attachmentId}`;
};

export const getComplaintTimeline = async (complaintId) => {
  try {
    return await apiClient.get(`/complaints/${complaintId}/timeline`);
  } catch (error) {
    throw error;
  }
};

export const fetchAllGrievances = async () => {
  try {
    // Admin endpoint to get all complaints as a list
    return await apiClient.get('/complaints/all');
  } catch (error) {
    throw error;
  }
};

export const updateGrievanceStatusWithComment = async (id, status, comments, assignedToEmail = '') => {
  try {
    return await apiClient.put(`/complaints/${id}/status`, { status, comments, assignedToEmail });
  } catch (error) {
    throw error;
  }
};

export const resetComplaintsData = async () => {
  try {
    // Admin endpoint to reset all complaint data
    return await apiClient.post('/complaints/reset-data');
  } catch (error) {
    throw error;
  }
};

// Staff endpoint to get assigned complaints
export const getAssignedGrievances = async () => {
  try {
    // Response interceptor already extracts response.data
    return await apiClient.get('/complaints/assigned');
  } catch (error) {
    throw error;
  }
};

// Staff endpoint to report complaint as resolved (creates notification for admin)
export const reportComplaintResolved = async (id) => {
  try {
    return await apiClient.post(`/complaints/${id}/report-resolved`);
  } catch (error) {
    throw error;
  }
};

// Staff endpoint to request any status change (creates notification for admin)
export const requestStatusChange = async (id, requestedStatus, comment) => {
  try {
    return await apiClient.post(`/complaints/${id}/request-status-change`, { requestedStatus, comment });
  } catch (error) {
    throw error;
  }
};

// ==================== Notification Endpoints ====================

// Get all notifications (admin only)
export const getNotifications = async () => {
  try {
    return await apiClient.get('/notifications');
  } catch (error) {
    throw error;
  }
};

// Get unread notification count (admin only)
export const getUnreadNotificationCount = async () => {
  try {
    return await apiClient.get('/notifications/unread-count');
  } catch (error) {
    throw error;
  }
};

// Mark a notification as read (admin only)
export const markNotificationAsRead = async (id) => {
  try {
    return await apiClient.put(`/notifications/${id}/read`);
  } catch (error) {
    throw error;
  }
};

// Mark all notifications as read (admin only)
export const markAllNotificationsAsRead = async () => {
  try {
    return await apiClient.put('/notifications/read-all');
  } catch (error) {
    throw error;
  }
};

// ============= USER NOTIFICATIONS =============

// Get all user notifications
export const getUserNotifications = async () => {
  try {
    return await apiClient.get('/user-notifications');
  } catch (error) {
    throw error;
  }
};

// Get unread user notification count
export const getUnreadUserNotificationCount = async () => {
  try {
    return await apiClient.get('/user-notifications/unread-count');
  } catch (error) {
    throw error;
  }
};

// Mark a user notification as read
export const markUserNotificationAsRead = async (id) => {
  try {
    return await apiClient.put(`/user-notifications/${id}/read`);
  } catch (error) {
    throw error;
  }
};

// Mark all user notifications as read
export const markAllUserNotificationsAsRead = async () => {
  try {
    return await apiClient.put('/user-notifications/read-all');
  } catch (error) {
    throw error;
  }
};

// ============= REPORTS =============

// Get report statistics
export const getReportStats = async () => {
  try {
    return await apiClient.get('/reports/stats');
  } catch (error) {
    throw error;
  }
};

// Get trends data
export const getReportTrends = async () => {
  try {
    return await apiClient.get('/reports/trends');
  } catch (error) {
    throw error;
  }
};

// Export CSV
export const exportReportCsv = async () => {
  try {
    const response = await apiClient.get('/reports/export/csv', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'complaints_report.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    throw error;
  }
};

// Export PDF
export const exportReportPdf = async () => {
  try {
    const response = await apiClient.get('/reports/export/pdf', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'complaints_report.pdf');
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    throw error;
  }
};

// ==================== Staff Application API ====================

// Get staff test questions
export const getStaffTestQuestions = async () => {
  try {
    return await apiClient.get('/staff-applications/questions');
  } catch (error) {
    throw error;
  }
};

// Submit staff application with answers
export const submitStaffApplication = async (answers) => {
  try {
    return await apiClient.post('/staff-applications/submit', { answers });
  } catch (error) {
    throw error;
  }
};

// Get my application status
export const getMyApplicationStatus = async () => {
  try {
    return await apiClient.get('/staff-applications/my-status');
  } catch (error) {
    throw error;
  }
};

// Get pending applications (admin)
export const getPendingStaffApplications = async () => {
  try {
    return await apiClient.get('/staff-applications/pending');
  } catch (error) {
    throw error;
  }
};

// Approve staff application (admin)
export const approveStaffApplication = async (id) => {
  try {
    return await apiClient.post(`/staff-applications/${id}/approve`);
  } catch (error) {
    throw error;
  }
};

// Reject staff application (admin)
export const rejectStaffApplication = async (id, reason) => {
  try {
    return await apiClient.post(`/staff-applications/${id}/reject`, { reason });
  } catch (error) {
    throw error;
  }
};

// Get all staff members (admin)
export const getStaffList = async () => {
  try {
    return await apiClient.get('/staff-applications/staff-list');
  } catch (error) {
    throw error;
  }
};

export default apiClient;

