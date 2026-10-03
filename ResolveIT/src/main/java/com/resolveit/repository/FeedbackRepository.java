package com.resolveit.repository;

import com.resolveit.model.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    /**
     * Find feedback by complaint ID
     */
    Optional<Feedback> findByComplaintId(Long complaintId);

    /**
     * Check if feedback exists for a complaint
     */
    boolean existsByComplaintId(Long complaintId);

    /**
     * Get all feedbacks by user
     */
    List<Feedback> findByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * Get all feedbacks with rating >= threshold (for positive reviews)
     */
    List<Feedback> findByRatingGreaterThanEqualOrderByCreatedAtDesc(Integer rating);

    /**
     * Count total feedbacks
     */
    long count();

    /**
     * Get average rating across all feedbacks
     */
    @org.springframework.data.jpa.repository.Query("SELECT AVG(f.rating) FROM Feedback f")
    Double getAverageRating();
}
