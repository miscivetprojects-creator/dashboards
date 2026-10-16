import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  MapPin, 
  Wrench, 
  Package, 
  Receipt, 
  ShieldCheck, 
  CalendarRange, 
  Layers, 
  FileSpreadsheet, 
  TableProperties, 
  Settings, 
  LogOut, 
  ChevronDown, 
  ChevronRight,
  Fuel,
  X
} from 'lucide-react';

export default function Sidebar({ 
  currentRoute, 
  onNavigate, 
  currentUser, 
  onLogout,
  locations = [],
  departments = [],
  collapsed = false,
  onCloseMobile
}) {
  const [locationsOpen, setLocationsOpen] = useState(true);
  const [deptsOpen, setDeptsOpen] = useState(true);
  const [hoverTooltip, setHoverTooltip] = useState(null);
  const [pmTreeOpen, setPmTreeOpen] = useState(true);

  const defaultLocations = locations.length > 0 ? locations : [
    { code: 'YG_GUDDA', name: 'YG Gudda' },
    { code: 'SANGAREDDY', name: 'Sangareddy' },
    { code: 'MKBD', name: 'MKBD' },
    { code: 'AP_AMRUT', name: 'AP Amrut' },
    { code: 'KHAMMAM', name: 'Khammam' },
    { code: 'HOSADURGA', name: 'Hosadurga' },
    { code: 'HIRIYUR_VJNL', name: 'Hiriyur - VJNL' },
    { code: 'HIRIYUR_KUWSDB', name: 'Hiriyur - KUWSDB' },
    { code: 'HAVERI', name: 'Haveri' },
    { code: 'DHARWAD', name: 'Dharwad' },
    { code: 'JALGAON', name: 'Jalgaon' }
  ];

  const primaryDepts = [];

  const secondaryDepts = [
    { id: 'stores', name: 'Stores (MMS)', fullName: 'Materials Management System', icon: Package },
    { id: 'admin', name: 'Admin', fullName: 'Administration', icon: ShieldCheck },
    { id: 'planning', name: 'Planning', fullName: 'Project Planning', icon: CalendarRange }
  ];

  const knownDeptKeys = ['pm', 'stores', 'admin', 'planning', 'mms', 'fuel', 'plant & machinery', 'materials management system'];
  const extraDepts = (departments || []).filter(d => {
    const code = (d.code || d.id || '').toLowerCase();
    const name = (d.name || '').toLowerCase();
    return !knownDeptKeys.some(k => code.includes(k) || name.includes(k)) && !code.includes('account') && !name.includes('account');
  });
  const isRoleAdmin = currentUser?.role === 'Director' || currentUser?.role === 'Admin' || currentUser?.role === 'admin';

  const NavItem = ({ label, tooltipText, icon: Icon, active, onClick, badge, hasChevron, chevronOpen, onChevronClick, isSubItem }) => {
    const textToShow = tooltipText || label;
    return (
      <div
        className="civet-nav-item"
        onClick={onClick}
        title={collapsed ? textToShow : undefined}
        onMouseEnter={e => {
          if (!active) {
            e.currentTarget.style.backgroundColor = '#173D69';
            e.currentTarget.style.color = '#FFFFFF';
          }
          if (collapsed) {
            const rect = e.currentTarget.getBoundingClientRect();
            setHoverTooltip({
              text: textToShow,
              top: rect.top + rect.height / 2
            });
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = isSubItem ? '#94A3B8' : '#B0C2D6';
          }
          if (collapsed) {
            setHoverTooltip(null);
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: collapsed ? '0' : (isSubItem ? '8px' : '10px'),
          padding: collapsed ? '0' : (isSubItem ? '6px 10px' : '8px 12px'),
          margin: collapsed ? '3px auto' : '2px 8px',
          width: collapsed ? '40px' : 'calc(100% - 16px)',
          height: collapsed ? '40px' : 'auto',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: isSubItem ? '11px' : '11.5px',
          fontWeight: active ? '600' : '500',
          color: active ? '#FFFFFF' : (isSubItem ? '#94A3B8' : '#B0C2D6'),
          backgroundColor: active ? '#1F6FEB' : 'transparent',
          transition: 'all 0.12s ease',
          userSelect: 'none',
          position: 'relative'
        }}
      >
        {isSubItem && !collapsed && (
          <span style={{ fontSize: '10px', color: active ? '#FFFFFF' : '#64748B', marginLeft: '2px' }}>↳</span>
        )}
        {Icon && <Icon size={isSubItem ? 14 : 16} color={active ? '#FFFFFF' : '#8FA4BC'} />}
        {!collapsed && <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>}
        {!collapsed && badge && (
          <span style={{ fontSize: '9.5px', background: 'rgba(255,255,255,0.2)', padding: '1px 5px', borderRadius: '3px' }}>
            {badge}
          </span>
        )}
        {!collapsed && hasChevron && (
          <span
            onClick={onChevronClick}
            style={{
              padding: '2px',
              borderRadius: '3px',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer'
            }}
          >
            {chevronOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        )}
      </div>
    );
  };

  const SectionHeader = ({ label, open, onToggle, count }) => {
    if (collapsed) {
      return (
        <div 
          style={{ 
            width: '28px', 
            height: '1px', 
            backgroundColor: 'rgba(255, 255, 255, 0.14)', 
            margin: '8px auto 6px auto' 
          }} 
        />
      );
    }
    return (
      <div 
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px 4px 14px',
          cursor: onToggle ? 'pointer' : 'default',
          userSelect: 'none'
        }}
      >
        <span style={{ 
          fontSize: '10px', 
          fontWeight: '700', 
          color: '#6582A4', 
          letterSpacing: '0.6px',
          textTransform: 'uppercase' 
        }}>
          {label} {count ? `(${count})` : ''}
        </span>
        {onToggle && (
          <span style={{ color: '#6582A4' }}>
            {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
        )}
      </div>
    );
  };

  return (
    <aside 
      className={`civet-sidebar ${collapsed ? 'collapsed' : 'expanded'}`}
      style={{
        width: collapsed ? '64px' : '240px',
        height: '100vh',
        backgroundColor: '#0F2A4A',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        borderRight: '1px solid rgba(0, 0, 0, 0.2)',
        transition: 'width 0.2s ease, transform 0.25s ease',
        zIndex: 1000
      }}
    >
      <div style={{
        height: '66px',
        padding: collapsed ? '0 8px' : '0 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        backgroundColor: '#071626',
        position: 'relative'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#071A2E',
          padding: collapsed ? '4px' : '6px 14px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          width: collapsed ? '46px' : '100%',
          height: collapsed ? '46px' : '48px',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}>
          <img 
            src="/civet-logo.png" 
            alt="Civet Dashboards" 
            style={{ 
              maxHeight: collapsed ? '32px' : '36px', 
              maxWidth: collapsed ? '36px' : '100%',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain', 
              display: 'block',
              filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.45))'
            }} 
          />
        </div>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="sidebar-mobile-close-btn"
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px'
            }}
            title="Close Navigation"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        <NavItem
          label="Main Dashboard"
          tooltipText="Main Dashboard"
          icon={LayoutDashboard}
          active={currentRoute.view === 'dashboard-main'}
          onClick={() => onNavigate({ view: 'dashboard-main' })}
        />
        <NavItem
          label="Project Divisions"
          tooltipText="Project Divisions"
          icon={MapPin}
          active={currentRoute.view === 'dashboard-location'}
          onClick={() => onNavigate({ view: 'dashboard-location', location: 'All' })}
        />

        <SectionHeader 
          label="Departments" 
          open={deptsOpen} 
          onToggle={() => setDeptsOpen(!deptsOpen)} 
          count={1 + primaryDepts.length + secondaryDepts.length + extraDepts.length}
        />
        {(deptsOpen || collapsed) && (
          <>
            <div>
              {!collapsed && (
                <NavItem
                  label="Plant & Machinery (P&M)"
                  tooltipText="Plant & Machinery (P&M)"
                  icon={Wrench}
                  active={false}
                  onClick={() => setPmTreeOpen(!pmTreeOpen)}
                  hasChevron={true}
                  chevronOpen={pmTreeOpen}
                  onChevronClick={(e) => {
                    e.stopPropagation();
                    setPmTreeOpen(!pmTreeOpen);
                  }}
                />
              )}
              {!collapsed && pmTreeOpen && (
                <div style={{
                  paddingLeft: '14px',
                  position: 'relative',
                  marginTop: '1px',
                  marginBottom: '2px'
                }}>
                  <div style={{
                    position: 'absolute',
                    left: '20px',
                    top: '0',
                    bottom: '8px',
                    width: '1px',
                    backgroundColor: 'rgba(255, 255, 255, 0.18)'
                  }} />
                  <NavItem
                    label="Fuel Management"
                    tooltipText="Fuel Management"
                    icon={Fuel}
                    active={currentRoute.view === 'dashboard-dept' && currentRoute.deptId === 'fuel'}
                    onClick={() => onNavigate({ view: 'dashboard-dept', deptId: 'fuel' })}
                    isSubItem={true}
                  />
                </div>
              )}
              {collapsed && (
                <NavItem
                  label="Fuel Management"
                  tooltipText="Fuel Management"
                  icon={Fuel}
                  active={currentRoute.view === 'dashboard-dept' && currentRoute.deptId === 'fuel'}
                  onClick={() => onNavigate({ view: 'dashboard-dept', deptId: 'fuel' })}
                />
              )}
            </div>

            {primaryDepts.map(dept => {
              const isActive = currentRoute.view === 'dashboard-dept' && currentRoute.deptId === dept.id;
              return (
                <NavItem
                  key={dept.id}
                  label={dept.name}
                  tooltipText={dept.fullName || dept.name}
                  icon={dept.icon}
                  active={isActive}
                  onClick={() => onNavigate({ view: 'dashboard-dept', deptId: dept.id })}
                />
              );
            })}

            {secondaryDepts.map(dept => {
              const isActive = currentRoute.view === 'dashboard-dept' && currentRoute.deptId === dept.id;
              return (
                <NavItem
                  key={dept.id}
                  label={dept.name}
                  tooltipText={dept.fullName || dept.name}
                  icon={dept.icon}
                  active={isActive}
                  onClick={() => onNavigate({ view: 'dashboard-dept', deptId: dept.id })}
                />
              );
            })}
            {extraDepts.map(d => {
              const code = d.code || d.id;
              const isActive = currentRoute.view === 'dashboard-dept' && currentRoute.deptId === code;
              return (
                <NavItem
                  key={code}
                  label={d.name}
                  tooltipText={d.name}
                  icon={Layers}
                  active={isActive}
                  onClick={() => onNavigate({ view: 'dashboard-dept', deptId: code })}
                />
              );
            })}
          </>
        )}

        <SectionHeader label="Data Operations" />
        <NavItem
          label="Data Workspace"
          tooltipText="Data Workspace"
          icon={FileSpreadsheet}
          active={currentRoute.view === 'workspace'}
          onClick={() => onNavigate({ view: 'workspace' })}
        />
        <NavItem
          label="Data Register"
          tooltipText="Data Register"
          icon={TableProperties}
          active={currentRoute.view === 'register'}
          onClick={() => onNavigate({ view: 'register' })}
        />

        {isRoleAdmin && (
          <>
            <SectionHeader label="System Settings" />
            <NavItem
              label="Master Data"
              tooltipText="Master Data & Configurations"
              icon={Settings}
              active={currentRoute.view === 'master-data'}
              onClick={() => onNavigate({ view: 'master-data' })}
            />
          </>
        )}
      </div>

      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        backgroundColor: '#0A1E35',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between'
      }}>
        {!collapsed && (
          <div style={{ overflow: 'hidden', marginRight: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentUser?.fullName || currentUser?.email || 'Administrator'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <span style={{ fontSize: '10px', color: '#8FA4BC' }}>
                {currentUser?.role || 'Admin'}
              </span>
            </div>
          </div>
        )}
        <button
          onClick={onLogout}
          title="Sign Out"
          onMouseEnter={e => { 
            e.currentTarget.style.backgroundColor = '#C8423A'; 
            e.currentTarget.style.color = '#FFFFFF';
            if (collapsed) {
              const rect = e.currentTarget.getBoundingClientRect();
              setHoverTooltip({
                text: 'Sign Out',
                top: rect.top + rect.height / 2
              });
            }
          }}
          onMouseLeave={e => { 
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'; 
            e.currentTarget.style.color = '#B0C2D6';
            if (collapsed) {
              setHoverTooltip(null);
            }
          }}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            color: '#B0C2D6',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease'
          }}
        >
          <LogOut size={14} />
        </button>
      </div>

      {collapsed && hoverTooltip && (
        <div style={{
          position: 'fixed',
          left: '74px',
          top: `${hoverTooltip.top}px`,
          transform: 'translateY(-50%)',
          backgroundColor: '#071A2E',
          color: '#FFFFFF',
          padding: '6px 12px',
          fontSize: '11.5px',
          fontWeight: '600',
          borderRadius: '4px',
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          pointerEvents: 'none',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span style={{
            position: 'absolute',
            right: '100%',
            top: '50%',
            transform: 'translateY(-50%)',
            borderWidth: '5px',
            borderStyle: 'solid',
            borderColor: 'transparent #071A2E transparent transparent'
          }} />
          {hoverTooltip.text}
        </div>
      )}
    </aside>
  );
}
