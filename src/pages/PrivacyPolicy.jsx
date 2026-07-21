import React from 'react';
import './FooterPages.css';

const PrivacyPolicy = () => {
  return (
    <div className="container footer-page-container">
      <div className="footer-page-header">
        <h1 className="footer-page-title">Privacy Policy</h1>
        <p className="footer-page-subtitle">How we protect and use civic infrastructure data</p>
      </div>
      
      <div className="footer-page-content">
        <h2>1. Introduction</h2>
        <p>The Department of Infrastructure & Emergency Management is committed to protecting the privacy of citizens while maintaining the safety and resilience of public infrastructure. This Privacy Policy outlines how the FloodWatch platform collects, uses, and safeguards data.</p>

        <h2>2. Data Collection</h2>
        <p>We collect information in two primary categories:</p>
        <ul>
          <li><strong>Automated Infrastructure Data:</strong> Telemetry, water levels, structural integrity metrics, and traffic density data gathered automatically via distributed IoT sensors across state infrastructure.</li>
          <li><strong>Citizen Reports:</strong> Information submitted voluntarily through the Citizen Alerts portal, which may include location data, hazard descriptions, and media (photos) of infrastructure damage.</li>
        </ul>

        <h2>3. Use of Location Data</h2>
        <p>Location data is vital for rapid emergency response. When you submit a hazard report via our mobile app or web portal, we request access to your device's GPS coordinates. This data is used <strong>exclusively</strong> to pinpoint the location of the reported hazard. We do not track citizens' continuous locations.</p>

        <h2>4. Data Anonymization & Public API</h2>
        <p>To foster transparency and enable public research, aggregated sensor data and hazard alerts are made available via our <a href="/data-api">Data API</a>. All personally identifiable information (PII) attached to citizen reports is strictly redacted before publication.</p>

        <h2>5. Data Security</h2>
        <p>We employ enterprise-grade encryption for all data in transit and at rest. Access to sensitive diagnostic systems and unredacted citizen reports is restricted to authorized emergency management personnel and verified municipal administrators.</p>

        <h2>6. Contact Us</h2>
        <p>If you have questions regarding our data practices or wish to request the deletion of a hazard report you submitted, please contact our Data Protection Officer at privacy@floodwatch.gov.</p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
