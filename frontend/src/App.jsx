import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import LoginPage from './pages/LoginPage';
import MainDashboard from './pages/MainDashboard';
import DeptDashboard from './pages/DeptDashboard';
import LocationDashboard from './pages/LocationDashboard';
import DataWorkspace from './pages/DataWorkspace';
import DataRegister from './pages/DataRegister';
import MasterDataPage from './pages/MasterDataPage';
import { api, getCurrentUser } from './services/api';
import { Sparkles } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  const [locations, setLocations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [route, setRoute] = useState({
    view: 'dashboard-main',
    deptId: 'pm',
    location: 'YG Gudda'
  });

  const [filters, setFilters] = useState({
    year: '2025',
    from_date: '2025-01-01',
    to_date: '2025-12-31',
    location: 'All',
    department: 'All'
  });

  useEffect(() => {
    const handleUnauthorizedEvent = () => {
      setCurrentUser(null);
    };
    window.addEventListener('civet_unauthorized', handleUnauthorizedEvent);
    return () => window.removeEventListener('civet_unauthorized', handleUnauthorizedEvent);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    checkSoftwareUpdates();
  }, []);

  async function checkSoftwareUpdates() {
    try {
      const currentVer = (typeof window !== 'undefined' && window.civetDesktop?.version) || '1.0.0';
      const res = await api.checkUpdates(currentVer);
      setUpdateInfo(res);
      const isIgnored = res?.latestVersion && localStorage.getItem('civet_ignored_update_' + res.latestVersion) === 'true';
      if (res?.hasUpdate && !isIgnored) {
        setShowUpdateBanner(true);
      }
      const deviceId = localStorage.getItem('civet_device_id') || ('DEV_' + Math.random().toString(36).substring(2, 9).toUpperCase());
      localStorage.setItem('civet_device_id', deviceId);
      api.checkInDevice({
        deviceId,
        version: currentVer,
        platform: (typeof window !== 'undefined' && window.civetDesktop) ? 'Desktop App' : 'Web Browser',
        userEmail: currentUser?.email || 'Guest'
      }).catch(() => {});
    } catch {}
  }

  const handleIgnoreUpdate = () => {
    if (updateInfo?.latestVersion) {
      localStorage.setItem('civet_ignored_update_' + updateInfo.latestVersion, 'true');
    }
    setShowUpdateBanner(false);
  };

  const handleAutoUpdate = async () => {
    setIsUpdating(true);
    try {
      if (window.civetDesktop?.autoUpdateAndRestart) {
        const res = await window.civetDesktop.autoUpdateAndRestart();
        if (res && res.success) {
          return;
        }
      }
      window.location.href = '/api/updates/download';
      setTimeout(() => {
        setIsUpdating(false);
      }, 5000);
    } catch (err) {
      console.warn('Electron auto-update fallback:', err);
      try {
        window.location.href = '/api/updates/download';
      } catch (e) {}
      setTimeout(() => {
        setIsUpdating(false);
      }, 4000);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadSystemMetadata();
    }
    const handleMetadataRefresh = () => {
      loadSystemMetadata();
    };
    window.addEventListener('civet_master_updated', handleMetadataRefresh);
    return () => window.removeEventListener('civet_master_updated', handleMetadataRefresh);
  }, [currentUser]);

  const handleNavigate = (newRoute) => {
    setRoute(newRoute);
    if (window.innerWidth <= 768) {
      setSidebarCollapsed(true);
    }
  };

  async function loadSystemMetadata() {
    try {
      const [locationsResponse, departmentsResponse] = await Promise.all([
        api.getMaster('locations'),
        api.getMaster('departments')
      ]);
      setLocations(locationsResponse);
      setDepartments(departmentsResponse);
    } catch (err) {
      console.warn('Metadata load notice:', err.message);
    }
  }

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
  };

  const computeBreadcrumbTrail = () => {
    const crumbs = ['Home'];
    if (route.view === 'dashboard-main') {
      crumbs.push('Executive View', 'Main Dashboard');
    } else if (route.view === 'dashboard-dept') {
      if (route.deptId === 'fuel') {
        crumbs.push('Departments', 'P&M', 'Fuel Management');
      } else if (route.deptId === 'pm') {
        crumbs.push('Departments', 'P&M');
      } else if (route.deptId === 'stores' || route.deptId === 'mms') {
        crumbs.push('Departments', 'Stores (MMS)');
      } else {
        const deptName = departments.find(d => (d.code || d.id || '').toLowerCase() === route.deptId?.toLowerCase())?.name || route.deptId?.toUpperCase();
        crumbs.push('Departments', deptName);
      }
    } else if (route.view === 'dashboard-location') {
      crumbs.push('Project Divisions', route.location);
    } else if (route.view === 'workspace') {
      crumbs.push('Data Operations', 'Data Workspace');
    } else if (route.view === 'register') {
      crumbs.push('Data Operations', 'Data Register');
    } else if (route.view === 'master-data') {
      crumbs.push('System Settings', 'Master Data');
    }
    return crumbs;
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const title = route.view === 'dashboard-main' ? 'CIVET Management MIS Executive Summary' :
                    route.view === 'dashboard-dept' ? `CIVET Management MIS — ${route.deptId?.toUpperCase()} Department Report` :
                    route.view === 'dashboard-location' ? `CIVET Management MIS — ${route.location} Project Division Report` :
                    'CIVET Management MIS Operational Report';

      const blob = await api.exportDashboardPdf({
        title,
        subtitle: 'CIVET PROJECTS PRIVATE LIMITED — Management Information System',
        dateRange: (filters.from_date || filters.to_date)
          ? `${filters.from_date || 'Start'} to ${filters.to_date || 'Present'}`
          : 'All Periods',
        filters,
        kpis: [],
        tables: []
      });

      const downloadUrl = window.URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.download = `Civet_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      window.URL.revokeObjectURL(downloadUrl);
      downloadLink.remove();
    } catch (err) {
      alert('PDF export failed: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  if (!currentUser) {
    return <LoginPage onLoginSuccess={user => setCurrentUser(user)} />;
  }

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#F4F6F9', position: 'relative' }}>
      {isMobile && !sidebarCollapsed && (
        <div 
          onClick={() => setSidebarCollapsed(true)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            zIndex: 999,
            backdropFilter: 'blur(2px)',
            transition: 'opacity 0.2s ease'
          }}
        />
      )}

      <Sidebar
        currentRoute={route}
        onNavigate={handleNavigate}
        currentUser={currentUser}
        onLogout={handleLogout}
        locations={locations}
        departments={departments}
        collapsed={sidebarCollapsed}
        onCloseMobile={() => setSidebarCollapsed(true)}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', minWidth: 0 }}>
        {showUpdateBanner && updateInfo?.hasUpdate && (
          <div style={{
            backgroundColor: '#FEF3C7',
            color: '#92400E',
            padding: '7px 18px',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #FCD34D',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            zIndex: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={14} color="#D97706" />
              <span>
                <strong>Civet MIS Update (v{updateInfo.latestVersion}):</strong> {updateInfo.title || 'Master data improvements and offline desktop support available.'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={handleAutoUpdate}
                disabled={isUpdating}
                style={{
                  backgroundColor: '#B45309',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '3px 10px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: isUpdating ? 'wait' : 'pointer'
                }}
              >
                {isUpdating ? 'Updating & Restarting...' : 'Update Now'}
              </button>
              <button
                onClick={handleIgnoreUpdate}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#92400E',
                  fontSize: '15px',
                  lineHeight: '1',
                  cursor: 'pointer',
                  padding: '0 4px'
                }}
                title="Dismiss (will not show again)"
              >
                &times;
              </button>
            </div>
          </div>
        )}

        {route.view !== 'dashboard-location' && (
          <TopHeader
            breadcrumbs={computeBreadcrumbTrail()}
            filters={filters}
            onFilterChange={setFilters}
            onExportPdf={handleExportPdf}
            onRefresh={() => setFilters({ ...filters })}
            toggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
            locations={locations}
            departments={departments}
            isExporting={isExporting}
            hasUpdate={!!updateInfo?.hasUpdate}
            isUpdating={isUpdating}
            onUpdate={handleAutoUpdate}
          />
        )}

        <main style={{ flex: 1, overflowY: 'auto', backgroundColor: '#F4F6F9', minWidth: 0 }}>
          {route.view === 'dashboard-main' && (
            <MainDashboard filters={filters} onNavigate={handleNavigate} />
          )}

          {route.view === 'dashboard-dept' && (
            <DeptDashboard deptId={route.deptId} departments={departments} filters={filters} onNavigate={handleNavigate} />
          )}

          {route.view === 'dashboard-location' && (
            <LocationDashboard 
              locationName={route.location || 'All'} 
              filters={filters} 
              onFilterChange={setFilters}
              onNavigate={handleNavigate} 
              currentUser={currentUser}
              onLogout={handleLogout}
              locations={locations}
              departments={departments}
              toggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
          )}

          {route.view === 'workspace' && (
            <DataWorkspace currentUser={currentUser} preselectDept={route.preselectDept} onNavigate={handleNavigate} />
          )}

          {route.view === 'register' && (
            <DataRegister 
              prefilterDept={route.prefilterDept} 
              prefilterLocation={route.prefilterLocation} 
              onNavigate={handleNavigate} 
              globalFilters={filters}
            />
          )}

          {route.view === 'master-data' && (
            <MasterDataPage currentUser={currentUser} initialTab={route.tab} openAdd={route.openAdd} />
          )}
        </main>
      </div>
    </div>
  );
}
