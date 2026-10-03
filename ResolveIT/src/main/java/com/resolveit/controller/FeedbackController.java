package com.resolveit.controller;

import com.resolveit.dto.FeedbackRequest;
import com.resolveit.dto.FeedbackResponse;
import com.resolveit.model.User;
import com.resolveit.service.FeedbackService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * FeedbackController - REST API for managing user feedback on resolved complaints
 *
 * Base URL: /api/feedback
 *
 * Endpoints:
 * - POST /submit - Submit feedback for a resolved complaint
 * - GET /complaint/{complaintId} - Get feedback for a specific complaint
 * - GET /can-submit/{complaintId} - Check if user can submit feedback
 * - GET /my-feedbacks - Get all feedbacks by current user
 * - GET /positive-reviews - Get positive reviews (for homepage)
 * - GET /stats - Get feedback statistics
 */
@RestController
@RequestMapping("/api/feedback")
@CrossOrigin(origins = "http://localhost:3000")
public class FeedbackController {

    private final FeedbackService feedbackService;

    public FeedbackController(FeedbackService feedbackService) {
        this.feedbackService = feedbackService;
    }

    /**
     * Submit feedback for a resolved complaint
     */
    @PostMapping("/submit")
    public ResponseEntity<?> submitFeedback(
            @Valid @RequestBody FeedbackRequest request,
            @AuthenticationPrincipal User currentUser) {
        try {
            FeedbackResponse response = feedbackService.submitFeedback(request, currentUser);
            return ResponseEntity.ok(response);
        } catch (IllegalStateException | NoSuchElementException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Get feedback for a specific complaint
     */
    @GetMapping("/complaint/{complaintId}")
    public ResponseEntity<?> getFeedbackByComplaint(@PathVariable Long complaintId) {
        FeedbackResponse feedback = feedbackService.getFeedbackByComplaint(complaintId);
        if (feedback == null) {
            return ResponseEntity.ok(Map.of("hasFeedback", false));
        }
        return ResponseEntity.ok(feedback);
    }

    /**
     * Check if user can submit feedback for a complaint
     */
    @GetMapping("/can-submit/{complaintId}")
    public ResponseEntity<Map<String, Boolean>> canSubmitFeedback(
            @PathVariable Long complaintId,
            @AuthenticationPrincipal User currentUser) {
        boolean canSubmit = feedbackService.canSubmitFeedback(complaintId, currentUser);
        return ResponseEntity.ok(Map.of("canSubmit", canSubmit));
    }

    /**
     * Get all feedbacks by current user
     */
    @GetMapping("/my-feedbacks")
    public ResponseEntity<List<FeedbackResponse>> getMyFeedbacks(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(feedbackService.getFeedbacksByUser(currentUser.getId()));
    }

    /**
     * Get positive reviews (rating >= 4) for homepage display
     */
    @GetMapping("/positive-reviews")
    public ResponseEntity<List<FeedbackResponse>> getPositiveReviews() {
        return ResponseEntity.ok(feedbackService.getPositiveReviews());
    }

    /**
     * Get feedback statistics
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getFeedbackStats() {
        return ResponseEntity.ok(feedbackService.getFeedbackStats());
    }
}
