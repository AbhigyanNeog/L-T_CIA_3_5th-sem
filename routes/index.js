const express = require('express');
const router = express.Router();
const ApiResponse = require('../utils/apiResponse');

// Import modular routes
const authRoutes = require('./authRoutes');
const departmentRoutes = require('./departmentRoutes');
const designationRoutes = require('./designationRoutes');
const employeeRoutes = require('./employeeRoutes');
const holidayRoutes = require('./holidayRoutes');
const attendanceRoutes = require('./attendanceRoutes');
const leaveRoutes = require('./leaveRoutes');
const payrollRoutes = require('./payrollRoutes');
const payslipRoutes = require('./payslipRoutes');
const performanceRoutes = require('./performanceRoutes');
const managerRoutes = require('./managerRoutes');
const analyticsRoutes = require('./analyticsRoutes');

/**
 * Health check endpoint to verify backend status, uptime, and environment
 */
router.get('/health', (req, res) => {
  return ApiResponse.success(res, 200, 'Corporate HR & Payroll API is healthy and running', {
    status: 'UP',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: `${Math.floor(process.uptime())}s`
  });
});

// Mount modular sub-routers under /api/v1
router.use('/auth', authRoutes);
router.use('/departments', departmentRoutes);
router.use('/designations', designationRoutes);
router.use('/employees', employeeRoutes);
router.use('/holidays', holidayRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/leaves', leaveRoutes);
router.use('/payroll', payrollRoutes);
router.use('/payslips', payslipRoutes);
router.use('/performance', performanceRoutes);
router.use('/manager', managerRoutes);
router.use('/analytics', analyticsRoutes);

module.exports = router;
