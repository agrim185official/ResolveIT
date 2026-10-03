import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import heroImage from '../../assets/hero-image.png';
import teamImage from '../../assets/team.png';
import mobileImage from '../../assets/mobile.png';
import api from '../../services/api';
import './Home.css';

const Home = () => {
  const images = [heroImage, teamImage, mobileImage];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [testimonials, setTestimonials] = useState([]);
  const [stats, setStats] = useState({ totalFeedbacks: 0, averageRating: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 4000); // Change every 4 seconds

    return () => clearInterval(interval);
  }, [images.length]);

  useEffect(() => {
    // Fetch positive reviews for testimonials
    const fetchTestimonials = async () => {
      try {
        const response = await api.get('/feedback/positive-reviews');
        setTestimonials(response.data.slice(0, 3)); // Show top 3
      } catch (error) {
        console.error('Failed to fetch testimonials:', error);
      }
    };

    // Fetch feedback stats
    const fetchStats = async () => {
      try {
        const response = await api.get('/feedback/stats');
        if (response && response.data) {
          setStats(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    fetchTestimonials();
    fetchStats();
  }, []);

  return (
    <div className="home-wrapper">
      <Helmet>
        <title>ResolveIT - Effortless Grievance Management System</title>
        <meta name="description" content="ResolveIT is a modern grievance management platform that streamlines complaints, tracks resolutions, and improves user satisfaction with enterprise-grade security and analytics." />
        <meta name="keywords" content="grievance management, complaint system, issue tracking, customer support, feedback management, enterprise software" />
        <meta property="og:title" content="ResolveIT - Effortless Grievance Management" />
        <meta property="og:description" content="Streamline complaints, track resolutions, and improve user satisfaction with our enterprise-grade platform." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="ResolveIT - Effortless Grievance Management" />
        <meta name="twitter:description" content="Modern grievance management platform with enterprise-grade security and real-time analytics." />
        <link rel="canonical" href="https://resolveit.com" />
      </Helmet>

      {/* Navigation */}
      <nav className="navbar">
        <div className="logo fade-in" style={{ paddingLeft: '60px' }}>ResolveIT</div>
        <div className="nav-links">
          <Link to="/login" className="nav-link slide-down">Sign In</Link>
          <Link to="/register" className="btn btn-primary btn-sm slide-down" style={{ animationDelay: '0.1s' }}>Get Started</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero-section">
        <div className="hero-content slide-up">
          <h1 className="hero-headline">
            Effortless Grievance <br /> Management for the Modern Era
          </h1>
          <p className="hero-subtext">
            Streamline complaints, track resolutions, and improve user satisfaction with
            our enterprise-grade platform. Data-driven and secure.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="btn btn-primary btn-lg hover-lift">Get Started</Link>
            <Link to="/login" className="btn btn-secondary btn-lg hover-lift">Sign In</Link>
          </div>
        </div>
        <div className="hero-visual fade-in-slow">
          <div className="carousel-container">
            {images.map((img, index) => (
              <img
                key={index}
                src={img}
                alt={`Slide ${index + 1}`}
                className={`hero-image carousel-image ${index === currentImageIndex ? 'active' : ''}`}
              />
            ))}
          </div>
          {/* Carousel Indicators */}
          <div className="carousel-indicators">
            {images.map((_, index) => (
              <span
                key={index}
                className={`indicator ${index === currentImageIndex ? 'active' : ''}`}
                onClick={() => setCurrentImageIndex(index)}
              ></span>
            ))}
          </div>
        </div>
      </header>

      {/* Trust Indicators */}
      <section className="stats-bar slide-up" style={{ animationDelay: '0.3s' }}>
        <div className="stat-item">
          <span className="stat-number">10k+</span>
          <span className="stat-label">Issues Resolved</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{stats && stats.averageRating !== undefined ? stats.averageRating.toFixed(1) : '4.8'}/5</span>
          <span className="stat-label">User Rating</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">24/7</span>
          <span className="stat-label">Support Access</span>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="features-section">
        <div className="section-header scroll-reveal">
          <h2>Why Choose ResolveIT?</h2>
          <p>Built for efficiency, designed for people.</p>
        </div>

        <div className="features-container">
          <div className="feature-box hover-scale">
            <div className="feature-icon">⚡</div>
            <h3>Rapid Resolution</h3>
            <p>Automated routing ensures grievances reach the right team instantly.</p>
          </div>
          <div className="feature-box hover-scale" style={{ transitionDelay: '0.1s' }}>
            <div className="feature-icon">🛡️</div>
            <h3>Enterprise Security</h3>
            <p>Bank-grade encryption keeps your sensitive data protected at all times.</p>
          </div>
          <div className="feature-box hover-scale" style={{ transitionDelay: '0.2s' }}>
            <div className="feature-icon">📊</div>
            <h3>Insightful Analytics</h3>
            <p>Gain actionable insights into recurring issues and team performance.</p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      {testimonials.length > 0 && (
        <section className="testimonials-section">
          <div className="section-header">
            <h2>What Our Users Say</h2>
            <p>Real feedback from satisfied customers</p>
          </div>

          <div className="testimonials-container">
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="testimonial-card hover-scale">
                <div className="testimonial-rating">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className={i < testimonial.rating ? 'star-filled' : 'star-empty'}>
                      ★
                    </span>
                  ))}
                </div>
                <p className="testimonial-comment">
                  "{testimonial.comment || 'Great service! My issue was resolved quickly and professionally.'}"
                </p>
                <div className="testimonial-footer">
                  <span className="testimonial-author">{testimonial.userName}</span>
                  <span className="testimonial-complaint">Complaint #{testimonial.complaintNumber}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Call to Action */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Transform Your Grievance Management?</h2>
          <p>Join thousands of organizations managing complaints efficiently</p>
          <Link to="/register" className="btn btn-primary btn-lg hover-lift">Get Started Free</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-links">
            <Link to="/login">Sign In</Link>
            <Link to="/register">Register</Link>
            <a href="#features">Features</a>
            <a href="#contact">Contact</a>
          </div>
          <p>&copy; 2026 ResolveIT Systems. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
