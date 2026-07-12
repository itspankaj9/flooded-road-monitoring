import React from 'react';
import './FooterPages.css';

const EmergencyContacts = () => {
  return (
    <div className="container footer-page-container">
      <div className="footer-page-header">
        <h1 className="footer-page-title">Emergency Contacts</h1>
        <p className="footer-page-subtitle">Critical response numbers for immediate assistance</p>
      </div>
      
      <div className="footer-page-content">
        <p>If you are experiencing a life-threatening emergency or immediate danger, please dial <strong>911</strong> immediately.</p>
        <p>For infrastructure-related emergencies, hazards, or public service inquiries, please use the directory below to contact the appropriate civic authority.</p>

        <div className="contacts-grid">
          <div className="contact-card">
            <div className="contact-icon">
              <span className="material-symbols-outlined">flood</span>
            </div>
            <h3>Flood & Disaster Response</h3>
            <p>National Emergency Management</p>
            <span className="contact-phone">1-800-FLD-WARN</span>
          </div>

          <div className="contact-card">
            <div className="contact-icon">
              <span className="material-symbols-outlined">electric_bolt</span>
            </div>
            <h3>Power & Grid Emergencies</h3>
            <p>State Electrical Authority</p>
            <span className="contact-phone">1-800-PWR-EMRG</span>
          </div>

          <div className="contact-card">
            <div className="contact-icon">
              <span className="material-symbols-outlined">local_police</span>
            </div>
            <h3>Highway Patrol</h3>
            <p>Traffic & Road Safety</p>
            <span className="contact-phone">Dial 311 or 555-0199</span>
          </div>

          <div className="contact-card">
            <div className="contact-icon">
              <span className="material-symbols-outlined">water_drop</span>
            </div>
            <h3>Water Main Breaks</h3>
            <p>Municipal Water Department</p>
            <span className="contact-phone">555-0122</span>
          </div>
        </div>

        <h2>Report a Non-Emergency Hazard</h2>
        <p>To report non-life-threatening infrastructure damage, such as a large pothole, broken streetlight, or minor flooding, please navigate to the <a href="/alerts">Citizen Alerts</a> page to submit a community report. These reports are monitored 24/7 by our dispatch centers.</p>
      </div>
    </div>
  );
};

export default EmergencyContacts;
