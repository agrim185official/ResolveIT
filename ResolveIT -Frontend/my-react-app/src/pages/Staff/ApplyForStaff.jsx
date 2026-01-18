import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStaffTestQuestions, submitStaffApplication, getMyApplicationStatus } from '../../services/api';
import './ApplyForStaff.css';

const ApplyForStaff = () => {
    const navigate = useNavigate();
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [existingApplication, setExistingApplication] = useState(null);
    const [result, setResult] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);

            // Check if user already has an application
            const status = await getMyApplicationStatus();
            if (status && status.id) {
                setExistingApplication(status);
                setLoading(false);
                return;
            }

            // Load questions
            const questionsData = await getStaffTestQuestions();
            setQuestions(questionsData);
            setAnswers(new Array(questionsData.length).fill(null));
        } catch (err) {
            console.error('Failed to load:', err);
            setError('Failed to load application data');
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerChange = (questionIndex, answerIndex) => {
        const newAnswers = [...answers];
        newAnswers[questionIndex] = answerIndex;
        setAnswers(newAnswers);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate all questions answered
        if (answers.includes(null)) {
            setError('Please answer all questions before submitting');
            return;
        }

        try {
            setSubmitting(true);
            setError('');
            const response = await submitStaffApplication(answers);
            setResult(response);
        } catch (err) {
            console.error('Submit failed:', err);
            setError(err.response?.data?.message || 'Failed to submit application');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'PENDING': return '#f59e0b';
            case 'APPROVED': return '#10b981';
            case 'REJECTED': return '#ef4444';
            default: return '#6b7280';
        }
    };

    if (loading) {
        return (
            <div className="apply-container">
                <div className="loading-message">Loading...</div>
            </div>
        );
    }

    // Show existing application status
    if (existingApplication) {
        return (
            <div className="apply-container">
                <div className="status-card">
                    <h2>📋 Your Staff Application</h2>

                    <div className="status-badge" style={{ backgroundColor: getStatusColor(existingApplication.status) }}>
                        {existingApplication.status}
                    </div>

                    <div className="score-display">
                        <span className="score-label">Test Score</span>
                        <span className="score-value">
                            {existingApplication.testScore}/{existingApplication.totalQuestions}
                            <span className="score-percent">({existingApplication.scorePercentage?.toFixed(0)}%)</span>
                        </span>
                    </div>

                    <div className="info-grid">
                        <div className="info-item">
                            <span className="info-label">Submitted</span>
                            <span className="info-value">{new Date(existingApplication.submittedAt).toLocaleDateString()}</span>
                        </div>
                        {existingApplication.reviewedAt && (
                            <div className="info-item">
                                <span className="info-label">Reviewed</span>
                                <span className="info-value">{new Date(existingApplication.reviewedAt).toLocaleDateString()}</span>
                            </div>
                        )}
                    </div>

                    {existingApplication.status === 'PENDING' && (
                        <p className="pending-message">
                            ⏳ Your application is being reviewed by an administrator. You will be notified once a decision is made.
                        </p>
                    )}

                    {existingApplication.status === 'APPROVED' && (
                        <div className="approved-section">
                            <p className="success-message">
                                🎉 Congratulations! You have been approved as a staff member.
                            </p>
                            <button className="btn-primary" onClick={() => {
                                localStorage.setItem('role', 'ROLE_STAFF');
                                navigate('/staff');
                            }}>
                                Go to Staff Dashboard
                            </button>
                        </div>
                    )}

                    {existingApplication.status === 'REJECTED' && (
                        <div className="rejected-section">
                            <p className="error-message">
                                ❌ Unfortunately, your application was not approved.
                            </p>
                            {existingApplication.rejectionReason && (
                                <p className="rejection-reason">
                                    Reason: {existingApplication.rejectionReason}
                                </p>
                            )}
                        </div>
                    )}

                    <button className="btn-secondary" onClick={() => navigate('/dashboard')}>
                        ← Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // Show result after submission
    if (result) {
        return (
            <div className="apply-container">
                <div className="result-card">
                    <h2>📝 Application Submitted!</h2>

                    <div className="score-display large">
                        <span className="score-label">Your Score</span>
                        <span className="score-value">
                            {result.testScore}/{result.totalQuestions}
                        </span>
                        <span className={`score-badge ${result.isPassing ? 'passing' : 'failing'}`}>
                            {result.scorePercentage?.toFixed(0)}%
                        </span>
                    </div>

                    <div className={`result-message ${result.isPassing ? 'success' : 'warning'}`}>
                        {result.isPassing ? (
                            <>
                                <span className="icon">✅</span>
                                <p>You passed the eligibility test! Your application has been submitted for admin review.</p>
                            </>
                        ) : (
                            <>
                                <span className="icon">⚠️</span>
                                <p>Your score is below the passing threshold (70%). However, your application has still been submitted for admin consideration.</p>
                            </>
                        )}
                    </div>

                    <p className="next-steps">
                        An administrator will review your application and make a decision. You will be notified of the outcome.
                    </p>

                    <button className="btn-primary" onClick={() => navigate('/dashboard')}>
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // Show quiz form
    return (
        <div className="apply-container">
            <div className="apply-header">
                <h1>🛡️ Apply to Become Staff</h1>
                <p>Complete the eligibility test below to apply for a staff position. You need at least 70% to pass.</p>
            </div>

            <div className="eligibility-criteria">
                <h3>📋 Eligibility Criteria</h3>
                <ul>
                    <li>✓ Must be a registered user in good standing</li>
                    <li>✓ Understanding of grievance handling principles</li>
                    <li>✓ Professional communication skills</li>
                    <li>✓ Commitment to helping users</li>
                </ul>
            </div>

            {error && <div className="error-banner">{error}</div>}

            <form onSubmit={handleSubmit} className="quiz-form">
                <h2>📝 Eligibility Test ({questions.length} Questions)</h2>

                {questions.map((q, qIndex) => (
                    <div key={qIndex} className="question-card">
                        <div className="question-header">
                            <span className="question-number">Q{q.number}</span>
                            <span className="question-text">{q.question}</span>
                        </div>
                        <div className="options-list">
                            {q.options.map((option, oIndex) => (
                                <label
                                    key={oIndex}
                                    className={`option-label ${answers[qIndex] === oIndex ? 'selected' : ''}`}
                                >
                                    <input
                                        type="radio"
                                        name={`question-${qIndex}`}
                                        value={oIndex}
                                        checked={answers[qIndex] === oIndex}
                                        onChange={() => handleAnswerChange(qIndex, oIndex)}
                                    />
                                    <span className="option-letter">{String.fromCharCode(65 + oIndex)}</span>
                                    <span className="option-text">{option}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                ))}

                <div className="form-actions">
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => navigate('/dashboard')}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={submitting || answers.includes(null)}
                    >
                        {submitting ? 'Submitting...' : 'Submit Application'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ApplyForStaff;
