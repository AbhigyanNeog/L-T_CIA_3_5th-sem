/**
 * ApexCorp HR & Payroll - Production Frontend Application Controller
 * Modeled directly from Google Stitch 'ApexCorp Executive' Design System
 */

// Application State
const state = {
  currentUser: null,
  activeRole: 'hr_admin', // 'employee', 'manager', 'hr_admin'
  activeTab: 'admin_dashboard',
  clockInterval: null,
  durationInterval: null,
  todayAttendance: null
};

// UI Helper: Toast Notifications
const showToast = (message, type = 'success') => {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      ${
        type === 'success'
          ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>'
          : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>'
      }
    </svg>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.2s ease';
    setTimeout(() => toast.remove(), 250);
  }, 4000);
};

// Helper: Format Currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
    amount || 0
  );
};

// Helper: Format Date
const formatDate = (dateStr) => {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Helper: Format Time
const formatTime = (timeStr) => {
  if (!timeStr) return '--:--';
  return new Date(timeStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

// Helper: Status Pill Generator
const getStatusBadge = (status) => {
  const s = (status || 'UNKNOWN').toUpperCase();
  const cleanLabel = s.replace(/_/g, ' ');
  let cls = 'status-draft';

  if (['PRESENT', 'APPROVED', 'PAID', 'ACTIVE'].includes(s)) cls = 'status-present';
  else if (['LATE', 'PENDING', 'HALF_DAY'].includes(s)) cls = 'status-late';
  else if (['ABSENT', 'REJECTED', 'CANCELLED', 'TERMINATED'].includes(s)) cls = 'status-absent';
  else if (['ON_LEAVE', 'PROCESSED', 'HOLIDAY'].includes(s)) cls = 'status-on_leave';

  return `<span class="status-pill ${cls}">${cleanLabel}</span>`;
};

// Demo Credentials Autofill
const setDemoCredentials = (role) => {
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');

  if (role === 'admin') {
    emailInput.value = 'admin@apexcorp.com';
    passwordInput.value = 'Admin@123456';
  } else if (role === 'manager') {
    emailInput.value = 'manager.tech@apexcorp.com';
    passwordInput.value = 'Manager@123456';
  } else if (role === 'employee') {
    emailInput.value = 'alex.morgan@apexcorp.com';
    passwordInput.value = 'Emp@123456';
  }
};

// 1-Click Interactive Preview Mode for instant UI inspection
const enterQuickPreview = (role = 'hr_admin') => {
  const mockProfiles = {
    hr_admin: {
      _id: '60c72b2f9b1d8b2badbee001',
      name: 'Sarah Jenkins',
      email: 'admin@apexcorp.com',
      role: 'hr_admin',
      department: { name: 'Human Resources', code: 'HR' },
      designation: { title: 'Chief Human Resources Officer', level: 7 }
    },
    manager: {
      _id: '60c72b2f9b1d8b2badbee002',
      name: 'David Miller',
      email: 'manager.tech@apexcorp.com',
      role: 'manager',
      department: { name: 'Engineering & Tech', code: 'ENG' },
      designation: { title: 'Director of Engineering', level: 6 }
    },
    employee: {
      _id: '60c72b2f9b1d8b2badbee004',
      name: 'Alex Morgan',
      email: 'alex.morgan@apexcorp.com',
      role: 'employee',
      department: { name: 'Engineering & Tech', code: 'ENG' },
      designation: { title: 'Senior Full Stack Engineer', level: 4 },
      baseSalary: 95000
    }
  };

  const profile = mockProfiles[role] || mockProfiles.hr_admin;
  state.currentUser = profile;
  state.activeRole = role;
  state.activeTab = role === 'employee' ? 'emp_dashboard' : (role === 'manager' ? 'mgr_overview' : 'admin_dashboard');
  showToast(`Interactive preview active as ${profile.name} (${role.replace('_', ' ')}).`);
  initializeApplication();
};

// Toggle Password Field
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggle-password-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const pwd = document.getElementById('login-password');
      if (pwd.type === 'password') {
        pwd.type = 'text';
        toggleBtn.textContent = 'Hide';
      } else {
        pwd.type = 'password';
        toggleBtn.textContent = 'Show';
      }
    });
  }

  // Handle Login Form Submission
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const errorBanner = document.getElementById('login-error-banner');
      const submitBtn = document.getElementById('login-submit-btn');

      try {
        errorBanner.style.display = 'none';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Authenticating...';

        const res = await API.login(email, password);
        API.setToken(res.data.token);
        state.currentUser = res.data.user;
        state.activeRole = res.data.user.role;

        showToast(`Welcome back, ${res.data.user.name || res.data.user.firstName}!`);
        initializeApplication();
      } catch (err) {
        errorBanner.style.display = 'block';
        errorBanner.textContent = err.message || 'Invalid email or password.';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In to ApexCorp';
      }
    });
  }

  // Initialize App on Page Load
  checkAuthAndBootstrap();
});

// Check JWT Token & Load User Profile
const checkAuthAndBootstrap = async () => {
  const token = API.getToken();
  const authOverlay = document.getElementById('auth-overlay');
  const appRoot = document.getElementById('app-root');

  if (!token) {
    authOverlay.style.display = 'flex';
    appRoot.style.display = 'none';
    return;
  }

  try {
    const res = await API.getMe();
    state.currentUser = res.data.user;
    state.activeRole = res.data.user.role;
    initializeApplication();
  } catch (err) {
    console.warn('Session expired or invalid:', err);
    API.removeToken();
    authOverlay.style.display = 'flex';
    appRoot.style.display = 'none';
  }
};

// Handle Logout
const handleLogout = () => {
  API.removeToken();
  showToast('You have been signed out.');
  window.location.reload();
};

// Role Simulator Switcher
const switchActiveRole = (role) => {
  state.activeRole = role;

  // Set default active tab per role
  if (role === 'employee') state.activeTab = 'emp_dashboard';
  else if (role === 'manager') state.activeTab = 'mgr_overview';
  else state.activeTab = 'admin_dashboard';

  updateRoleSwitcherUI();
  renderSidebar();
  renderCurrentTab();
};

const updateRoleSwitcherUI = () => {
  ['hr_admin', 'manager', 'employee'].forEach((r) => {
    const chip = document.getElementById(`chip-${r}`);
    if (chip) {
      if (state.activeRole === r) chip.classList.add('active');
      else chip.classList.remove('active');
    }
  });
};

// Bootstrap Main Application
const initializeApplication = () => {
  const authOverlay = document.getElementById('auth-overlay');
  const appRoot = document.getElementById('app-root');

  authOverlay.style.display = 'none';
  appRoot.style.display = 'flex';

  // User Profile Mini Card
  const userName = state.currentUser.name || `${state.currentUser.firstName || ''} ${state.currentUser.lastName || ''}`.trim();
  document.getElementById('user-display-name').textContent = userName;
  document.getElementById('user-role-badge').textContent = state.activeRole.replace('_', ' ');

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  document.getElementById('user-avatar-badge').textContent = initials || 'AP';

  // Live Topbar Calendar Date
  const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
  document.getElementById('live-calendar-date').textContent = new Date().toLocaleDateString('en-US', options);

  switchActiveRole(state.currentUser.role);
};

