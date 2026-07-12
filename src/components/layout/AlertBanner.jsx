import React from 'react';
import { useAppContext } from '../../context/AppContext';
import './AlertBanner.css';

const AlertBanner = () => {
  const { sensors } = useAppContext();
  
  // Find any sensor that is in 'danger' status
  const dangerSensors = sensors.filter(s => s.status === 'danger');
  
  if (dangerSensors.length === 0) return null;

  return (
    <div className="alert-banner">
      <div className="container alert-container">
        <div className="alert-content">
          <span className="material-symbols-outlined filled alert-icon">warning</span>
          <div className="alert-text">
            <strong>CRITICAL ALERT:</strong> {dangerSensors.length} sensor(s) have exceeded danger thresholds. 
            ({dangerSensors.map(s => `${s.name}: ${s.value}${s.unit}`).join(', ')})
          </div>
        </div>
        <button className="btn alert-btn">View Details</button>
      </div>
    </div>
  );
};

export default AlertBanner;
