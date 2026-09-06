const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./config/db');
const User = require('./models/User');
const Department = require('./models/Department');
const Designation = require('./models/Designation');
const Holiday = require('./models/Holiday');
const LeaveType = require('./models/LeaveType');
const LeaveBalance = require('./models/LeaveBalance');
const LeaveRequest = require('./models/LeaveRequest');
const Attendance = require('./models/Attendance');
const Payslip = require('./models/Payslip');
const PerformanceNote = require('./models/PerformanceNote');

const seedData = async () => {
  try {
    console.log('[Seed] Connecting to database...');
    await connectDB();

    console.log('[Seed] Clearing existing collections...');
    await Promise.all([
      User.deleteMany(),
      Department.deleteMany(),
      Designation.deleteMany(),
      Holiday.deleteMany(),
      LeaveType.deleteMany(),
      LeaveBalance.deleteMany(),
      LeaveRequest.deleteMany(),
      Attendance.deleteMany(),
      Payslip.deleteMany(),
      PerformanceNote.deleteMany()
    ]);

    console.log('[Seed] 1. Seeding Departments...');
    const [deptHR, deptEng, deptFin, deptSales] = await Department.create([
      { name: 'Human Resources', code: 'HR', description: 'Talent acquisition, operations, and compliance' },
      { name: 'Engineering', code: 'ENG', description: 'Software engineering, architecture, and DevOps' },
      { name: 'Finance', code: 'FIN', description: 'Financial planning, accounting, and payroll' },
      { name: 'Sales & Marketing', code: 'SALES', description: 'Enterprise sales, partnerships, and outreach' }
    ]);

    console.log('[Seed] 2. Seeding Designations...');
    const [desigHRAdmin, desigTechLead, desigSrDev, desigJrDev, desigSalesLead, desigFinAnalyst] =
      await Designation.create([
        { title: 'HR Director', department: deptHR._id, level: 5, minSalary: 90000, maxSalary: 140000 },
        { title: 'Engineering Manager', department: deptEng._id, level: 5, minSalary: 110000, maxSalary: 160000 },
        { title: 'Senior Software Engineer', department: deptEng._id, level: 3, minSalary: 75000, maxSalary: 110000 },
        { title: 'Software Engineer', department: deptEng._id, level: 2, minSalary: 55000, maxSalary: 85000 },
        { title: 'Sales Director', department: deptSales._id, level: 5, minSalary: 95000, maxSalary: 150000 },
        { title: 'Senior Financial Analyst', department: deptFin._id, level: 3, minSalary: 65000, maxSalary: 95000 }
      ]);

    console.log('[Seed] 3. Seeding Leave Types...');
    const [ltCL, ltSL, ltEL, ltLOP] = await LeaveType.create([
      { name: 'Casual Leave', code: 'CL', description: 'Personal time off for urgent matters', annualQuota: 12, isPaid: true },
      { name: 'Sick Leave', code: 'SL', description: 'Medical recovery and health emergencies', annualQuota: 10, isPaid: true },
      { name: 'Earned Leave', code: 'EL', description: 'Annual paid vacation days', annualQuota: 15, isPaid: true, isCarryForward: true },
      { name: 'Loss of Pay', code: 'LOP', description: 'Unpaid leave beyond allocated quotas', annualQuota: 0, isPaid: false }
    ]);

    const currentYear = new Date().getUTCFullYear();

    console.log('[Seed] 4. Seeding Holidays for ' + currentYear + '...');
    await Holiday.create([
      { name: 'New Year Day', date: new Date(Date.UTC(currentYear, 0, 1)), year: currentYear, type: 'NATIONAL' },
      { name: 'Republic Day', date: new Date(Date.UTC(currentYear, 0, 26)), year: currentYear, type: 'NATIONAL' },
      { name: 'Labor Day', date: new Date(Date.UTC(currentYear, 4, 1)), year: currentYear, type: 'COMPANY' },
      { name: 'Independence Day', date: new Date(Date.UTC(currentYear, 7, 15)), year: currentYear, type: 'NATIONAL' },
      { name: 'Gandhi Jayanti', date: new Date(Date.UTC(currentYear, 9, 2)), year: currentYear, type: 'NATIONAL' },
      { name: 'Christmas Day', date: new Date(Date.UTC(currentYear, 11, 25)), year: currentYear, type: 'FESTIVAL' }
    ]);

    console.log('[Seed] 5. Seeding Employees (HR Admin, Managers, Staff)...');
    // HR Admin
    const adminUser = await User.create({
      employeeId: 'EMP-0001',
      firstName: 'Sarah',
      lastName: 'Jenkins',
      email: 'admin@apexcorp.com',
      password: 'Admin@123456',
      role: 'hr_admin',
      department: deptHR._id,
      designation: desigHRAdmin._id,
      baseSalary: 120000,
      phone: '+1 555-0101',
      status: 'active'
    });

    // Tech Manager
    const techManager = await User.create({
      employeeId: 'EMP-0002',
      firstName: 'David',
      lastName: 'Chen',
      email: 'manager.tech@apexcorp.com',
      password: 'Manager@123456',
      role: 'manager',
      department: deptEng._id,
      designation: desigTechLead._id,
      reportsTo: adminUser._id,
      baseSalary: 135000,
      phone: '+1 555-0102',
      status: 'active'
    });

    // Sales Manager
    const salesManager = await User.create({
      employeeId: 'EMP-0003',
      firstName: 'Marcus',
      lastName: 'Vance',
      email: 'manager.sales@apexcorp.com',
      password: 'Manager@123456',
      role: 'manager',
      department: deptSales._id,
      designation: desigSalesLead._id,
      reportsTo: adminUser._id,
      baseSalary: 125000,
      phone: '+1 555-0103',
      status: 'active'
    });

    // Set HODs for departments
    deptHR.headOfDepartment = adminUser._id;
    deptEng.headOfDepartment = techManager._id;
    deptSales.headOfDepartment = salesManager._id;
    await Promise.all([deptHR.save(), deptEng.save(), deptSales.save()]);

    // Employees
    const empAlex = await User.create({
      employeeId: 'EMP-1001',
      firstName: 'Alex',
      lastName: 'Morgan',
      email: 'alex.morgan@apexcorp.com',
      password: 'Emp@123456',
      role: 'employee',
      department: deptEng._id,
      designation: desigSrDev._id,
      reportsTo: techManager._id,
      baseSalary: 85000,
      phone: '+1 555-0104',
      status: 'active'
    });

    const empEmma = await User.create({
      employeeId: 'EMP-1002',
      firstName: 'Emma',
      lastName: 'Watson',
      email: 'emma.watson@apexcorp.com',
      password: 'Emp@123456',
      role: 'employee',
      department: deptEng._id,
      designation: desigJrDev._id,
      reportsTo: techManager._id,
      baseSalary: 62000,
      phone: '+1 555-0105',
      status: 'active'
    });

    const empLiam = await User.create({
      employeeId: 'EMP-1003',
      firstName: 'Liam',
      lastName: 'Neeson',
      email: 'liam.neeson@apexcorp.com',
      password: 'Emp@123456',
      role: 'employee',
      department: deptFin._id,
      designation: desigFinAnalyst._id,
      reportsTo: adminUser._id,
      baseSalary: 72000,
      phone: '+1 555-0106',
      status: 'active'
    });

    const allUsers = [adminUser, techManager, salesManager, empAlex, empEmma, empLiam];

    console.log('[Seed] 6. Seeding Leave Balances...');
    for (const u of allUsers) {
      for (const lt of [ltCL, ltSL, ltEL, ltLOP]) {
        await LeaveBalance.create({
          employee: u._id,
          leaveType: lt._id,
          year: currentYear,
          allocatedDays: lt.annualQuota,
          usedDays: lt.code === 'CL' ? 2 : 0,
          pendingDays: 0,
          remainingDays: lt.code === 'CL' ? lt.annualQuota - 2 : lt.annualQuota
        });
      }
    }

    console.log('[Seed] 7. Seeding Attendance Records...');
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setUTCDate(today.getUTCDate() - i);
      const dayOfWeek = d.getUTCDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends

      for (const u of [empAlex, empEmma, techManager]) {
        const clockInTime = new Date(d);
        clockInTime.setUTCHours(3, 45, 0, 0); // 09:15 AM local

        const clockOutTime = new Date(d);
        clockOutTime.setUTCHours(12, 15, 0, 0); // 05:45 PM local

        await Attendance.create({
          employee: u._id,
          date: d,
          clockIn: clockInTime,
          clockOut: i === 0 ? null : clockOutTime, // Today still active
          totalHours: i === 0 ? 0 : 8.5,
          status: 'PRESENT',
          notes: 'Standard work day'
        });
      }
    }

    console.log('[Seed] 8. Seeding Sample Leave Requests...');
    const leaveStart = new Date(today);
    leaveStart.setUTCDate(today.getUTCDate() + 5);
    const leaveEnd = new Date(today);
    leaveEnd.setUTCDate(today.getUTCDate() + 6);

    await LeaveRequest.create([
      {
        employee: empAlex._id,
        leaveType: ltCL._id,
        startDate: leaveStart,
        endDate: leaveEnd,
        totalDays: 2,
        reason: 'Family event and personal commitment',
        status: 'PENDING'
      },
      {
        employee: empEmma._id,
        leaveType: ltSL._id,
        startDate: new Date(Date.UTC(currentYear, 1, 10)),
        endDate: new Date(Date.UTC(currentYear, 1, 11)),
        totalDays: 2,
        reason: 'Viral fever and physician appointment',
        status: 'APPROVED',
        reviewedBy: techManager._id,
        reviewedAt: new Date(),
        reviewRemarks: 'Approved. Take care.'
      }
    ]);

    console.log('[Seed] 9. Seeding Sample Payslips...');
    await Payslip.create([
      {
        employee: empAlex._id,
        payPeriodMonth: 1,
        payPeriodYear: currentYear,
        baseSalarySnapshot: empAlex.baseSalary,
        allowances: { hra: 34000, da: 8500, special: 8500, medical: 1250 },
        grossEarnings: 137250,
        deductions: { pf: 10200, professionalTax: 200, tds: 6862, lopDeduction: 0 },
        totalDeductions: 17262,
        netSalary: 119988,
        totalWorkingDays: 22,
        daysPresent: 22,
        lopDays: 0,
        paymentStatus: 'PAID',
        paymentDate: new Date(Date.UTC(currentYear, 1, 1)),
        transactionReference: 'TXN-202601-998811'
      }
    ]);

    console.log('[Seed] 10. Seeding Performance Notes...');
    await PerformanceNote.create([
      {
        employee: empAlex._id,
        author: techManager._id,
        category: 'Quarterly Review',
        rating: 5,
        title: 'Outstanding Delivery on Backend Services',
        comments: 'Alex demonstrated deep architectural ownership, implementing modular services with zero regression.',
        isSharedWithEmployee: true
      },
      {
        employee: empEmma._id,
        author: techManager._id,
        category: '1-on-1',
        rating: 4,
        title: 'Solid Progress on API Integrations',
        comments: 'Good understanding of Mongoose relationship modeling. Continuing to improve test coverage.',
        isSharedWithEmployee: true
      }
    ]);

    console.log('\n======================================================');
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('======================================================');
    console.log('Test Credentials:');
    console.log('  1. HR Admin: admin@apexcorp.com        | Admin@123456');
    console.log('  2. Manager:  manager.tech@apexcorp.com  | Manager@123456');
    console.log('  3. Employee: alex.morgan@apexcorp.com   | Emp@123456');
    console.log('======================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('[Seed Error] Seeding failed:', err);
    process.exit(1);
  }
};

seedData();
