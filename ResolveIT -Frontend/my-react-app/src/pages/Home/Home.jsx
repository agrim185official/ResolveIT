import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import heroImage from '../../assets/hero-image.png';
import teamImage from '../../assets/team.png';
import mobileImage from '../../assets/mobile.png';
import './Home.css';

const Home = () => {
  const images = [heroImage, teamImage, mobileImage];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 4000); // Change every 4 seconds

    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="home-wrapper">
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
          <span className="stat-number">99%</span>
          <span className="stat-label">Uptime Guarantee</span>
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

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <p>&copy; 2025 ResolveIT Systems. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