// Render Dynamic Sidebar
const renderSidebar = () => {
  const navContainer = document.getElementById('sidebar-nav');
  navContainer.innerHTML = '';

  let navItems = [];

  if (state.activeRole === 'employee') {
    navItems = [
      { id: 'emp_dashboard', label: 'Self-Service Hub', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
      { id: 'emp_attendance', label: 'My Attendance Logs', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
      { id: 'emp_leaves', label: 'My Leave Requests', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
      { id: 'emp_payslips', label: 'My Payslips', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
      { id: 'emp_profile', label: 'My Profile & Contacts', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' }
    ];
  } else if (state.activeRole === 'manager') {
    navItems = [
      { id: 'mgr_overview', label: 'Team Overview', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
      { id: 'mgr_attendance', label: 'Team Attendance Today', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
      { id: 'mgr_approvals', label: 'Leave Approvals Queue', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
      { id: 'mgr_calendar', label: 'Team Leave Calendar', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
      { id: 'mgr_reviews', label: 'Performance Reviews', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' }
    ];
  } else {
    // HR Admin
    navItems = [
      { id: 'admin_dashboard', label: 'Executive Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      { id: 'admin_employees', label: 'Employees Directory', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
      { id: 'admin_departments', label: 'Departments', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
      { id: 'admin_designations', label: 'Designations', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
      { id: 'admin_attendance', label: 'Attendance Logs', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
      { id: 'admin_leaves', label: 'Leave Records', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
      { id: 'admin_holidays', label: 'Holiday Calendar', icon: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
      { id: 'admin_payroll', label: 'Payroll Engine', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
      { id: 'admin_analytics', label: 'Reports & Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' }
    ];
  }

  navItems.forEach((item) => {
    const btn = document.createElement('div');
    btn.className = `nav-item ${state.activeTab === item.id ? 'active' : ''}`;
    btn.innerHTML = `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${item.icon}"></path></svg>
      <span>${item.label}</span>
    `;
    btn.onclick = () => {
      state.activeTab = item.id;
      renderSidebar();
      renderCurrentTab();
    };
    navContainer.appendChild(btn);
  });
};

// Main Content Renderer Router
const renderCurrentTab = async () => {
  const main = document.getElementById('main-content');
  const breadcrumbCurrent = document.getElementById('breadcrumb-current');
  const breadcrumbSection = document.getElementById('breadcrumb-section');

  main.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; height: 300px;">
      <div style="display: flex; flex-direction: column; align-items: center; gap: 12px; color: var(--slate-400);">
        <svg class="spin" width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
        <span style="font-size: 13px; font-weight: 600;">Loading ApexCorp Services...</span>
      </div>
    </div>
  `;

  try {
    switch (state.activeTab) {
      // Employee Tabs
      case 'emp_dashboard':
        breadcrumbSection.textContent = 'Employee';
        breadcrumbCurrent.textContent = 'Self-Service Hub';
        await renderEmployeeDashboard(main);
        break;
      case 'emp_attendance':
        breadcrumbSection.textContent = 'Employee';
        breadcrumbCurrent.textContent = 'Attendance Logs';
        await renderEmployeeAttendanceLogs(main);
        break;
      case 'emp_leaves':
        breadcrumbSection.textContent = 'Employee';
        breadcrumbCurrent.textContent = 'Leave Requests';
        await renderEmployeeLeaves(main);
        break;
      case 'emp_payslips':
        breadcrumbSection.textContent = 'Employee';
        breadcrumbCurrent.textContent = 'My Payslips';
        await renderEmployeePayslips(main);
        break;
      case 'emp_profile':
        breadcrumbSection.textContent = 'Employee';
        breadcrumbCurrent.textContent = 'My Profile';
        await renderEmployeeProfile(main);
        break;

      // Manager Tabs
      case 'mgr_overview':
        breadcrumbSection.textContent = 'Manager';
        breadcrumbCurrent.textContent = 'Team Overview';
        await renderManagerOverview(main);
        break;
      case 'mgr_attendance':
        breadcrumbSection.textContent = 'Manager';
        breadcrumbCurrent.textContent = 'Team Attendance Today';
        await renderManagerAttendance(main);
        break;
      case 'mgr_approvals':
        breadcrumbSection.textContent = 'Manager';
        breadcrumbCurrent.textContent = 'Leave Approvals Queue';
        await renderManagerApprovals(main);
        break;
      case 'mgr_calendar':
        breadcrumbSection.textContent = 'Manager';
        breadcrumbCurrent.textContent = 'Team Leave Calendar';
        await renderManagerCalendar(main);
        break;
      case 'mgr_reviews':
        breadcrumbSection.textContent = 'Manager';
        breadcrumbCurrent.textContent = 'Performance Reviews';
        await renderManagerPerformance(main);
        break;

      // HR Admin Tabs
      case 'admin_dashboard':
        breadcrumbSection.textContent = 'HR Admin';
        breadcrumbCurrent.textContent = 'Executive Dashboard';
        await renderAdminDashboard(main);
        break;
      case 'admin_employees':
        breadcrumbSection.textContent = 'HR Admin';
        breadcrumbCurrent.textContent = 'Employee Directory';
        await renderAdminEmployees(main);
        break;
      case 'admin_departments':
        breadcrumbSection.textContent = 'HR Admin';
        breadcrumbCurrent.textContent = 'Departments';
        await renderAdminDepartments(main);
        break;
      case 'admin_designations':
        breadcrumbSection.textContent = 'HR Admin';
        breadcrumbCurrent.textContent = 'Designations';
        await renderAdminDesignations(main);
        break;
      case 'admin_attendance':
        breadcrumbSection.textContent = 'HR Admin';
        breadcrumbCurrent.textContent = 'Attendance Management';
        await renderAdminAttendance(main);
        break;
      case 'admin_leaves':
        breadcrumbSection.textContent = 'HR Admin';
        breadcrumbCurrent.textContent = 'Leave Records';
        await renderAdminLeaves(main);
        break;
      case 'admin_holidays':
        breadcrumbSection.textContent = 'HR Admin';
        breadcrumbCurrent.textContent = 'Holiday Calendar';
        await renderAdminHolidays(main);
        break;
      case 'admin_payroll':
        breadcrumbSection.textContent = 'HR Admin';
        breadcrumbCurrent.textContent = 'Payroll Engine';
        await renderAdminPayroll(main);
        break;
      case 'admin_analytics':
        breadcrumbSection.textContent = 'HR Admin';
        breadcrumbCurrent.textContent = 'Reports & Analytics';
        await renderAdminAnalytics(main);
        break;
      default:
        main.innerHTML = `<div class="card"><p>View not configured.</p></div>`;
    }
  } catch (err) {
    main.innerHTML = `
      <div class="card" style="border-color: var(--danger-border); background-color: var(--danger-bg); color: var(--danger);">
        <h3 style="color: var(--danger); font-size: 16px;">Failed to load view</h3>
        <p style="font-size: 13px;">${err.message || 'An unexpected error occurred while communicating with the backend.'}</p>
        <button class="btn btn-secondary btn-sm" onclick="renderCurrentTab()" style="width: fit-content; margin-top: 8px;">Retry</button>
      </div>
    `;
  }
};

/* ==========================================================================
   1. EMPLOYEE SELF-SERVICE VIEWS
   ========================================================================== */

const renderEmployeeDashboard = async (container) => {
  // Parallel fetch: Today's status, Leave Balances, Recent Attendance, Recent Leaves
  const [todayRes, balancesRes, attHistoryRes, leavesRes] = await Promise.all([
    API.getTodayAttendance().catch(() => ({ data: { attendance: null } })),
    API.getMyBalances().catch(() => ({ data: { balances: [], quotas: {} } })),
    API.getMyAttendance('?limit=5').catch(() => ({ data: { attendance: [] } })),
    API.getMyLeaves('?limit=5').catch(() => ({ data: { leaves: [] } }))
  ]);

  state.todayAttendance = todayRes.data.attendance;
  const quotas = balancesRes.data.quotas || {};
  const recentAttendance = attHistoryRes.data.attendance || [];
  const recentLeaves = leavesRes.data.leaves || [];

  const isClockedIn = state.todayAttendance && state.todayAttendance.clockIn && !state.todayAttendance.clockOut;
  const isClockedOut = state.todayAttendance && state.todayAttendance.clockOut;

  container.innerHTML = `
    <!-- Top Attendance Stopwatch Hero (Google Stitch Flagship Screen b6a00baf85794265b0bad39fb51732cc) -->
    <div class="attendance-hero">
      <div class="hero-clock-display">
        <div id="live-clock" class="live-digital-clock">00:00:00</div>
        <div class="clock-meta">
          <div style="display: flex; align-items: center; gap: 8px;">
            ${getStatusBadge(state.todayAttendance ? state.todayAttendance.status : 'NOT_CLOCKED_IN')}
            <span style="font-size: 13px; font-weight: 600; color: var(--slate-700);">
              ${isClockedIn ? `In: ${formatTime(state.todayAttendance.clockIn)}` : isClockedOut ? `Out: ${formatTime(state.todayAttendance.clockOut)}` : 'Shift starts at 09:00 AM'}
            </span>
          </div>
          <div class="clock-duration">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span id="live-stopwatch">${isClockedIn ? 'Calculating duration...' : isClockedOut ? `Completed: ${state.todayAttendance.totalHours} hrs` : 'Standard work duration: 8.0 hrs'}</span>
          </div>
        </div>
      </div>

      <div class="clock-actions">
        ${
          !isClockedIn && !isClockedOut
            ? `<button class="btn btn-primary btn-lg" onclick="triggerClockIn()">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>
                Clock In Now
               </button>`
            : isClockedIn
            ? `<button class="btn btn-danger btn-lg" onclick="triggerClockOut()">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                Clock Out
               </button>`
            : `<button class="btn btn-secondary" disabled>Session Finished for Today</button>`
        }
      </div>
    </div>

    <!-- Leave Quota Balances Row -->
    <div class="kpi-grid">
      <div class="kpi-card success">
        <div class="kpi-title">Casual Leaves (CL)</div>
        <div class="kpi-value">${quotas.casual ? quotas.casual.remaining : 12} <span style="font-size: 14px; font-weight: 500; color: var(--slate-500);">/ ${quotas.casual ? quotas.casual.allocated : 12} days</span></div>
        <div class="kpi-trend">Personal & urgent time off</div>
      </div>

      <div class="kpi-card warning">
        <div class="kpi-title">Sick Leaves (SL)</div>
        <div class="kpi-value">${quotas.sick ? quotas.sick.remaining : 10} <span style="font-size: 14px; font-weight: 500; color: var(--slate-500);">/ ${quotas.sick ? quotas.sick.allocated : 10} days</span></div>
        <div class="kpi-trend">Medical recovery quota</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-title">Earned Leaves (EL)</div>
        <div class="kpi-value">${quotas.earned ? quotas.earned.remaining : 15} <span style="font-size: 14px; font-weight: 500; color: var(--slate-500);">/ ${quotas.earned ? quotas.earned.allocated : 15} days</span></div>
        <div class="kpi-trend">Annual accrued vacation</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-title">Quick Action</div>
        <div style="margin-top: 4px;">
          <button class="btn btn-primary btn-sm" style="width: 100%;" onclick="openApplyLeaveModal()">+ Apply for Leave</button>
        </div>
      </div>
    </div>

    <!-- Two-Column Layout: Left (Recent Attendance) & Right (Recent Leaves) -->
    <div style="display: grid; grid-template-columns: 1.6fr 1fr; gap: 20px;">
      <!-- Left Column: Attendance Table -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Recent Attendance History</div>
            <div class="card-subtitle">Last 5 recorded work sessions</div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="state.activeTab='emp_attendance'; renderSidebar(); renderCurrentTab();">View All</button>
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${
                recentAttendance.length === 0
                  ? `<tr><td colspan="5" style="text-align: center; color: var(--slate-400); padding: 24px;">No recent attendance logs found.</td></tr>`
                  : recentAttendance
                      .map(
                        (a) => `
                    <tr>
                      <td style="font-weight: 600;">${formatDate(a.date)}</td>
                      <td>${formatTime(a.clockIn)}</td>
                      <td>${formatTime(a.clockOut)}</td>
                      <td class="tabular-nums">${a.totalHours ? `${a.totalHours} hrs` : '--'}</td>
                      <td>${getStatusBadge(a.status)}</td>
                    </tr>
                  `
                      )
                      .join('')
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Right Column: My Leave Applications -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">My Recent Leaves</div>
            <div class="card-subtitle">Leave requests status</div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="openApplyLeaveModal()">+ Apply</button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${
            recentLeaves.length === 0
              ? `<div style="text-align: center; color: var(--slate-400); padding: 32px 16px;">No recent leave requests submitted.</div>`
              : recentLeaves
                  .map(
                    (l) => `
                <div style="padding: 12px; border: 1px solid var(--slate-200); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between; background-color: var(--slate-50);">
                  <div>
                    <div style="font-weight: 600; font-size: 13px; color: var(--slate-900);">${l.leaveType ? l.leaveType.name : l.type || 'Leave'} (${l.totalDays} days)</div>
                    <div style="font-size: 12px; color: var(--slate-500);">${formatDate(l.fromDate || l.startDate)} – ${formatDate(l.toDate || l.endDate)}</div>
                  </div>
                  <div>${getStatusBadge(l.status)}</div>
                </div>
              `
                  )
                  .join('')
          }
        </div>
      </div>
    </div>
  `;

  // Start real-time digital clock
  clearInterval(state.clockInterval);
  state.clockInterval = setInterval(() => {
    const clockEl = document.getElementById('live-clock');
    if (clockEl) {
      clockEl.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
    }
  }, 1000);

  // Start duration stopwatch if clocked in
  clearInterval(state.durationInterval);
  if (isClockedIn) {
    const startMs = new Date(state.todayAttendance.clockIn).getTime();
    state.durationInterval = setInterval(() => {
      const swEl = document.getElementById('live-stopwatch');
      if (swEl) {
        const diffMs = Date.now() - startMs;
        const hrs = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
        swEl.textContent = `Active: ${hrs}h ${mins}m ${secs}s`;
      }
    }, 1000);
  }
};

// Clock In Trigger
const triggerClockIn = async () => {
  try {
    const res = await API.clockIn('Clock-in from Executive Portal');
    showToast('Clock-in confirmed. Have a productive day!');
    renderCurrentTab();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// Clock Out Trigger
const triggerClockOut = async () => {
  try {
    const res = await API.clockOut('Clock-out from Executive Portal');
    showToast('Clock-out confirmed. Rest well!');
    renderCurrentTab();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// Employee Attendance History Tab
const renderEmployeeAttendanceLogs = async (container) => {
  const res = await API.getMyAttendance('?limit=50');
  const logs = res.data.attendance || [];

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">My Attendance Records</div>
          <div class="card-subtitle">Complete personal work log history</div>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Clock In</th>
              <th>Clock Out</th>
              <th>Total Hours</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${
              logs.length === 0
                ? `<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--slate-400);">No attendance history available.</td></tr>`
                : logs
                    .map(
                      (l) => `
                  <tr>
                    <td style="font-weight: 600;">${formatDate(l.date)}</td>
                    <td>${formatTime(l.clockIn)}</td>
                    <td>${formatTime(l.clockOut)}</td>
                    <td class="tabular-nums">${l.totalHours ? `${l.totalHours} hrs` : '--'}</td>
                    <td>${getStatusBadge(l.status)}</td>
                    <td style="color: var(--slate-500); font-size: 12px;">${l.notes || '--'}</td>
                  </tr>
                `
                    )
                    .join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
};

// Employee Leaves Tab
const renderEmployeeLeaves = async (container) => {
  const [leavesRes, balancesRes] = await Promise.all([API.getMyLeaves(), API.getMyBalances()]);
  const leaves = leavesRes.data.leaves || [];
  const quotas = balancesRes.data.quotas || {};

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h2 style="font-size: 20px;">My Leave Applications</h2>
        <p style="color: var(--slate-500); font-size: 13px;">Manage time off, sick leave, and vacation quotas</p>
      </div>
      <button class="btn btn-primary" onclick="openApplyLeaveModal()">+ Apply for Leave</button>
    </div>

    <!-- Quota Ledger Cards -->
    <div class="kpi-grid">
      <div class="kpi-card success">
        <div class="kpi-title">Casual Leave</div>
        <div class="kpi-value">${quotas.casual ? quotas.casual.remaining : 12} days</div>
        <div class="kpi-trend">${quotas.casual ? quotas.casual.used : 0} used of ${quotas.casual ? quotas.casual.allocated : 12}</div>
      </div>
      <div class="kpi-card warning">
        <div class="kpi-title">Sick Leave</div>
        <div class="kpi-value">${quotas.sick ? quotas.sick.remaining : 10} days</div>
        <div class="kpi-trend">${quotas.sick ? quotas.sick.used : 0} used of ${quotas.sick ? quotas.sick.allocated : 10}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Earned Leave</div>
        <div class="kpi-value">${quotas.earned ? quotas.earned.remaining : 15} days</div>
        <div class="kpi-trend">${quotas.earned ? quotas.earned.used : 0} used of ${quotas.earned ? quotas.earned.allocated : 15}</div>
      </div>
    </div>

    <!-- Leaves Table -->
    <div class="card">
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Leave Type</th>
              <th>Dates</th>
              <th>Net Days</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Review Remarks</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${
              leaves.length === 0
                ? `<tr><td colspan="7" style="text-align: center; padding: 24px; color: var(--slate-400);">No leave applications filed yet.</td></tr>`
                : leaves
                    .map(
                      (l) => `
                  <tr>
                    <td style="font-weight: 600;">${l.leaveType ? l.leaveType.name : l.type || 'Leave'}</td>
                    <td>${formatDate(l.fromDate || l.startDate)} – ${formatDate(l.toDate || l.endDate)}</td>
                    <td class="tabular-nums" style="font-weight: 600;">${l.totalDays}</td>
                    <td style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${l.reason}</td>
                    <td>${getStatusBadge(l.status)}</td>
                    <td style="color: var(--slate-500); font-size: 12px;">${l.remarks || l.reviewRemarks || '--'}</td>
                    <td>
                      ${
                        l.status === 'PENDING'
                          ? `<button class="btn btn-secondary btn-sm" onclick="handleCancelLeave('${l._id}')">Cancel</button>`
                          : `--`
                      }
                    </td>
                  </tr>
                `
                    )
                    .join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
};

const handleCancelLeave = async (id) => {
  if (!confirm('Are you sure you want to cancel this leave application?')) return;
  try {
    await API.cancelLeave(id);
    showToast('Leave request cancelled.');
    renderCurrentTab();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// Employee Payslips Tab
const renderEmployeePayslips = async (container) => {
  const res = await API.getMyPayslips();
  const payslips = res.data.payslips || [];

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">My Payslip Records</div>
          <div class="card-subtitle">Monthly frozen compensation snapshots with allowances & deductions</div>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Pay Period</th>
              <th>Base Salary</th>
              <th>Gross Pay</th>
              <th>Total Deductions</th>
              <th>Net Salary</th>
              <th>LOP Days</th>
              <th>Disbursement Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${
              payslips.length === 0
                ? `<tr><td colspan="8" style="text-align: center; padding: 24px; color: var(--slate-400);">No payslip records generated yet.</td></tr>`
                : payslips
                    .map(
                      (p) => `
                  <tr>
                    <td style="font-weight: 700;">${p.month || p.payPeriodMonth}/${p.year || p.payPeriodYear}</td>
                    <td class="tabular-nums">${formatCurrency(p.baseSalary || p.baseSalarySnapshot)}</td>
                    <td class="tabular-nums" style="color: var(--success); font-weight: 600;">${formatCurrency(p.grossPay || p.grossEarnings)}</td>
                    <td class="tabular-nums" style="color: var(--danger);">${formatCurrency(p.totalDeductions)}</td>
                    <td class="tabular-nums" style="font-weight: 800; font-size: 14px; color: var(--slate-900);">${formatCurrency(p.netPay || p.netSalary)}</td>
                    <td class="tabular-nums">${p.lopDays || 0}</td>
                    <td>${getStatusBadge(p.status || p.paymentStatus)}</td>
                    <td>
                      <button class="btn btn-outline btn-sm" onclick="openPayslipModal('${p._id}')">View Details</button>
                    </td>
                  </tr>
                `
                    )
                    .join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
};

// Employee Profile Tab (Self-Service)
const renderEmployeeProfile = async (container) => {
  const user = state.currentUser;

  container.innerHTML = `
    <div class="card" style="max-width: 720px; margin: 0 auto;">
      <div class="card-header">
        <div>
          <div class="card-title">Personal Profile & Contact Information</div>
          <div class="card-subtitle">Review organization details and update permitted contact records</div>
        </div>
      </div>

      <form id="profile-form" style="display: flex; flex-direction: column; gap: 18px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="form-group">
            <label class="form-label">Full Name (Locked)</label>
            <input type="text" class="form-control" value="${user.name || `${user.firstName} ${user.lastName}`}" disabled style="background-color: var(--slate-100);">
          </div>
          <div class="form-group">
            <label class="form-label">Employee ID (Locked)</label>
            <input type="text" class="form-control" value="${user.employeeId}" disabled style="background-color: var(--slate-100);">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="form-group">
            <label class="form-label">Department (Locked)</label>
            <input type="text" class="form-control" value="${user.departmentId ? user.departmentId.name : 'Engineering'}" disabled style="background-color: var(--slate-100);">
          </div>
          <div class="form-group">
            <label class="form-label">Designation (Locked)</label>
            <input type="text" class="form-control" value="${user.designationId ? user.designationId.title : 'Staff'}" disabled style="background-color: var(--slate-100);">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Contact Phone Number</label>
          <input type="text" id="prof-phone" class="form-control" value="${user.phone || ''}" placeholder="+1 555-0101">
        </div>

        <div style="border-top: 1px solid var(--slate-200); padding-top: 12px;">
          <h4 style="font-size: 14px; margin-bottom: 10px;">Residential Address</h4>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <input type="text" id="prof-street" class="form-control" value="${user.address ? user.address.street || '' : ''}" placeholder="Street Address">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <input type="text" id="prof-city" class="form-control" value="${user.address ? user.address.city || '' : ''}" placeholder="City">
              <input type="text" id="prof-state" class="form-control" value="${user.address ? user.address.state || '' : ''}" placeholder="State / Province">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <input type="text" id="prof-zip" class="form-control" value="${user.address ? user.address.postalCode || '' : ''}" placeholder="Postal Code">
              <input type="text" id="prof-country" class="form-control" value="${user.address ? user.address.country || '' : ''}" placeholder="Country">
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
          <button type="submit" class="btn btn-primary">Save Profile Changes</button>
        </div>
      </form>
    </div>
  `;

  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = document.getElementById('prof-phone').value.trim();
    const street = document.getElementById('prof-street').value.trim();
    const city = document.getElementById('prof-city').value.trim();
    const stateVal = document.getElementById('prof-state').value.trim();
    const postalCode = document.getElementById('prof-zip').value.trim();
    const country = document.getElementById('prof-country').value.trim();

    try {
      const res = await API.updateMyProfile({
        phone,
        address: { street, city, state: stateVal, postalCode, country }
      });
      state.currentUser = res.data.employee;
      showToast('Personal contact information updated successfully.');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
};

/* ==========================================================================
   2. MANAGER PORTAL VIEWS
   ========================================================================== */

const renderManagerOverview = async (container) => {
  const [teamRes, attTodayRes, pendingLeavesRes] = await Promise.all([
    API.getTeam(),
    API.getTeamAttendance(),
    API.getPendingLeaves()
  ]);

  const team = teamRes.data.teamMembers || [];
  const attSummary = attTodayRes.data.summary || { present: 0, late: 0, onLeave: 0, notClockedIn: 0 };
  const pendingLeaves = pendingLeavesRes.data.leaves || [];

  const presenceRate = team.length > 0 ? Math.round((attSummary.present / team.length) * 100) : 0;

  container.innerHTML = `
    <!-- Top Metric Row (Google Stitch Flagship Screen 0cd21b9709cb4376b373b03d702b149e) -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-title">Direct Reports</div>
        <div class="kpi-value">${team.length}</div>
        <div class="kpi-trend">Assigned team members</div>
      </div>

      <div class="kpi-card success">
        <div class="kpi-title">Present Today</div>
        <div class="kpi-value">${attSummary.present} <span style="font-size: 14px; font-weight: 500; color: var(--slate-500);">(${presenceRate}%)</span></div>
        <div class="kpi-trend">${attSummary.late} late clock-in(s)</div>
      </div>

      <div class="kpi-card warning">
        <div class="kpi-title">Pending Leave Approvals</div>
        <div class="kpi-value">${pendingLeaves.length}</div>
        <div class="kpi-trend">Awaiting your sign-off</div>
      </div>

      <div class="kpi-card info">
        <div class="kpi-title">On Approved Leave</div>
        <div class="kpi-value">${attSummary.onLeave}</div>
        <div class="kpi-trend">Scheduled out today</div>
      </div>
    </div>

    <!-- Direct Reports Roster Table -->
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Team Members Directory</div>
          <div class="card-subtitle">Assigned direct reports reporting to you</div>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Employee ID</th>
              <th>Designation</th>
              <th>Department</th>
              <th>Email</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${
              team.length === 0
                ? `<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--slate-400);">No direct reports currently assigned.</td></tr>`
                : team
                    .map(
                      (m) => `
                  <tr>
                    <td style="font-weight: 600;">${m.name || `${m.firstName} ${m.lastName}`}</td>
                    <td class="tabular-nums">${m.employeeId}</td>
                    <td>${m.designation ? m.designation.title : m.designationId ? m.designationId.title : '--'}</td>
                    <td>${m.department ? m.department.name : m.departmentId ? m.departmentId.name : '--'}</td>
                    <td>${m.email}</td>
                    <td>
                      <button class="btn btn-outline btn-sm" onclick="openAddPerformanceModal('${m._id}', '${m.name || m.firstName}')">+ Review</button>
                    </td>
                  </tr>
                `
                    )
                    .join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
};

// Manager Team Attendance Today
const renderManagerAttendance = async (container) => {
  const res = await API.getTeamAttendance();
  const members = res.data.members || [];
  const summary = res.data.summary || {};

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Team Attendance Matrix — Today (${res.data.date})</div>
          <div class="card-subtitle">Live presence tracking of all direct reports</div>
        </div>
        <div style="display: flex; gap: 8px;">
          ${getStatusBadge('PRESENT')} <span style="font-size: 13px; font-weight: 700; margin-right: 8px;">${summary.present || 0}</span>
          ${getStatusBadge('LATE')} <span style="font-size: 13px; font-weight: 700; margin-right: 8px;">${summary.late || 0}</span>
          ${getStatusBadge('ON_LEAVE')} <span style="font-size: 13px; font-weight: 700;">${summary.onLeave || 0}</span>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Designation</th>
              <th>Clock In Time</th>
              <th>Clock Out Time</th>
              <th>Total Hours</th>
              <th>Live Status</th>
            </tr>
          </thead>
          <tbody>
            ${
              members.length === 0
                ? `<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--slate-400);">No team members found.</td></tr>`
                : members
                    .map(
                      (m) => `
                  <tr>
                    <td style="font-weight: 600;">${m.employee.firstName} ${m.employee.lastName}</td>
                    <td>${m.employee.designation || '--'}</td>
                    <td>${formatTime(m.clockIn)}</td>
                    <td>${formatTime(m.clockOut)}</td>
                    <td class="tabular-nums">${m.totalHours ? `${m.totalHours} hrs` : '--'}</td>
                    <td>${getStatusBadge(m.status)}</td>
                  </tr>
                `
                    )
                    .join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
};

// Manager Leave Approvals Queue
const renderManagerApprovals = async (container) => {
  const res = await API.getPendingLeaves();
  const pendingLeaves = res.data.leaves || [];

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Pending Leave Requests Queue</div>
          <div class="card-subtitle">Review, approve, or reject team leave applications with review remarks</div>
        </div>
        <span class="nav-badge">${pendingLeaves.length} Pending</span>
      </div>

      <div style="display: flex; flex-direction: column; gap: 14px; padding: 4px;">
        ${
          pendingLeaves.length === 0
            ? `<div style="text-align: center; color: var(--slate-400); padding: 48px 16px;">
                <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="margin: 0 auto 12px; color: var(--success);"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <div style="font-weight: 700; font-size: 15px; color: var(--slate-700);">All clear!</div>
                <div style="font-size: 13px;">No leave requests pending your review right now.</div>
               </div>`
            : pendingLeaves
                .map(
                  (l) => `
              <div style="border: 1px solid var(--slate-200); border-radius: var(--radius-md); padding: 16px; background-color: var(--slate-50); display: flex; align-items: center; justify-content: space-between; gap: 16px;">
                <div>
                  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                    <span style="font-weight: 700; font-size: 14px; color: var(--slate-900);">${l.employee ? `${l.employee.firstName} ${l.employee.lastName} (${l.employee.employeeId})` : 'Employee'}</span>
                    <span class="status-pill status-pending">${l.leaveType ? l.leaveType.name : l.type}</span>
                  </div>
                  <div style="font-size: 13px; color: var(--slate-600); margin-bottom: 2px;">
                    <strong>Period:</strong> ${formatDate(l.fromDate || l.startDate)} – ${formatDate(l.toDate || l.endDate)} (${l.totalDays} working days)
                  </div>
                  <div style="font-size: 12px; color: var(--slate-500);"><strong>Reason:</strong> ${l.reason}</div>
                </div>

                <div style="display: flex; gap: 8px;">
                  <button class="btn btn-primary btn-sm" onclick="processLeave('${l._id}', 'APPROVED')">Approve</button>
                  <button class="btn btn-danger btn-sm" onclick="processLeave('${l._id}', 'REJECTED')">Reject</button>
                </div>
              </div>
            `
                )
                .join('')
        }
      </div>
    </div>
  `;
};

const processLeave = async (id, status) => {
  const remarks = prompt(`Enter remarks for ${status.toLowerCase()}ing this leave:`, `${status} by Manager`);
  if (remarks === null) return;

  try {
    await API.updateLeaveStatus(id, status, remarks);
    showToast(`Leave application ${status.toLowerCase()} successfully.`);
    renderCurrentTab();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// Manager Calendar Tab
const renderManagerCalendar = async (container) => {
  const res = await API.getTeamUpcomingLeaves();
  const upcoming = res.data.leaves || [];

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Upcoming Team Leaves (Next 30 Days)</div>
          <div class="card-subtitle">Plan sprint workload and prevent department coverage gaps</div>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Leave Type</th>
              <th>Dates</th>
              <th>Duration</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${
              upcoming.length === 0
                ? `<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--slate-400);">No upcoming leaves scheduled for the next 30 days.</td></tr>`
                : upcoming
                    .map(
                      (l) => `
                  <tr>
                    <td style="font-weight: 600;">${l.employee.firstName} ${l.employee.lastName}</td>
                    <td>${l.leaveType ? l.leaveType.name : l.type}</td>
                    <td>${formatDate(l.startDate || l.fromDate)} – ${formatDate(l.endDate || l.toDate)}</td>
                    <td class="tabular-nums" style="font-weight: 700;">${l.totalDays} days</td>
                    <td>${getStatusBadge(l.status)}</td>
                  </tr>
                `
                    )
                    .join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
};

// Manager Performance Tab
const renderManagerPerformance = async (container) => {
  const teamRes = await API.getTeam();
  const team = teamRes.data.teamMembers || [];

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h2 style="font-size: 20px;">Team Performance Reviews</h2>
        <p style="color: var(--slate-500); font-size: 13px;">Log periodic 1-on-1s, quarterly notes, and ratings</p>
      </div>
    </div>

    <div class="card">
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Team Member</th>
              <th>Designation</th>
              <th>Employee ID</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${
              team.length === 0
                ? `<tr><td colspan="4" style="text-align: center; padding: 24px; color: var(--slate-400);">No team members found.</td></tr>`
                : team
                    .map(
                      (m) => `
                  <tr>
                    <td style="font-weight: 600;">${m.name || `${m.firstName} ${m.lastName}`}</td>
                    <td>${m.designation ? m.designation.title : m.designationId ? m.designationId.title : '--'}</td>
                    <td class="tabular-nums">${m.employeeId}</td>
                    <td>
                      <button class="btn btn-primary btn-sm" onclick="openAddPerformanceModal('${m._id}', '${m.name || m.firstName}')">+ Add Review Note</button>
                    </td>
                  </tr>
                `
                    )
                    .join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
};

/* ==========================================================================
   3. HR ADMIN EXECUTIVE VIEWS
   ========================================================================== */

const renderAdminDashboard = async (container) => {
  const res = await API.getExecutiveAnalytics();
  const kpis = res.data.kpis || {};
  const todayBreakdown = res.data.todayBreakdown || {};

  container.innerHTML = `
    <!-- Top Executive KPI Grid (Google Stitch Screen 0974a856c3fc46a79d0cc488136decf8) -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-title">Active Employees</div>
        <div class="kpi-value">${kpis.totalEmployees || 0}</div>
        <div class="kpi-trend">Across ${kpis.totalDepartments || 0} departments</div>
      </div>

      <div class="kpi-card success">
        <div class="kpi-title">Attendance Today</div>
        <div class="kpi-value">${kpis.attendanceRate || '0%'}</div>
        <div class="kpi-trend">${kpis.presentToday || 0} employees present</div>
      </div>

      <div class="kpi-card warning">
        <div class="kpi-title">Pending Leave Requests</div>
        <div class="kpi-value">${kpis.pendingLeavesCount || 0}</div>
        <div class="kpi-trend">Requires manager review</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-title">Monthly Payroll Disbursed</div>
        <div class="kpi-value">${formatCurrency(kpis.monthlyPayrollDisbursed)}</div>
        <div class="kpi-trend">Current cycle disbursement</div>
      </div>
    </div>

    <!-- Quick Action Admin Bar -->
    <div class="card" style="padding: 16px;">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
        <span style="font-weight: 700; font-size: 13px; color: var(--slate-700); text-transform: uppercase;">
          Quick Administrative Actions:
        </span>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button class="btn btn-primary btn-sm" onclick="openOnboardEmployeeModal()">+ Onboard Employee</button>
          <button class="btn btn-outline btn-sm" onclick="openRunPayrollModal()">⚡ Run Monthly Payroll</button>
          <button class="btn btn-secondary btn-sm" onclick="openAddDepartmentModal()">+ Add Department</button>
          <button class="btn btn-secondary btn-sm" onclick="openAddHolidayModal()">+ Schedule Holiday</button>
        </div>
      </div>
    </div>

    <!-- Attendance Today Status Distribution & Recent Applications -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Today's Workforce Attendance Status</div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; padding: 8px 0;">
          <div style="padding: 14px; background: var(--success-bg); border-radius: var(--radius-md); border: 1px solid var(--success-border);">
            <div style="font-size: 11px; font-weight: 700; color: var(--success); text-transform: uppercase;">Present Staff</div>
            <div style="font-size: 24px; font-weight: 800; color: var(--success);">${todayBreakdown.present || 0}</div>
          </div>
          <div style="padding: 14px; background: var(--warning-bg); border-radius: var(--radius-md); border: 1px solid var(--warning-border);">
            <div style="font-size: 11px; font-weight: 700; color: var(--warning); text-transform: uppercase;">Late Arrivals</div>
            <div style="font-size: 24px; font-weight: 800; color: var(--warning);">${todayBreakdown.late || 0}</div>
          </div>
          <div style="padding: 14px; background: var(--info-bg); border-radius: var(--radius-md); border: 1px solid var(--info-border);">
            <div style="font-size: 11px; font-weight: 700; color: var(--info); text-transform: uppercase;">On Approved Leave</div>
            <div style="font-size: 24px; font-weight: 800; color: var(--info);">${todayBreakdown.onLeave || 0}</div>
          </div>
          <div style="padding: 14px; background: var(--slate-100); border-radius: var(--radius-md); border: 1px solid var(--slate-200);">
            <div style="font-size: 11px; font-weight: 700; color: var(--slate-600); text-transform: uppercase;">Not Clocked In</div>
            <div style="font-size: 24px; font-weight: 800; color: var(--slate-800);">${todayBreakdown.notClockedIn || 0}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">Recent Leave Applications</div>
          <button class="btn btn-secondary btn-sm" onclick="state.activeTab='admin_leaves'; renderSidebar(); renderCurrentTab();">Manage All</button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${
            (res.data.recentLeaves || []).length === 0
              ? `<div style="text-align: center; color: var(--slate-400); padding: 32px;">No recent leave activity.</div>`
              : (res.data.recentLeaves || [])
                  .map(
                    (l) => `
                <div style="padding: 10px 14px; border: 1px solid var(--slate-200); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between;">
                  <div>
                    <div style="font-weight: 600; font-size: 13px;">${l.employee ? `${l.employee.firstName} ${l.employee.lastName}` : 'Staff'}</div>
                    <div style="font-size: 11.5px; color: var(--slate-500);">${l.leaveType ? l.leaveType.name : l.type} • ${l.totalDays} days</div>
                  </div>
                  <div>${getStatusBadge(l.status)}</div>
                </div>
              `
                  )
                  .join('')
          }
        </div>
      </div>
    </div>
  `;
};

// Admin Employees Tab
const renderAdminEmployees = async (container) => {
  const res = await API.getAllEmployees();
  const employees = res.data.employees || [];

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h2 style="font-size: 20px;">Employee Directory</h2>
        <p style="color: var(--slate-500); font-size: 13px;">Manage staff onboarding, reporting structure, and roles</p>
      </div>
      <button class="btn btn-primary" onclick="openOnboardEmployeeModal()">+ Onboard New Employee</button>
    </div>

    <div class="card">
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Department</th>
              <th>Designation</th>
              <th>Base Salary</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${
              employees.length === 0
                ? `<tr><td colspan="8" style="text-align: center; padding: 24px; color: var(--slate-400);">No employees found.</td></tr>`
                : employees
                    .map(
                      (e) => `
                  <tr>
                    <td class="tabular-nums" style="font-weight: 700;">${e.employeeId}</td>
                    <td style="font-weight: 600;">${e.name || `${e.firstName || ''} ${e.lastName || ''}`.trim()}</td>
                    <td>${e.email}</td>
                    <td><span class="user-role-badge">${e.role}</span></td>
                    <td>${e.department ? e.department.name : e.departmentId ? e.departmentId.name : '--'}</td>
                    <td>${e.designation ? e.designation.title : e.designationId ? e.designationId.title : '--'}</td>
                    <td class="tabular-nums">${formatCurrency(e.baseSalary)}</td>
                    <td>${getStatusBadge(e.status)}</td>
                  </tr>
                `
                    )
                    .join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
};

// Admin Departments Tab
const renderAdminDepartments = async (container) => {
  const res = await API.getDepartments();
  const departments = res.data.departments || [];

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h2 style="font-size: 20px;">Departments Management</h2>
        <p style="color: var(--slate-500); font-size: 13px;">Manage organizational departments and department heads</p>
      </div>
      <button class="btn btn-primary" onclick="openAddDepartmentModal()">+ Add Department</button>
    </div>

    <div class="card">
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Department Name</th>
              <th>Code</th>
              <th>Head of Department</th>
              <th>Active Staff</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${
              departments.length === 0
                ? `<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--slate-400);">No departments created.</td></tr>`
                : departments
                    .map(
                      (d) => `
                  <tr>
                    <td style="font-weight: 700;">${d.name}</td>
                    <td><span class="user-role-badge">${d.code}</span></td>
                    <td>${d.headOfDepartment ? `${d.headOfDepartment.firstName} ${d.headOfDepartment.lastName}` : '--'}</td>
                    <td class="tabular-nums" style="font-weight: 600;">${d.employeeCount || 0}</td>
                    <td>${getStatusBadge(d.isActive ? 'ACTIVE' : 'INACTIVE')}</td>
                    <td>
                      <button class="btn btn-secondary btn-sm" onclick="handleDeleteDepartment('${d._id}')">Delete</button>
                    </td>
                  </tr>
                `
                    )
                    .join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
};

const handleDeleteDepartment = async (id) => {
  if (!confirm('Are you sure you want to delete this department?')) return;
  try {
    await API.deleteDepartment(id);
    showToast('Department deleted.');
    renderCurrentTab();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// Admin Designations Tab
const renderAdminDesignations = async (container) => {
  const res = await API.getDesignations();
  const designations = res.data.designations || [];

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h2 style="font-size: 20px;">Designations & Salary Bands</h2>
        <p style="color: var(--slate-500); font-size: 13px;">Manage job titles, hierarchy levels, and minimum/maximum compensation ranges</p>
      </div>
      <button class="btn btn-primary" onclick="openAddDesignationModal()">+ Add Designation</button>
    </div>

    <div class="card">
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Designation Title</th>
              <th>Department</th>
              <th>Hierarchy Level</th>
              <th>Salary Band Range</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${
              designations.length === 0
                ? `<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--slate-400);">No designations defined yet.</td></tr>`
                : designations
                    .map(
                      (d) => `
                  <tr>
                    <td style="font-weight: 700;">${d.title}</td>
                    <td>${d.department ? d.department.name : '--'}</td>
                    <td>Level ${d.level}</td>
                    <td class="tabular-nums">${formatCurrency(d.minSalary)} – ${formatCurrency(d.maxSalary)}</td>
                    <td>${getStatusBadge(d.isActive ? 'ACTIVE' : 'INACTIVE')}</td>
                    <td>
                      <button class="btn btn-secondary btn-sm" onclick="handleDeleteDesignation('${d._id}')">Delete</button>
                    </td>
                  </tr>
                `
                    )
                    .join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
};

const handleDeleteDesignation = async (id) => {
  if (!confirm('Are you sure you want to delete this designation?')) return;
  try {
    await API.deleteDesignation(id);
    showToast('Designation deleted.');
    renderCurrentTab();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// Admin Attendance Monitoring
const renderAdminAttendance = async (container) => {
  const res = await API.getAllAttendance();
  const attendance = res.data.attendance || [];

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Company Attendance Logs</div>
          <div class="card-subtitle">Organization-wide presence audits with regularization</div>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Date</th>
              <th>Clock In</th>
              <th>Clock Out</th>
              <th>Hours</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${
              attendance.length === 0
                ? `<tr><td colspan="7" style="text-align: center; padding: 24px; color: var(--slate-400);">No attendance records found.</td></tr>`
                : attendance
                    .map(
                      (a) => `
                  <tr>
                    <td style="font-weight: 600;">${a.employee ? `${a.employee.firstName} ${a.employee.lastName}` : 'Staff'}</td>
                    <td>${formatDate(a.date)}</td>
                    <td>${formatTime(a.clockIn)}</td>
                    <td>${formatTime(a.clockOut)}</td>
                    <td class="tabular-nums">${a.totalHours ? `${a.totalHours} hrs` : '--'}</td>
                    <td>${getStatusBadge(a.status)}</td>
                    <td style="font-size: 12px; color: var(--slate-500);">${a.notes || '--'}</td>
                  </tr>
                `
                    )
                    .join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
};

// Admin Leaves Tab
const renderAdminLeaves = async (container) => {
  const res = await API.getAllLeaves();
  const leaves = res.data.leaves || [];

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Company-Wide Leave Records</div>
          <div class="card-subtitle">Master leave request registry across all departments</div>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Leave Type</th>
              <th>Period</th>
              <th>Days</th>
              <th>Reason</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${
              leaves.length === 0
                ? `<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--slate-400);">No leave records found.</td></tr>`
                : leaves
                    .map(
                      (l) => `
                  <tr>
                    <td style="font-weight: 600;">${l.employee ? `${l.employee.firstName} ${l.employee.lastName}` : 'Staff'}</td>
                    <td>${l.leaveType ? l.leaveType.name : l.type}</td>
                    <td>${formatDate(l.startDate || l.fromDate)} – ${formatDate(l.endDate || l.toDate)}</td>
                    <td class="tabular-nums" style="font-weight: 700;">${l.totalDays}</td>
                    <td style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${l.reason}</td>
                    <td>${getStatusBadge(l.status)}</td>
                  </tr>
                `
                    )
                    .join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
};

// Admin Holidays Tab
const renderAdminHolidays = async (container) => {
  const res = await API.getHolidays();
  const holidays = res.data.holidays || [];

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h2 style="font-size: 20px;">Company Holiday Calendar</h2>
        <p style="color: var(--slate-500); font-size: 13px;">Official closures integrated into attendance & payroll calculations</p>
      </div>
      <button class="btn btn-primary" onclick="openAddHolidayModal()">+ Schedule Holiday</button>
    </div>

    <div class="card">
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Holiday Name</th>
              <th>Date</th>
              <th>Classification</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${
              holidays.length === 0
                ? `<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--slate-400);">No holidays scheduled for this year.</td></tr>`
                : holidays
                    .map(
                      (h) => `
                  <tr>
                    <td style="font-weight: 700;">${h.name}</td>
                    <td>${formatDate(h.date)}</td>
                    <td><span class="user-role-badge">${h.type}</span></td>
                    <td style="color: var(--slate-500); font-size: 12px;">${h.description || '--'}</td>
                    <td>
                      <button class="btn btn-secondary btn-sm" onclick="handleDeleteHoliday('${h._id}')">Remove</button>
                    </td>
                  </tr>
                `
                    )
                    .join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
};

const handleDeleteHoliday = async (id) => {
  if (!confirm('Are you sure you want to remove this holiday?')) return;
  try {
    await API.deleteHoliday(id);
    showToast('Holiday removed.');
    renderCurrentTab();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// Admin Payroll Processing Tab
const renderAdminPayroll = async (container) => {
  const currentYear = new Date().getUTCFullYear();
  const currentMonth = new Date().getUTCMonth() + 1;

  const [summaryRes, payslipsRes] = await Promise.all([
    API.getPayrollSummary(currentMonth, currentYear).catch(() => ({ data: { totals: {}, statusBreakdown: {} } })),
    API.getAllPayslips(`?month=${currentMonth}&year=${currentYear}`).catch(() => ({ data: { payslips: [] } }))
  ]);

  const totals = summaryRes.data.totals || {};
  const payslips = payslipsRes.data.payslips || [];

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h2 style="font-size: 20px;">Payroll Engine & Disbursement</h2>
        <p style="color: var(--slate-500); font-size: 13px;">Cycle: ${currentMonth}/${currentYear} — Automated calculation with Loss of Pay (LOP) deductions</p>
      </div>
      <button class="btn btn-primary btn-lg" onclick="openRunPayrollModal()">⚡ Execute Payroll Run</button>
    </div>

    <!-- Payroll Financial Metrics Row -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-title">Gross Earnings Disbursed</div>
        <div class="kpi-value">${formatCurrency(totals.totalGross)}</div>
        <div class="kpi-trend">Base + HRA + DA + Allowances</div>
      </div>
      <div class="kpi-card danger">
        <div class="kpi-title">Loss of Pay Deductions</div>
        <div class="kpi-value">${formatCurrency(totals.totalLOPDeductions)}</div>
        <div class="kpi-trend">Absences & uncredited days</div>
      </div>
      <div class="kpi-card warning">
        <div class="kpi-title">Statutory Taxes & Deductions</div>
        <div class="kpi-value">${formatCurrency(totals.totalDeductions)}</div>
        <div class="kpi-trend">PF (12%), PT ($200), TDS (5%)</div>
      </div>
      <div class="kpi-card success">
        <div class="kpi-title">Net Salary Transferred</div>
        <div class="kpi-value">${formatCurrency(totals.totalNetSalary)}</div>
        <div class="kpi-trend">Actual financial outflow</div>
      </div>
    </div>

    <!-- Generated Payslips Registry -->
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Generated Payslip Registry (${currentMonth}/${currentYear})</div>
          <div class="card-subtitle">Itemized payslip archive with payment status updates</div>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Base Salary</th>
              <th>Gross Pay</th>
              <th>Deductions</th>
              <th>Net Salary</th>
              <th>LOP Days</th>
              <th>Status</th>
              <th>Disbursement Actions</th>
            </tr>
          </thead>
          <tbody>
            ${
              payslips.length === 0
                ? `<tr><td colspan="8" style="text-align: center; padding: 24px; color: var(--slate-400);">No payroll runs recorded for this cycle. Click 'Execute Payroll Run' above.</td></tr>`
                : payslips
                    .map(
                      (p) => `
                  <tr>
                    <td style="font-weight: 700;">${p.employee ? `${p.employee.firstName} ${p.employee.lastName} (${p.employee.employeeId})` : 'Staff'}</td>
                    <td class="tabular-nums">${formatCurrency(p.baseSalary || p.baseSalarySnapshot)}</td>
                    <td class="tabular-nums" style="color: var(--success);">${formatCurrency(p.grossPay || p.grossEarnings)}</td>
                    <td class="tabular-nums" style="color: var(--danger);">${formatCurrency(p.totalDeductions)}</td>
                    <td class="tabular-nums" style="font-weight: 800; font-size: 14px;">${formatCurrency(p.netPay || p.netSalary)}</td>
                    <td class="tabular-nums">${p.lopDays || 0}</td>
                    <td>${getStatusBadge(p.status || p.paymentStatus)}</td>
                    <td>
                      <button class="btn btn-secondary btn-sm" onclick="handleMarkPaid('${p._id}')">Mark Paid</button>
                    </td>
                  </tr>
                `
                    )
                    .join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
};

const handleMarkPaid = async (id) => {
  const ref = prompt('Enter bank disbursement reference transaction ID:', `TXN-${Date.now()}`);
  if (!ref) return;

  try {
    await API.updatePayslipStatus(id, {
      paymentStatus: 'PAID',
      transactionReference: ref,
      paymentDate: new Date()
    });
    showToast('Payslip disbursement marked as PAID.');
    renderCurrentTab();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// Admin Reports & Analytics Tab
const renderAdminAnalytics = async (container) => {
  const [headcountRes, payrollRes, leavesRes, attendanceRes] = await Promise.all([
    API.getHeadcountAnalytics(),
    API.getPayrollAnalytics(),
    API.getLeavesAnalytics(),
    API.getAttendanceAnalytics()
  ]);

  const departments = headcountRes.data.departments || [];
  const payrollTrends = payrollRes.data.monthlyTrends || [];
  const byLeaveType = leavesRes.data.byLeaveType || [];
  const deptAttendance = attendanceRes.data.departmentAttendance || [];

  container.innerHTML = `
    <div>
      <h2 style="font-size: 20px;">Corporate HR Reports & Analytics</h2>
      <p style="color: var(--slate-500); font-size: 13px;">Native MongoDB Aggregation Pipelines computing workforce demographics and financial trends</p>
    </div>

    <!-- Department Headcount & Salaries -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Department Headcount & Salary Distribution</div>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Headcount</th>
                <th>Avg Salary</th>
                <th>Max Salary</th>
              </tr>
            </thead>
            <tbody>
              ${departments
                .map(
                  (d) => `
                <tr>
                  <td style="font-weight: 600;">${d.departmentName} (${d.departmentCode})</td>
                  <td class="tabular-nums" style="font-weight: 700;">${d.count}</td>
                  <td class="tabular-nums">${formatCurrency(d.averageSalary)}</td>
                  <td class="tabular-nums">${formatCurrency(d.maxSalary)}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Department-wise Attendance Rate -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Department Attendance Performance (Last 30 Days)</div>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Total Logs</th>
                <th>Present Count</th>
                <th>Attendance Rate</th>
              </tr>
            </thead>
            <tbody>
              ${deptAttendance
                .map(
                  (da) => `
                <tr>
                  <td style="font-weight: 600;">${da.departmentName}</td>
                  <td class="tabular-nums">${da.totalLogs}</td>
                  <td class="tabular-nums">${da.presentLogs}</td>
                  <td><span class="status-pill status-present">${da.attendanceRate}</span></td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Monthly Payroll Expenditure Trends -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">Monthly Payroll Expenditure Aggregation</div>
      </div>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Pay Period</th>
              <th>Employees Count</th>
              <th>Gross Disbursed</th>
              <th>Taxes & Deductions</th>
              <th>Loss of Pay Deductions</th>
              <th>Net Salary Paid</th>
            </tr>
          </thead>
          <tbody>
            ${
              payrollTrends.length === 0
                ? `<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--slate-400);">No multi-month historical trends logged yet.</td></tr>`
                : payrollTrends
                    .map(
                      (pt) => `
                  <tr>
                    <td style="font-weight: 700;">${pt.month}/${pt.year}</td>
                    <td class="tabular-nums">${pt.employeeCount}</td>
                    <td class="tabular-nums" style="color: var(--success);">${formatCurrency(pt.totalGross)}</td>
                    <td class="tabular-nums" style="color: var(--danger);">${formatCurrency(pt.totalDeductions)}</td>
                    <td class="tabular-nums">${formatCurrency(pt.totalLOP)}</td>
                    <td class="tabular-nums" style="font-weight: 800; font-size: 14px;">${formatCurrency(pt.totalNetSalary)}</td>
                  </tr>
                `
                    )
                    .join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
};

/* ==========================================================================
   4. MODALS & POPUP WORKFLOWS
   ========================================================================== */

// Open Apply Leave Modal
const openApplyLeaveModal = () => {
  const container = document.getElementById('modal-container');
  container.innerHTML = `
    <div class="modal-overlay active" id="modal-apply">
      <div class="modal-box">
        <div class="modal-header">
          <h3 style="font-size: 16px;">Apply for Leave</h3>
          <button onclick="closeModal('modal-apply')" style="color: var(--slate-400);">&times;</button>
        </div>
        <form id="form-apply-leave">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Leave Category</label>
              <select id="leave-type-select" class="form-control" required>
                <option value="CASUAL">Casual Leave (CL)</option>
                <option value="SICK">Sick Leave (SL)</option>
                <option value="EARNED">Earned Leave (EL)</option>
                <option value="UNPAID">Loss of Pay / Unpaid (LOP)</option>
              </select>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label class="form-label">Start Date (From)</label>
                <input type="date" id="leave-start-date" class="form-control" required>
              </div>
              <div class="form-group">
                <label class="form-label">End Date (To)</label>
                <input type="date" id="leave-end-date" class="form-control" required>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Reason for Absence</label>
              <textarea id="leave-reason" class="form-control" rows="3" placeholder="Provide detailed explanation for manager review..." required></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="closeModal('modal-apply')">Cancel</button>
            <button type="submit" class="btn btn-primary">Submit Application</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('form-apply-leave').addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = document.getElementById('leave-type-select').value;
    const fromDate = document.getElementById('leave-start-date').value;
    const toDate = document.getElementById('leave-end-date').value;
    const reason = document.getElementById('leave-reason').value.trim();

    try {
      await API.applyLeave({ type, fromDate, toDate, reason });
      closeModal('modal-apply');
      showToast('Leave request submitted successfully for manager review.');
      renderCurrentTab();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
};

// Open Onboard Employee Modal
const openOnboardEmployeeModal = async () => {
  const [deptRes, desigRes, mgrRes] = await Promise.all([
    API.getDepartments().catch(() => ({ data: { departments: [] } })),
    API.getDesignations().catch(() => ({ data: { designations: [] } })),
    API.getAllEmployees('?role=manager').catch(() => ({ data: { employees: [] } }))
  ]);

  const depts = deptRes.data.departments || [];
  const desigs = desigRes.data.designations || [];
  const managers = mgrRes.data.employees || [];

  const container = document.getElementById('modal-container');
  container.innerHTML = `
    <div class="modal-overlay active" id="modal-onboard">
      <div class="modal-box" style="max-width: 640px;">
        <div class="modal-header">
          <h3 style="font-size: 16px;">Onboard New Employee (HR Admin)</h3>
          <button onclick="closeModal('modal-onboard')" style="color: var(--slate-400);">&times;</button>
        </div>
        <form id="form-onboard">
          <div class="modal-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label class="form-label">Full Name</label>
                <input type="text" id="ob-name" class="form-control" placeholder="Jane Doe" required>
              </div>
              <div class="form-group">
                <label class="form-label">Corporate Email</label>
                <input type="email" id="ob-email" class="form-control" placeholder="jane.doe@apexcorp.com" required>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label class="form-label">System Role</label>
                <select id="ob-role" class="form-control">
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="hr_admin">HR Admin</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Temporary Password</label>
                <input type="password" id="ob-password" class="form-control" value="Emp@123456" required>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label class="form-label">Department</label>
                <select id="ob-dept" class="form-control">
                  <option value="">-- Select Department --</option>
                  ${depts.map((d) => `<option value="${d._id}">${d.name} (${d.code})</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Designation</label>
                <select id="ob-desig" class="form-control">
                  <option value="">-- Select Designation --</option>
                  ${desigs.map((d) => `<option value="${d._id}">${d.title}</option>`).join('')}
                </select>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label class="form-label">Reporting Manager</label>
                <select id="ob-manager" class="form-control">
                  <option value="">-- None / Direct to Director --</option>
                  ${managers.map((m) => `<option value="${m._id}">${m.name || `${m.firstName} ${m.lastName}`} (${m.email})</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Base Monthly Salary ($)</label>
                <input type="number" id="ob-salary" class="form-control" placeholder="75000" required>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="closeModal('modal-onboard')">Cancel</button>
            <button type="submit" class="btn btn-primary">Complete Onboarding</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('form-onboard').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('ob-name').value.trim();
    const email = document.getElementById('ob-email').value.trim();
    const role = document.getElementById('ob-role').value;
    const password = document.getElementById('ob-password').value;
    const departmentId = document.getElementById('ob-dept').value || null;
    const designationId = document.getElementById('ob-desig').value || null;
    const managerId = document.getElementById('ob-manager').value || null;
    const baseSalary = Number(document.getElementById('ob-salary').value) || 0;

    try {
      await API.onboardEmployee({
        name,
        email,
        role,
        password,
        departmentId,
        designationId,
        managerId,
        baseSalary
      });
      closeModal('modal-onboard');
      showToast('New employee onboarded and initial leave quota provisioned.');
      renderCurrentTab();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
};

// Open Run Payroll Modal
const openRunPayrollModal = () => {
  const currentYear = new Date().getUTCFullYear();
  const currentMonth = new Date().getUTCMonth() + 1;

  const container = document.getElementById('modal-container');
  container.innerHTML = `
    <div class="modal-overlay active" id="modal-payroll">
      <div class="modal-box">
        <div class="modal-header">
          <h3 style="font-size: 16px;">Execute Automated Payroll Run</h3>
          <button onclick="closeModal('modal-payroll')" style="color: var(--slate-400);">&times;</button>
        </div>
        <form id="form-run-payroll">
          <div class="modal-body">
            <p style="font-size: 13px; color: var(--slate-600);">
              The payroll engine will calculate attendance hours, loss of pay (LOP) deductions, standard allowances (HRA, DA), and statutory withholding (PF, PT, TDS) for all active employees.
            </p>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label class="form-label">Pay Period Month</label>
                <select id="pay-month" class="form-control">
                  ${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}" ${i + 1 === currentMonth ? 'selected' : ''}>Month ${i + 1}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Pay Period Year</label>
                <input type="number" id="pay-year" class="form-control" value="${currentYear}">
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 8px; margin-top: 6px;">
              <input type="checkbox" id="pay-rerun">
              <label for="pay-rerun" style="font-size: 13px; color: var(--slate-700);">Recalculate / Rerun existing period (Rerun Flag)</label>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="closeModal('modal-payroll')">Cancel</button>
            <button type="submit" class="btn btn-primary">Start Execution</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('form-run-payroll').addEventListener('submit', async (e) => {
    e.preventDefault();
    const month = Number(document.getElementById('pay-month').value);
    const year = Number(document.getElementById('pay-year').value);
    const rerun = document.getElementById('pay-rerun').checked;

    try {
      const res = await API.runPayroll(month, year, rerun);
      closeModal('modal-payroll');
      showToast(`Payroll executed for ${res.data.employeesProcessed} employees.`);
      renderCurrentTab();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
};

// Open Payslip Itemized Details Modal
const openPayslipModal = async (id) => {
  try {
    const res = await API.getPayslipById(id);
    const p = res.data.payslip;
    const a = p.allowances || {};
    const d = p.deductions || {};

    const container = document.getElementById('modal-container');
    container.innerHTML = `
      <div class="modal-overlay active" id="modal-payslip-detail">
        <div class="modal-box" style="max-width: 600px;">
          <div class="modal-header">
            <div>
              <h3 style="font-size: 16px;">ApexCorp Formal Payslip</h3>
              <div style="font-size: 12px; color: var(--slate-500);">Period: ${p.month || p.payPeriodMonth}/${p.year || p.payPeriodYear} • Reference: ${p.transactionReference || 'PENDING'}</div>
            </div>
            <button onclick="closeModal('modal-payslip-detail')" style="color: var(--slate-400);">&times;</button>
          </div>
          <div class="modal-body" style="gap: 20px;">
            <div style="display: flex; justify-content: space-between; padding: 12px; background-color: var(--slate-50); border-radius: var(--radius-md); border: 1px solid var(--slate-200);">
              <div>
                <div style="font-size: 11px; font-weight: 700; color: var(--slate-500); text-transform: uppercase;">Employee</div>
                <div style="font-weight: 700;">${p.employee ? `${p.employee.firstName} ${p.employee.lastName}` : 'Staff'}</div>
                <div style="font-size: 12px; color: var(--slate-500);">${p.employee ? p.employee.employeeId : ''}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 11px; font-weight: 700; color: var(--slate-500); text-transform: uppercase;">Payment Status</div>
                <div>${getStatusBadge(p.status || p.paymentStatus)}</div>
              </div>
            </div>

            <!-- Earnings vs Deductions Split -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div style="border: 1px solid var(--slate-200); border-radius: var(--radius-md); padding: 12px;">
                <div style="font-size: 12px; font-weight: 700; color: var(--success); text-transform: uppercase; margin-bottom: 8px;">Earnings ($)</div>
                <div style="display: flex; justify-content: space-between; font-size: 12.5px; margin-bottom: 4px;"><span>Basic Pay:</span> <strong>${formatCurrency(p.baseSalary || p.baseSalarySnapshot)}</strong></div>
                <div style="display: flex; justify-content: space-between; font-size: 12.5px; margin-bottom: 4px;"><span>HRA (40%):</span> <strong>${formatCurrency(a.hra)}</strong></div>
                <div style="display: flex; justify-content: space-between; font-size: 12.5px; margin-bottom: 4px;"><span>DA (10%):</span> <strong>${formatCurrency(a.da)}</strong></div>
                <div style="display: flex; justify-content: space-between; font-size: 12.5px; margin-bottom: 4px;"><span>Special:</span> <strong>${formatCurrency(a.special)}</strong></div>
                <div style="display: flex; justify-content: space-between; font-size: 12.5px; margin-bottom: 8px;"><span>Medical:</span> <strong>${formatCurrency(a.medical)}</strong></div>
                <div style="border-top: 1px solid var(--slate-200); padding-top: 6px; display: flex; justify-content: space-between; font-weight: 800; color: var(--success);">
                  <span>Total Gross:</span> <span>${formatCurrency(p.grossPay || p.grossEarnings)}</span>
                </div>
              </div>

              <div style="border: 1px solid var(--slate-200); border-radius: var(--radius-md); padding: 12px;">
                <div style="font-size: 12px; font-weight: 700; color: var(--danger); text-transform: uppercase; margin-bottom: 8px;">Deductions ($)</div>
                <div style="display: flex; justify-content: space-between; font-size: 12.5px; margin-bottom: 4px;"><span>Provident Fund (12%):</span> <strong>${formatCurrency(d.pf)}</strong></div>
                <div style="display: flex; justify-content: space-between; font-size: 12.5px; margin-bottom: 4px;"><span>Professional Tax:</span> <strong>${formatCurrency(d.professionalTax)}</strong></div>
                <div style="display: flex; justify-content: space-between; font-size: 12.5px; margin-bottom: 4px;"><span>TDS (5%):</span> <strong>${formatCurrency(d.tds)}</strong></div>
                <div style="display: flex; justify-content: space-between; font-size: 12.5px; margin-bottom: 8px;"><span>LOP (${p.lopDays} days):</span> <strong>${formatCurrency(d.lopDeduction)}</strong></div>
                <div style="border-top: 1px solid var(--slate-200); padding-top: 6px; display: flex; justify-content: space-between; font-weight: 800; color: var(--danger);">
                  <span>Total Deductions:</span> <span>${formatCurrency(p.totalDeductions)}</span>
                </div>
              </div>
            </div>

            <!-- Net Salary Banner -->
            <div style="padding: 16px; background: linear-gradient(135deg, var(--primary) 0%, #1E3A8A 100%); border-radius: var(--radius-md); color: #FFFFFF; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.85;">Net Take-Home Remuneration</div>
                <div style="font-size: 28px; font-weight: 800; font-family: var(--font-headline);">${formatCurrency(p.netPay || p.netSalary)}</div>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="window.print()">Print Payslip</button>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// Open Add Department Modal
const openAddDepartmentModal = () => {
  const container = document.getElementById('modal-container');
  container.innerHTML = `
    <div class="modal-overlay active" id="modal-dept">
      <div class="modal-box">
        <div class="modal-header">
          <h3 style="font-size: 16px;">Create New Department</h3>
          <button onclick="closeModal('modal-dept')" style="color: var(--slate-400);">&times;</button>
        </div>
        <form id="form-add-dept">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Department Name</label>
              <input type="text" id="dept-name" class="form-control" placeholder="Information Technology" required>
            </div>
            <div class="form-group">
              <label class="form-label">Department Code</label>
              <input type="text" id="dept-code" class="form-control" placeholder="IT" required style="text-transform: uppercase;">
            </div>
            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea id="dept-desc" class="form-control" rows="2" placeholder="Responsibilities and scope..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="closeModal('modal-dept')">Cancel</button>
            <button type="submit" class="btn btn-primary">Create Department</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('form-add-dept').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('dept-name').value.trim();
    const code = document.getElementById('dept-code').value.trim().toUpperCase();
    const description = document.getElementById('dept-desc').value.trim();

    try {
      await API.createDepartment({ name, code, description });
      closeModal('modal-dept');
      showToast('Department created successfully.');
      renderCurrentTab();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
};

// Open Add Designation Modal
const openAddDesignationModal = async () => {
  const deptRes = await API.getDepartments();
  const depts = deptRes.data.departments || [];

  const container = document.getElementById('modal-container');
  container.innerHTML = `
    <div class="modal-overlay active" id="modal-desig">
      <div class="modal-box">
        <div class="modal-header">
          <h3 style="font-size: 16px;">Create New Designation</h3>
          <button onclick="closeModal('modal-desig')" style="color: var(--slate-400);">&times;</button>
        </div>
        <form id="form-add-desig">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Designation Title</label>
              <input type="text" id="desig-title" class="form-control" placeholder="Staff Software Engineer" required>
            </div>

            <div class="form-group">
              <label class="form-label">Department</label>
              <select id="desig-dept" class="form-control" required>
                ${depts.map((d) => `<option value="${d._id}">${d.name}</option>`).join('')}
              </select>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label class="form-label">Min Salary ($)</label>
                <input type="number" id="desig-min" class="form-control" placeholder="70000" required>
              </div>
              <div class="form-group">
                <label class="form-label">Max Salary ($)</label>
                <input type="number" id="desig-max" class="form-control" placeholder="110000" required>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="closeModal('modal-desig')">Cancel</button>
            <button type="submit" class="btn btn-primary">Create Designation</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('form-add-desig').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('desig-title').value.trim();
    const department = document.getElementById('desig-dept').value;
    const minSalary = Number(document.getElementById('desig-min').value);
    const maxSalary = Number(document.getElementById('desig-max').value);

    try {
      await API.createDesignation({ title, department, minSalary, maxSalary });
      closeModal('modal-desig');
      showToast('Designation created successfully.');
      renderCurrentTab();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
};

// Open Add Holiday Modal
const openAddHolidayModal = () => {
  const container = document.getElementById('modal-container');
  container.innerHTML = `
    <div class="modal-overlay active" id="modal-holiday">
      <div class="modal-box">
        <div class="modal-header">
          <h3 style="font-size: 16px;">Schedule Company Holiday</h3>
          <button onclick="closeModal('modal-holiday')" style="color: var(--slate-400);">&times;</button>
        </div>
        <form id="form-add-holiday">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Holiday Name</label>
              <input type="text" id="hol-name" class="form-control" placeholder="Independence Day" required>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label class="form-label">Date</label>
                <input type="date" id="hol-date" class="form-control" required>
              </div>
              <div class="form-group">
                <label class="form-label">Classification</label>
                <select id="hol-type" class="form-control">
                  <option value="NATIONAL">National</option>
                  <option value="FESTIVAL">Festival</option>
                  <option value="COMPANY">Company</option>
                  <option value="OPTIONAL">Optional</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea id="hol-desc" class="form-control" rows="2" placeholder="Official company closure notes..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="closeModal('modal-holiday')">Cancel</button>
            <button type="submit" class="btn btn-primary">Schedule Holiday</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('form-add-holiday').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('hol-name').value.trim();
    const date = document.getElementById('hol-date').value;
    const type = document.getElementById('hol-type').value;
    const description = document.getElementById('hol-desc').value.trim();

    try {
      await API.createHoliday({ name, date, type, description });
      closeModal('modal-holiday');
      showToast('Holiday scheduled successfully.');
      renderCurrentTab();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
};

// Open Add Performance Review Modal
const openAddPerformanceModal = (employeeId, employeeName) => {
  const container = document.getElementById('modal-container');
  container.innerHTML = `
    <div class="modal-overlay active" id="modal-perf">
      <div class="modal-box">
        <div class="modal-header">
          <h3 style="font-size: 16px;">Log Performance Review — ${employeeName}</h3>
          <button onclick="closeModal('modal-perf')" style="color: var(--slate-400);">&times;</button>
        </div>
        <form id="form-add-perf">
          <div class="modal-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label class="form-label">Review Category</label>
                <select id="perf-category" class="form-control">
                  <option value="1-on-1">1-on-1 Catchup</option>
                  <option value="Quarterly Review">Quarterly Review</option>
                  <option value="Annual Review">Annual Review</option>
                  <option value="Commendation">Commendation</option>
                  <option value="PIP">Performance Improvement Plan</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Rating (1 to 5 Stars)</label>
                <select id="perf-rating" class="form-control">
                  <option value="5">5 — Exceptional</option>
                  <option value="4" selected>4 — Exceeds Expectations</option>
                  <option value="3">3 — Meets Expectations</option>
                  <option value="2">2 — Needs Improvement</option>
                  <option value="1">1 — Unsatisfactory</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Review Title</label>
              <input type="text" id="perf-title" class="form-control" placeholder="Outstanding Delivery on Sprint Initiatives" required>
            </div>

            <div class="form-group">
              <label class="form-label">Detailed Feedback & Comments</label>
              <textarea id="perf-comments" class="form-control" rows="4" placeholder="Detail specific deliverables, technical ownership, and growth areas..." required></textarea>
            </div>

            <div style="display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" id="perf-shared" checked>
              <label for="perf-shared" style="font-size: 13px; color: var(--slate-700);">Share this review with the employee</label>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="closeModal('modal-perf')">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Review Note</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('form-add-perf').addEventListener('submit', async (e) => {
    e.preventDefault();
    const category = document.getElementById('perf-category').value;
    const rating = Number(document.getElementById('perf-rating').value);
    const title = document.getElementById('perf-title').value.trim();
    const comments = document.getElementById('perf-comments').value.trim();
    const isSharedWithEmployee = document.getElementById('perf-shared').checked;

    try {
      await API.createPerformanceNote({
        employeeId,
        category,
        rating,
        title,
        comments,
        isSharedWithEmployee
      });
      closeModal('modal-perf');
      showToast('Performance review logged.');
      renderCurrentTab();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
};

// Generic Modal Closer
const closeModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 200);
  }
};
