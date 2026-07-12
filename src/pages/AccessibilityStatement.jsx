import React from 'react';
import './FooterPages.css';

const AccessibilityStatement = () => {
  return (
    <div className="container footer-page-container">
      <div className="footer-page-header">
        <h1 className="footer-page-title">Accessibility Statement</h1>
        <p className="footer-page-subtitle">Ensuring our digital infrastructure is usable by all citizens</p>
      </div>
      
      <div className="footer-page-content">
        <h2>Commitment to Accessibility</h2>
        <p>The Department of Infrastructure & Emergency Management is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone, and applying the relevant accessibility standards to the GovInfrastructure platform.</p>

        <h2>Conformance Status</h2>
        <p>The Web Content Accessibility Guidelines (WCAG) defines requirements for designers and developers to improve accessibility for people with disabilities. It defines three levels of conformance: Level A, Level AA, and Level AAA. The GovInfrastructure platform is partially conformant with WCAG 2.1 level AA. Partially conformant means that some parts of the content do not fully conform to the accessibility standard.</p>

        <h2>Supported Features</h2>
        <ul>
          <li><strong>Keyboard Navigation:</strong> All interactive elements, including emergency alert forms and maps, are fully navigable via keyboard.</li>
          <li><strong>Screen Reader Compatibility:</strong> We utilize ARIA (Accessible Rich Internet Applications) attributes to ensure compatibility with modern screen reading software.</li>
          <li><strong>High Contrast Mode:</strong> The platform supports operating-system level high contrast preferences.</li>
          <li><strong>Text Scaling:</strong> The application supports standard browser-level zooming and text scaling up to 200% without loss of content functionality.</li>
        </ul>

        <h2>Known Limitations</h2>
        <p>While we strive for comprehensive accessibility, some third-party mapping integrations (e.g., historical sensor data charts) may present limitations for visually impaired users. We are actively working with our vendors to resolve these issues.</p>

        <h2>Feedback</h2>
        <p>We welcome your feedback on the accessibility of the GovInfrastructure platform. If you encounter accessibility barriers, please contact us:</p>
        <ul>
          <li>Phone: 1-800-GOV-ACC1</li>
          <li>E-mail: accessibility@govinfrastructure.gov</li>
        </ul>
        <p>We try to respond to feedback within 2 business days.</p>
      </div>
    </div>
  );
};

export default AccessibilityStatement;
