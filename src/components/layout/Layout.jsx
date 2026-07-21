import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import TopNavbar from './TopNavbar';
import Footer from './Footer';
import AlertBanner from './AlertBanner';
import MobileBottomNav from './MobileBottomNav';
import DesktopSidebar from './DesktopSidebar';
import './Layout.css';

const Layout = () => {
  const location = useLocation();
  
  return (
    <div className="layout-wrapper">
      <DesktopSidebar />
      <div className="page-wrapper">
        <AlertBanner />
        <TopNavbar />
        <main key={location.pathname} className="main-content page-transition">
          <Outlet />
        </main>
        <Footer />
        <MobileBottomNav />
      </div>
    </div>
  );
};

export default Layout;
