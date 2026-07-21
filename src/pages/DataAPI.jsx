import React from 'react';
import './FooterPages.css';

const DataAPI = () => {
  return (
    <div className="container footer-page-container">
      <div className="footer-page-header">
        <h1 className="footer-page-title">Open Data API</h1>
        <p className="footer-page-subtitle">Developer documentation for integrating civic infrastructure data</p>
      </div>
      
      <div className="footer-page-content">
        <h2>Overview</h2>
        <p>The FloodWatch Open Data API provides real-time access to anonymized infrastructure telemetry, active civil alerts, and structural health metrics. This RESTful API is intended for researchers, public safety developers, and academic institutions.</p>
        <p><strong>Base URL:</strong> <code>https://api.floodwatch.gov/v1</code></p>

        <h2>Authentication</h2>
        <p>All endpoints are publicly accessible and do not require authentication for read-only (GET) requests. However, rate limits are strictly enforced. To increase your rate limit, you may request an API key via the developer portal.</p>

        <h2>Endpoints</h2>

        <div className="api-endpoint">
          <div className="api-endpoint-header">
            <span className="api-method get">GET</span>
            <span className="api-path">/alerts/active</span>
          </div>
          <div className="api-endpoint-body">
            <p>Retrieves all currently active emergency alerts and advisories across state infrastructure.</p>
            <h3>Response Example:</h3>
            <pre>{`{
  "status": "success",
  "data": [
    {
      "id": "ALT-9021",
      "severity": "High",
      "type": "Flood Warning",
      "location": {
        "lat": 34.0522,
        "lng": -118.2437
      },
      "timestamp": "2026-07-06T19:30:00Z"
    }
  ]
}`}</pre>
          </div>
        </div>

        <div className="api-endpoint">
          <div className="api-endpoint-header">
            <span className="api-method get">GET</span>
            <span className="api-path">/sensors/telemetry</span>
          </div>
          <div className="api-endpoint-body">
            <p>Fetches real-time telemetry from deployed IoT sensors, including water levels, structural strain, and flow rates.</p>
            <h3>Query Parameters:</h3>
            <ul>
              <li><code>type</code> (string): Filter by sensor type (e.g., 'water_level', 'strain_gauge').</li>
              <li><code>region</code> (string): Filter by administrative region.</li>
            </ul>
          </div>
        </div>

        <h2>Rate Limiting</h2>
        <p>Unauthenticated requests are limited to <strong>100 requests per hour</strong> per IP address. Authenticated requests are granted up to 5,000 requests per hour. Exceeding these limits will result in a <code>429 Too Many Requests</code> response.</p>
      </div>
    </div>
  );
};

export default DataAPI;
