package com.resolveit.service;

import com.resolveit.dto.FeedbackRequest;
import com.resolveit.dto.FeedbackResponse;
import com.resolveit.model.Complaint;
import com.resolveit.model.ComplaintStatus;
import com.resolveit.model.Feedback;
import com.resolveit.model.User;
import com.resolveit.repository.ComplaintRepository;
import com.resolveit.repository.FeedbackRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@Service
public class FeedbackService {

    private final FeedbackRepository feedbackRepository;
    private final ComplaintRepository complaintRepository;

    public FeedbackService(FeedbackRepository feedbackRepository,
                          ComplaintRepository complaintRepository) {
        this.feedbackRepository = feedbackRepository;
        this.complaintRepository = complaintRepository;
    }

    /**
     * Submit feedback for a resolved complaint
     */
    @Transactional
    public FeedbackResponse submitFeedback(FeedbackRequest request, User user) {
        // Find the complaint
        Complaint complaint = complaintRepository.findById(request.getComplaintId())
                .orElseThrow(() -> new NoSuchElementException("Complaint not found"));

        // Verify complaint is resolved or closed
        if (complaint.getStatus() != ComplaintStatus.RESOLVED &&
            complaint.getStatus() != ComplaintStatus.CLOSED) {
            throw new IllegalStateException("Feedback can only be submitted for resolved or closed complaints");
        }

        // Verify the user owns this complaint
        if (!complaint.getCreatedBy().getId().equals(user.getId())) {
            throw new IllegalStateException("You can only provide feedback for your own complaints");
        }

        // Check if feedback already exists
        if (feedbackRepository.existsByComplaintId(request.getComplaintId())) {
            throw new IllegalStateException("Feedback already submitted for this complaint");
        }

        // Create and save feedback
        Feedback feedback = new Feedback(complaint, user, request.getRating(), request.getComment());
        feedback = feedbackRepository.save(feedback);

        return convertToResponse(feedback);
    }

    /**
     * Get feedback for a specific complaint
     */
    @Transactional(readOnly = true)
    public FeedbackResponse getFeedbackByComplaint(Long complaintId) {
        return feedbackRepository.findByComplaintId(complaintId)
                .map(this::convertToResponse)
                .orElse(null);
    }

    /**
     * Check if user can submit feedback for a complaint
     */
    @Transactional(readOnly = true)
    public boolean canSubmitFeedback(Long complaintId, User user) {
        Complaint complaint = complaintRepository.findById(complaintId).orElse(null);
        if (complaint == null) {
            return false;
        }

        // Must be resolved or closed, owned by user, and no existing feedback
        return (complaint.getStatus() == ComplaintStatus.RESOLVED ||
                complaint.getStatus() == ComplaintStatus.CLOSED) &&
               complaint.getCreatedBy().getId().equals(user.getId()) &&
               !feedbackRepository.existsByComplaintId(complaintId);
    }

    /**
     * Get all feedbacks by user
     */
    @Transactional(readOnly = true)
    public List<FeedbackResponse> getFeedbacksByUser(Long userId) {
        return feedbackRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get positive reviews (rating >= 4) for homepage display
     */
    @Transactional(readOnly = true)
    public List<FeedbackResponse> getPositiveReviews() {
        return feedbackRepository.findByRatingGreaterThanEqualOrderByCreatedAtDesc(4)
                .stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get feedback statistics
     */
    @Transactional(readOnly = true)
    public java.util.Map<String, Object> getFeedbackStats() {
        java.util.Map<String, Object> stats = new java.util.HashMap<>();
        stats.put("totalFeedbacks", feedbackRepository.count());
        stats.put("averageRating", feedbackRepository.getAverageRating());
        return stats;
    }

    private FeedbackResponse convertToResponse(Feedback feedback) {
        FeedbackResponse response = new FeedbackResponse();
        response.setId(feedback.getId());
        response.setComplaintId(feedback.getComplaint().getId());
        response.setComplaintNumber(feedback.getComplaint().getComplaintNumber());
        response.setComplaintTitle(feedback.getComplaint().getTitle());
        response.setUserName(feedback.getUser().getName());
        response.setRating(feedback.getRating());
        response.setComment(feedback.getComment());
        response.setCreatedAt(feedback.getCreatedAt());
        return response;
    }
}
