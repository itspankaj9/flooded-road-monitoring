import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import './Footer.css';

const Footer = () => {
  const { t } = useContext(AppContext) || { t: (k) => k };
  return (
    <footer className="footer">
      <div className="container footer-container">
        <div className="footer-brand">
          <span className="footer-logo">FloodWatch</span>
          <p className="footer-copy">© {new Date().getFullYear()} Department of Infrastructure & Emergency Management. All rights reserved.</p>
        </div>
        <nav className="footer-nav">
          <Link to="/emergency-contacts" className="footer-link">{t('emergency_contacts')}</Link>
          <Link to="/privacy-policy" className="footer-link">{t('privacy_policy')}</Link>
          <Link to="/accessibility" className="footer-link">{t('accessibility')}</Link>
          <Link to="/data-api" className="footer-link">{t('data_api')}</Link>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
