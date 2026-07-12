import React, { useState, useEffect } from 'react';

const SensorAddress = ({ lat, lng }) => {
  const [address, setAddress] = useState('Fetching address...');

  useEffect(() => {
    if (!lat || !lng) {
      setAddress('Coordinates not available');
      return;
    }

    let isMounted = true;
    const fetchAddress = async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await res.json();
        if (isMounted) {
          if (data && data.display_name) {
            setAddress(data.display_name);
          } else {
            setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          }
        }
      } catch (err) {
        console.error("Geocoding error:", err);
        if (isMounted) {
          setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
      }
    };

    fetchAddress();
    return () => {
      isMounted = false;
    };
  }, [lat, lng]);

  return (
    <div className="sensor-address" style={{ 
      fontSize: '12px', 
      marginTop: '8px', 
      color: 'var(--color-on-surface-variant)',
      opacity: 0.85, 
      display: 'flex', 
      alignItems: 'flex-start', 
      gap: '4px',
      lineHeight: '1.4'
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: '15px', marginTop: '1px', color: 'var(--color-primary)' }}>location_on</span>
      <span style={{ wordBreak: 'break-word' }}>{address}</span>
    </div>
  );
};

export default SensorAddress;
