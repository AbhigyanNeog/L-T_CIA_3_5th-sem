/**
 * ApexCorp HR & Payroll - Production API Client
 * Interfaces directly with the Node.js + Express backend at /api/v1/*
 */
const API = (() => {
  const BASE_URL = '/api/v1';

  const getToken = () => localStorage.getItem('apex_token');
  const setToken = (token) => localStorage.setItem('apex_token', token);
  const removeToken = () => localStorage.removeItem('apex_token');

  const request = async (endpoint, options = {}) => {
    const url = `${BASE_URL}${endpoint}`;
    const token = getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(url, {
        ...options,
        headers
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401 && !endpoint.includes('/auth/login')) {
          removeToken();
          window.location.reload();
        }
        throw new Error(data.message || `Request failed with status ${res.status}`);
      }

      return data;
    } catch (err) {
      console.error(`[API Error] ${options.method || 'GET'} ${endpoint}:`, err);
      throw err;
    }
  };

  return {
    getToken,
    setToken,
    removeToken,

    // Module 01: Authentication & Onboarding
    login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    getMe: () => request('/auth/me'),
    changePassword: (currentPassword, newPassword) =>
      request('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
    onboardEmployee: (employeeData) =>
      request('/employees/onboard', { method: 'POST', body: JSON.stringify(employeeData) }),
    getAllEmployees: (params = '') => request(`/employees${params}`),
    getEmployeeById: (id) => request(`/employees/${id}`),
    updateEmployee: (id, data) => request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    updateMyProfile: (data) => request('/employees/me', { method: 'PATCH', body: JSON.stringify(data) }),

    // Module 02: Departments & Designations
    getDepartments: () => request('/departments'),
    createDepartment: (data) => request('/departments', { method: 'POST', body: JSON.stringify(data) }),
    updateDepartment: (id, data) => request(`/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteDepartment: (id) => request(`/departments/${id}`, { method: 'DELETE' }),

    getDesignations: () => request('/designations'),
    createDesignation: (data) => request('/designations', { method: 'POST', body: JSON.stringify(data) }),
    updateDesignation: (id, data) => request(`/designations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteDesignation: (id) => request(`/designations/${id}`, { method: 'DELETE' }),

    // Module 03: Daily Attendance Tracking
    clockIn: (notes = '') => request('/attendance/clock-in', { method: 'POST', body: JSON.stringify({ notes }) }),
    clockOut: (notes = '') => request('/attendance/clock-out', { method: 'POST', body: JSON.stringify({ notes }) }),
    getTodayAttendance: () => request('/attendance/today'),
    getMyAttendance: (params = '') => request(`/attendance/me${params}`),
    getAllAttendance: (params = '') => request(`/attendance${params}`),
    regularizeAttendance: (data) => request('/attendance/regularize', { method: 'POST', body: JSON.stringify(data) }),

    // Module 04: Leave Request & Approval
    applyLeave: (data) => request('/leaves/apply', { method: 'POST', body: JSON.stringify(data) }),
    getMyLeaves: (params = '') => request(`/leaves/me${params}`),
    cancelLeave: (id) => request(`/leaves/${id}/cancel`, { method: 'PATCH' }),
    getPendingLeaves: () => request('/leaves/pending'),
    updateLeaveStatus: (id, status, remarks) =>
      request(`/leaves/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, remarks }) }),
    getAllLeaves: (params = '') => request(`/leaves${params}`),

    // Module 05: Leave Balance Management
    getMyBalances: (year) => request(`/leaves/balances/me${year ? `?year=${year}` : ''}`),
    getEmployeeBalances: (id, year) => request(`/leaves/balances/employee/${id}${year ? `?year=${year}` : ''}`),
    adjustBalance: (id, data) => request(`/leaves/balances/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    getLeaveTypes: () => request('/leaves/types'),
    createLeaveType: (data) => request('/leaves/types', { method: 'POST', body: JSON.stringify(data) }),

    // Module 06: Payroll Computation Engine
    runPayroll: (month, year, rerun = false, department = null) =>
      request('/payroll/run', { method: 'POST', body: JSON.stringify({ month, year, rerun, department }) }),
    getPayrollSummary: (month, year) => request(`/payroll/summary?month=${month}&year=${year}`),

    // Module 07: Payslip Records
    getMyPayslips: (year) => request(`/payslips/me${year ? `?year=${year}` : ''}`),
    getPayslipById: (id) => request(`/payslips/${id}`),
    getAllPayslips: (params = '') => request(`/payslips${params}`),
    updatePayslipStatus: (id, data) => request(`/payslips/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),

    // Module 09: Manager Team Dashboard
    getTeam: () => request('/manager/team'),
    getTeamAttendance: () => request('/manager/attendance/today'),
    getTeamUpcomingLeaves: () => request('/manager/leaves/upcoming'),

    // Module 10: Holiday Calendar Management
    getHolidays: (year) => request(`/holidays${year ? `?year=${year}` : ''}`),
    createHoliday: (data) => request('/holidays', { method: 'POST', body: JSON.stringify(data) }),
    updateHoliday: (id, data) => request(`/holidays/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteHoliday: (id) => request(`/holidays/${id}`, { method: 'DELETE' }),

    // Module 11: Performance Note Logging
    createPerformanceNote: (data) => request('/performance', { method: 'POST', body: JSON.stringify(data) }),
    getEmployeePerformanceNotes: (employeeId) => request(`/performance/employee/${employeeId}`),
    getMyPerformanceNotes: () => request('/performance/me'),
    deletePerformanceNote: (id) => request(`/performance/${id}`, { method: 'DELETE' }),

    // Module 12: HR Reports & Analytics
    getExecutiveAnalytics: () => request('/analytics/executive'),
    getHeadcountAnalytics: () => request('/analytics/headcount'),
    getPayrollAnalytics: () => request('/analytics/payroll'),
    getLeavesAnalytics: () => request('/analytics/leaves'),
    getAttendanceAnalytics: () => request('/analytics/attendance')
  };
})();
