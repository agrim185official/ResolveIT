import React, { useState } from 'react';
import api from '../services/api';
import './FeedbackForm.css';

const FeedbackForm = ({ complaintId, complaintTitle, onFeedbackSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await api.post('/feedback/submit', {
        complaintId,
        rating,
        comment: comment.trim() || null
      });

      setSuccess(true);
      setTimeout(() => {
        if (onFeedbackSubmitted) {
          onFeedbackSubmitted();
        }
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit feedback');
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="feedback-success">
        <div className="success-icon">✓</div>
        <h3>Thank You for Your Feedback!</h3>
        <p>Your review helps us improve our service.</p>
      </div>
    );
  }

  return (
    <div className="feedback-form-container">
      <h3>Rate Your Experience</h3>
      <p className="feedback-subtitle">
        How satisfied are you with the resolution of: <strong>{complaintTitle}</strong>?
      </p>

      <form onSubmit={handleSubmit} className="feedback-form">
        <div className="star-rating">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={`star ${star <= (hoveredRating || rating) ? 'active' : ''}`}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
            >
              ★
            </span>
          ))}
        </div>

        {rating > 0 && (
          <p className="rating-label">
            {rating === 1 && 'Poor'}
            {rating === 2 && 'Fair'}
            {rating === 3 && 'Good'}
            {rating === 4 && 'Very Good'}
            {rating === 5 && 'Excellent'}
          </p>
        )}

        <div className="form-group">
          <label htmlFor="comment">Additional Comments (Optional)</label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us more about your experience..."
            rows="4"
            maxLength="500"
          />
          <small>{comment.length}/500 characters</small>
        </div>

        {error && <div className="error-message">{error}</div>}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting || rating === 0}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  );
};

export default FeedbackForm;
