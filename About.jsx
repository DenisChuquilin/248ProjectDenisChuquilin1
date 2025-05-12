import React from 'react';
import { Link } from 'react-router-dom';
import './App.css';

function About() {
  return (
    <>
      <div className="header-bar">
        <div className="header-left">
          <img src="/logo.png" alt="Food Fixer Logo" className="header-logo" />
          <span className="header-text">Food Fixer</span>
        </div>
        <nav className="nav-links">
          <Link to="/" className="nav-link">Home</Link>
        </nav>
      </div>

      <div className="about-page">
        <div className="about-overlay">
          <div className="about-content">
            <h1>About Food Fixer</h1>
            <div className="about-grid">
              <div className="about-box">
                <h3>Our Mission</h3>
                <p>At Food Fixer, we're passionate about helping people transform everyday ingredients into delicious meals. Our platform combines innovative recipe generation with practical cooking solutions. We believe that everyone should have access to creative and healthy meal ideas, regardless of their cooking experience.</p>
                <p>Our AI-powered system helps reduce food waste by suggesting recipes based on ingredients you already have, making cooking more efficient and environmentally friendly.</p>
              </div>
              <div className="about-box">
                <h3>What We Do</h3>
                <p>We provide smart recipe suggestions based on your available ingredients, complete with nutritional information and video tutorials. Our goal is to make cooking easier and more enjoyable for everyone.</p>
                <p>Our platform features:</p>
                <ul>
                  <li>AI-powered recipe generation</li>
                  <li>Nutritional information tracking</li>
                  <li>YouTube video tutorials</li>
                  <li>Allergy-aware recipe suggestions</li>
                  <li>Recipe history tracking</li>
                </ul>
              </div>
              <div className="about-box">
                <h3>Our Vision</h3>
                <p>We envision a world where no ingredient goes to waste and where everyone can cook with confidence. Through our platform, we're making this vision a reality, one recipe at a time.</p>
                <p>Our commitment to innovation and user experience drives us to continuously improve our platform, making it more intuitive and helpful for cooks of all skill levels.</p>
              </div>
            </div>
            <div className="about-footer">
              <p>Join us in our mission to make cooking more accessible and enjoyable for everyone.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default About; 