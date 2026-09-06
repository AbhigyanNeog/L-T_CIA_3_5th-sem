# P04 — Corporate HR & Payroll Management System

**Course / Assessment:** L&T EduTech CIA-3 (*Advanced JavaScript Backend Frameworks*)  
**Domain:** Human Resources Information Systems (HRIS) & Enterprise Payroll Engineering  
**Architecture:** Layered MVC / RESTful Micro-Architecture with Role-Based Access Control (RBAC)  
**Implementation Technology:** Node.js, Express.js, MongoDB, Mongoose ODM, JWT, bcryptjs, Helmet  
**UI/UX Design Reference:** Google Stitch MCP — `ApexCorp Executive` (`projects/6116077650169810294`)  
**API Test Suite:** Postman Collection v2.1 ([postman_collection.json](./postman_collection.json))

---

## 1. Project Title
**ApexCorp HR & Payroll Management Platform (P04)**  
*An enterprise-grade, auditable, and automated SaaS solution for corporate workforce governance, daily attendance telemetry, multi-tiered leave lifecycle workflows, and deterministic payroll computation.*

---

## 2. Team Details
* **Academic Institution:** L&T EduTech Partner Institution
* **Program:** B.Tech Computer Science & Engineering (5th Semester)
* **Course:** Advanced JavaScript Backend Frameworks (CIA-3 Practical Assessment)
* **Student Name / Candidate:** Abhigyan Neog
* **Assessment Scope:** Complete Backend Service Architecture (Modules 1–13), Database Engineering, Server-Side Validation, Centralized Error Handling, Postman Automated Test Suite, and Google Stitch-aligned Single Page Application (SPA).

---

## 3. Problem Statement
Growing mid-size enterprises and corporate organizations face severe operational hurdles when managing workforce data across disconnected spreadsheets, paper leave slips, and ad-hoc communication channels:
1. **Attendance Discrepancies:** Inaccurate record-keeping, clock-in duplication, lack of shift duration calculation, and absence of standardized grace period enforcement.
2. **Leave Leakage:** Uncontrolled leave consumption without real-time balance tracking, lack of manager visibility into direct reports' coverage, and retroactive modifications.
3. **Payroll Errors:** High error rates and labor-intensive manual calculations for Loss of Pay (LOP), statutory provident fund (PF), professional taxes (PT), and tax deductions at source (TDS).
4. **Security & Compliance Vulnerabilities:** Absence of strict Role-Based Access Control (RBAC), unencrypted personal data, privilege escalation, and lack of auditable payslip snapshots.

---

## 4. Business Overview
The **ApexCorp Corporate HR & Payroll Management System** provides a unified multi-tenant architecture designed to digitize the complete employee lifecycle from recruitment onboarding to monthly financial remuneration:
* **Centralized Master Records:** Secure storage of employee personal data, job designations, salary bands, and organizational hierarchy.
* **Autonomous Attendance Telemetry:** Timestamp-verified daily clock-in/out engine evaluating punctuality against strict corporate grace thresholds.
* **Deterministic Financial Pipeline:** Automated payroll engine that aggregates attendance records, approved paid leave allowances, company holidays, and statutory deductions to compute take-home pay with zero human intervention.
* **Executive Decision Intelligence:** Native aggregation pipelines delivering instantaneous headcount metrics, salary distributions, multi-month payroll expenditure trends, and workforce attendance rates.

---

## 5. Objectives
1. **End-to-End Automation:** Automate attendance tracking, leave lifecycle state transitions, and payroll deduction math.
2. **Zero-Trust Security & RBAC:** Enforce strict role-based barriers where employees inspect only their personal data, managers review direct reports, and HR Admins maintain organizational oversight.
3. **Referential & Financial Integrity:** Guarantee immutable payroll snapshots, prevent duplicate disbursements, and enforce strict database unique compound constraints.
4. **Resilient Error Management:** Deliver centralized, uniform JSON error contracts across all endpoints with zero unhandled promise rejections.
5. **Production-Grade Developer Experience:** Supply comprehensive Postman collections, database seed scripts, and clean environment variable isolation.

---

## 6. User Roles & Permission Matrix

The application strictly implements three distinct enterprise roles:

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                   ROLE PERMISSION MATRIX                                 │
├──────────────────────────┬──────────────────┬──────────────────┬─────────────────────────┤
│ Functional Capability    │ Employee         │ Manager          │ HR Admin                │
├──────────────────────────┼──────────────────┼──────────────────┼─────────────────────────┤
│ Authenticate & Self View │ Yes (Own data)   │ Yes (Own data)   │ Yes (All records)       │
│ Clock-In & Clock-Out     │ Yes (Self)       │ Yes (Self)       │ Yes (Self)              │
│ View Attendance Logs     │ Yes (Personal)   │ Yes (Direct Team)│ Yes (Company-wide)      │
│ Regularize Attendance    │ No               │ No               │ Yes (Full authority)    │
│ Submit Leave Request     │ Yes (Personal)   │ Yes (Personal)   │ Yes (Personal)          │
│ Approve/Reject Leaves    │ No               │ Yes (Direct Team)│ Yes (Override/All)      │
│ Adjust Leave Balances    │ No               │ No               │ Yes (Full ledger audit) │
│ Manage Departments       │ No (Read-only)   │ No (Read-only)   │ Yes (CRUD)              │
│ Manage Designations      │ No (Read-only)   │ No (Read-only)   │ Yes (CRUD)              │
│ Execute Monthly Payroll  │ No               │ No               │ Yes (Deterministic run) │
│ View Payslips            │ Yes (Own slips)  │ Yes (Own slips)  │ Yes (Company-wide)      │
│ Update Payment Status    │ No               │ No               │ Yes (Disbursement lock) │
│ Manager Team Dashboard   │ No               │ Yes (Direct Team)│ Yes (All departments)   │
│ Performance Note Logging │ No (View shared) │ Yes (Direct Team)│ Yes (All employees)     │
│ Executive HR Analytics   │ No               │ No               │ Yes (Aggregations)      │
└──────────────────────────┴──────────────────┴──────────────────┴─────────────────────────┘
```

---

## 7. Technology Stack
* **Runtime:** Node.js (v18+ LTS)
* **Backend Framework:** Express.js (v4.x)
* **Database & ODM:** MongoDB Community / Atlas with Mongoose (v8.x)
* **Authentication:** JSON Web Tokens (`jsonwebtoken` v9.x) using HMAC SHA-256
* **Password Hashing:** `bcryptjs` (Salt factor: 12 rounds)
* **HTTP Security:** `helmet` (Strict transport security, XSS filters, CSP configuration)
* **Traffic Control:** `express-rate-limit` (DDoS & brute force mitigation)
* **Telemetry & Logging:** `morgan` (HTTP request profiler)
* **Frontend:** Vanilla ES6+ JavaScript, Responsive CSS3 Grid/Flexbox design tokens based on Google Stitch MCP

---

## 8. Project Architecture

The backend follows an MVC/Layered Service pattern:

```
                      ┌────────────────────────────────────────────────────────┐
                      │              CLIENT APP / POSTMAN SUITE                │
                      └───────────────────────────┬────────────────────────────┘
                                                  │ HTTP JSON (Bearer Token)
                                                  ▼
                      ┌────────────────────────────────────────────────────────┐
                      │                 APPLICATION GATEWAY                    │
                      │  • Helmet Security Headers                             │
                      │  • Express Rate Limiting                               │
                      │  • JSON Body Parser (Syntax Guard)                     │
                      │  • Morgan Request Logging                              │
                      └───────────────────────────┬────────────────────────────┘
                                                  │
                                                  ▼
                      ┌────────────────────────────────────────────────────────┐
                      │                 MASTER ROUTE DISPATCHER                │
                      │                       (/api/v1)                        │
                      └───────────────────────────┬────────────────────────────┘
                                                  │
                                                  ▼
                      ┌────────────────────────────────────────────────────────┐
                      │              CROSS-CUTTING MIDDLEWARES                 │
                      │  • authMiddleware (JWT Validation & Context Injection) │
                      │  • rbacMiddleware (Role Gates & Ownership Guards)      │
                      │  • validateMiddleware (Payload, Dates, ObjectIds)      │
                      └───────────────────────────┬────────────────────────────┘
                                                  │
                                                  ▼
                      ┌────────────────────────────────────────────────────────┐
                      │                  CONTROLLER LAYER                      │
                      │  (13 Dedicated Modules wrapped in asyncHandler)        │
                      └───────────────────────────┬────────────────────────────┘
                                                  │
                                                  ▼
                      ┌────────────────────────────────────────────────────────┐
                      │           DOMAIN UTILITIES & ENGINES                   │
                      │  • payrollEngine.js (LOP, Allowances, PF, TDS)         │
                      │  • leaveCalculator.js (Working Days excluding holidays)│
                      └───────────────────────────┬────────────────────────────┘
                                                  │
                                                  ▼
                      ┌────────────────────────────────────────────────────────┐
                      │                  MONGOOSE ODM LAYER                    │
                      │  (10 Schemas, Compound Indexes, Foreign Key Refs)      │
                      └───────────────────────────┬────────────────────────────┘
                                                  │ Mongoose Queries & Aggregations
                                                  ▼
                      ┌────────────────────────────────────────────────────────┐
                      │                  MONGODB DATABASE                      │
                      └────────────────────────────────────────────────────────┘
```

---

## 9. Folder Structure

```
d:/5th_Sem/L&T/CIA 3/
├── config/
│   └── db.js                       # Database connection manager with lifecycle events
├── controllers/                    # 13 Dedicated HTTP Orchestrator Controllers
│   ├── analyticsController.js      # Executive KPIs and aggregation pipelines
│   ├── attendanceController.js     # Clock-in/out telemetry & regularization
│   ├── authController.js           # Credentials, JWT issue, password updates
│   ├── departmentController.js     # Department CRUD & active staff deletion guards
│   ├── designationController.js    # Job title CRUD & salary band constraints
│   ├── employeeController.js       # Administrative onboarding & profile updates
│   ├── holidayController.js        # Corporate holiday schedule management
│   ├── leaveBalanceController.js   # Quota ledger queries and administrative adjustments
│   ├── leaveController.js          # Leave application, collision guard, approvals
│   ├── managerController.js        # Manager direct reports dashboard & matrix
│   ├── payrollController.js        # Deterministic payroll computation engine
│   ├── payslipController.js        # Immutable financial snapshots & payments
│   └── performanceNoteController.js# Manager direct-report review logging
├── middleware/                     # Cross-Cutting Interceptors
│   ├── authMiddleware.js           # JWT Bearer token authentication
│   ├── errorMiddleware.js          # Centralized error handler (CastError, 11000, etc.)
│   ├── rbacMiddleware.js           # Reusable role guards & resource ownership checks
│   └── validateMiddleware.js       # Payload, ObjectId, Date range & Enum validators
├── models/                         # 10 Mongoose Schemas & Model Definitions
│   ├── Attendance.js               # Daily clock punches & durations
│   ├── Department.js               # Organizational units & departmental heads
│   ├── Designation.js              # Corporate titles & salary bands
│   ├── Holiday.js                  # Annual scheduled company holidays
│   ├── LeaveBalance.js             # Annual employee quota ledger (CL, SL, EL)
│   ├── LeaveRequest.js             # Leave workflow requests & statuses
│   ├── LeaveType.js                # System leave classification definitions
│   ├── Payslip.js                  # Immutable monthly financial payslip records
│   ├── PerformanceNote.js          # Manager reviews & rating records
│   └── User.js                     # Unified user entity (Employee, Manager, Admin)
├── public/                         # Production Single Page Application (Google Stitch)
│   ├── css/
│   │   └── styles.css              # Stitch Executive design tokens & responsive styles
│   ├── js/
│   │   ├── api.js                  # Complete client-side REST SDK for all 13 modules
│   │   └── app.js                  # UI Controller, Live Stopwatch, Modals, State
│   └── index.html                  # HTML5 Shell with Google Fonts & Dialog Roots
├── routes/                         # REST Route Definitions
│   ├── analyticsRoutes.js
│   ├── attendanceRoutes.js
│   ├── authRoutes.js
│   ├── departmentRoutes.js
│   ├── designationRoutes.js
│   ├── employeeRoutes.js
│   ├── holidayRoutes.js
│   ├── index.js                    # Centralized API Gateway router (/api/v1)
│   ├── leaveRoutes.js
│   ├── managerRoutes.js
│   ├── payrollRoutes.js
│   ├── payslipRoutes.js
│   └── performanceRoutes.js
├── utils/                          # Reusable Helpers & Computational Engines
│   ├── apiResponse.js              # Standardized JSON response envelope
│   ├── appError.js                 # Custom operational error abstraction
│   ├── asyncHandler.js             # Async wrapper eliminating unhandled rejections
│   ├── leaveCalculator.js          # Working day calculation excluding holidays/weekends
│   └── payrollEngine.js            # Monthly payroll math & statutory deduction rules
├── .env.example                    # Production environment configuration template
├── .gitignore                      # Git exclusion rules (Secrets, node_modules)
├── package.json                    # Dependencies and runtime npm scripts
├── postman_collection.json         # Automated Postman Collection v2.1 Test Suite
├── README.md                       # Comprehensive Technical Documentation
├── seed.js                         # Database seeder with realistic test datasets
└── server.js                       # Express bootstrap, security layers, and SPA serving
```

---

## 10. Implemented Modules Detailed

### Module 1: Employee Onboarding & Authentication
* **Security:** Passwords encrypted using `bcrypt` (12 rounds). Zero plain-text credentials stored.
* **Token Issuance:** Signs secure JSON Web Tokens containing user ID, email, and role.
* **Automated Provisioning:** Onboarding an employee automatically triggers initialization of an active `LeaveBalance` ledger for the current calendar year.

### Module 2: Department & Designation Management
* Full CRUD endpoints with unique code and name enforcement.
* **Referential Integrity Guards:** Attempting to delete a department with active assigned employees or a designation linked to active staff returns `409 Conflict`.

### Module 3: Daily Attendance Tracking
* **Clock-In / Clock-Out:** Automatically tracks shift timestamps and computes total active hours.
* **Punctuality Evaluation:** Clocking in after 09:30 AM automatically categorizes status as `LATE`.
* **Idempotency Safeguards:** Enforces single clock-in per day via compound unique index `{ employeeId: 1, date: 1 }`. Duplicate clock-ins return `400 Bad Request`.

### Module 4: Leave Request & Approval Workflow
* **Working Day Calculation:** Automatically discounts Saturdays, Sundays, and official company holidays from requested duration.
* **Collision Prevention:** Verifies that new applications do not overlap with existing `APPROVED` or `PENDING` leaves for the same employee (`409 Conflict`).
* **Approval Gates:** Employees cannot approve their own leaves (`403 Forbidden`). Managers can only review direct team members.

### Module 5: Leave Balance Management
* Tracks three standard corporate quotas: **Casual Leave (12 days)**, **Sick Leave (10 days)**, and **Earned Leave (15 days)**.
* Deducts quota strictly upon manager or HR Admin `APPROVED` status. Cancelling an approved leave automatically restores deducted balance.

### Module 6: Payroll Computation Engine
* Deterministic formula calculating working days, credited work days, and Loss of Pay (LOP) days:
  $$\text{Working Days} = \text{Calendar Days} - (\text{Weekends} + \text{Company Holidays})$$
  $$\text{Work Credit} = \text{Days Present} + (0.5 \times \text{Half Days}) + \text{Paid Approved Leaves}$$
  $$\text{LOP Days} = \max(0, \text{Working Days} - \text{Work Credit})$$
* Automated statutory deductions: Provident Fund (12% of Base), Professional Tax ($200), Tax Deducted at Source (5% of Gross).
* Duplicate run guard returns `409 Conflict` unless explicit `"rerun": true` is provided.

### Module 7: Payslip Generation Records
* Generates immutable financial snapshots for every employee upon payroll completion.
* Self-service access with ownership verification (`403 Forbidden` if attempting to view another's payslip). HR Admin can mark disbursement status from `DRAFT` $\rightarrow$ `PROCESSED` $\rightarrow$ `PAID`.

### Module 8: Employee Self-Service (ESS) Profile
* Employees can update personal contact information (`phone`, `address`, `emergencyContact`).
* System explicitly blocks modification of corporate fields (`role`, `salary`, `baseSalary`, `department`, `manager`, `passwordHash`, `employeeId`) with a `403 Forbidden` error.

### Module 9: Manager Team Dashboard
* Scoped strictly to direct reports (`reportsTo === req.user._id` or `managerId === req.user._id`).
* Provides real-time team attendance matrix for today and a 30-day team leave coverage calendar.

### Module 10: Holiday Calendar Management
* HR Admin management of annual corporate holidays.
* Holiday dates are directly integrated into the working-day calculation engines in both leave requests and payroll Loss of Pay calculations.

### Module 11: Performance Note Logging
* Managers log structured periodic reviews (1 to 5 star rating, category, title, feedback).
* Enforces direct reporting line authority. Visibility toggle (`isSharedWithEmployee`) controls whether the review appears in the employee's personal portal.

### Module 12: HR Reports & Analytics
Native MongoDB Aggregation Pipelines powering real-time enterprise dashboards:
1. Executive KPIs (active headcount, daily attendance %, monthly payroll total)
2. Department headcount and min/avg/max salary distribution
3. Multi-month payroll expenditure and LOP totals
4. 30-day company attendance trends
5. Leave utilization breakdown by category and status

### Module 13: Role-Based Access Control (RBAC)
Integrated across every single route via `authMiddleware.js` and `rbacMiddleware.js`.

---

## 11. API Endpoint Reference

| Method | Endpoint | Access Control | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Public | Authenticate user & receive JWT token |
| `GET` | `/api/v1/auth/me` | Authenticated | Get current authenticated user profile |
| `POST` | `/api/v1/auth/change-password` | Authenticated | Update user password |
| `GET` | `/api/v1/employees` | `manager`, `hr_admin` | List employees with pagination & search |
| `POST` | `/api/v1/employees/onboard` | `hr_admin` | Onboard new employee & initialize leave balance |
| `GET` | `/api/v1/employees/:id` | Ownership / HR | Get individual profile |
| `PUT` | `/api/v1/employees/:id` | `hr_admin` | Update employee corporate record |
| `PATCH`| `/api/v1/employees/me` | Authenticated | Self-service personal profile update |
| `GET` | `/api/v1/departments` | Authenticated | List all active departments |
| `POST` | `/api/v1/departments` | `hr_admin` | Create new department |
| `GET` | `/api/v1/departments/:id` | Authenticated | Get department details |
| `PUT` | `/api/v1/departments/:id` | `hr_admin` | Update department details |
| `DELETE`| `/api/v1/departments/:id` | `hr_admin` | Delete department (guarded against active staff) |
| `GET` | `/api/v1/designations` | Authenticated | List all designations |
| `POST` | `/api/v1/designations` | `hr_admin` | Create new designation with salary band |
| `DELETE`| `/api/v1/designations/:id` | `hr_admin` | Delete designation (guarded against active staff) |
| `POST` | `/api/v1/attendance/clock-in` | `employee` | Record daily clock-in timestamp |
| `POST` | `/api/v1/attendance/clock-out` | `employee` | Record daily clock-out & calculate hours |
| `GET` | `/api/v1/attendance/today` | Authenticated | Get today's attendance status |
| `GET` | `/api/v1/attendance/me` | Authenticated | Get personal attendance logs |
| `GET` | `/api/v1/attendance` | `manager`, `hr_admin` | Company-wide attendance logs |
| `POST` | `/api/v1/attendance/regularize`| `hr_admin` | Manually regularize attendance record |
| `GET` | `/api/v1/leaves/balances/me` | Authenticated | Get personal leave balance quotas |
| `POST` | `/api/v1/leaves/apply` | `employee` | Submit leave application |
| `GET` | `/api/v1/leaves/me` | Authenticated | Get personal leave application history |
| `PATCH`| `/api/v1/leaves/:id/cancel` | Authenticated | Cancel leave application & restore quota |
| `GET` | `/api/v1/leaves/pending` | `manager`, `hr_admin` | Get pending leave approval queue |
| `PATCH`| `/api/v1/leaves/:id/status` | `manager`, `hr_admin` | Approve or reject leave request |
| `GET` | `/api/v1/leaves` | `hr_admin` | Company-wide leave history |
| `POST` | `/api/v1/payroll/run` | `hr_admin` | Run monthly deterministic payroll engine |
| `GET` | `/api/v1/payroll/summary` | `hr_admin` | Get monthly payroll disbursement summary |
| `GET` | `/api/v1/payslips/me` | Authenticated | Get personal payslip history |
| `GET` | `/api/v1/payslips/:id` | Ownership / HR | Get itemized payslip breakdown |
| `GET` | `/api/v1/payslips` | `hr_admin` | Company-wide payslip records |
| `PATCH`| `/api/v1/payslips/:id/status` | `hr_admin` | Update payslip payment status (`PAID`) |
| `GET` | `/api/v1/manager/team` | `manager`, `hr_admin` | Get direct reports roster |
| `GET` | `/api/v1/manager/attendance/today` | `manager`, `hr_admin` | Get team attendance status today |
| `GET` | `/api/v1/manager/leaves/upcoming` | `manager`, `hr_admin` | 30-day team leave calendar |
| `GET` | `/api/v1/holidays` | Authenticated | List annual corporate holidays |
| `POST` | `/api/v1/holidays` | `hr_admin` | Create company holiday |
| `DELETE`| `/api/v1/holidays/:id` | `hr_admin` | Delete company holiday |
| `POST` | `/api/v1/performance` | `manager`, `hr_admin` | Log performance note for direct report |
| `GET` | `/api/v1/performance/me` | Authenticated | View shared performance notes |
| `GET` | `/api/v1/analytics/executive` | `hr_admin` | Executive KPI overview |
| `GET` | `/api/v1/analytics/headcount` | `hr_admin` | Department headcount & salary bands |
| `GET` | `/api/v1/analytics/payroll` | `hr_admin` | Multi-month payroll expenditure trends |
| `GET` | `/api/v1/analytics/leaves` | `hr_admin` | Leave utilization metrics |
| `GET` | `/api/v1/analytics/attendance`| `hr_admin` | 30-day company attendance trends |

---

## 12. Database Schema Summary

| Model | Collection | Primary Fields | Key Validations |
|---|---|---|---|
| **User** | `users` | `name`, `email`, `passwordHash`, `role`, `departmentId`, `designationId`, `managerId`, `baseSalary` | `email` unique lowercase; `role` enum (`employee`, `manager`, `hr_admin`); `baseSalary` $\ge 0$ |
| **Department** | `departments` | `name`, `code`, `description`, `headId`, `isActive` | `name` & `code` unique; `headId` references `User` |
| **Designation** | `designations` | `title`, `departmentId`, `level`, `minSalary`, `maxSalary` | `minSalary` $\le$ `maxSalary`; `departmentId` references `Department` |
| **Attendance** | `attendances` | `employeeId`, `date`, `clockIn`, `clockOut`, `duration`, `status` | Compound unique index `{ employeeId, date }`; status enum (`PRESENT`, `LATE`, `HALF_DAY`, `ABSENT`, `ON_LEAVE`) |
| **LeaveRequest**| `leaverequests`| `employeeId`, `type`, `fromDate`, `toDate`, `daysCount`, `status`, `approverId`, `remarks` | Date chronological check (`fromDate` $\le$ `toDate`); status enum (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`) |
| **LeaveBalance**| `leavebalances`| `employeeId`, `year`, `casual`, `sick`, `earned` | Compound unique index `{ employeeId, year }`; quotas non-negative |
| **Payslip** | `payslips` | `employeeId`, `month`, `year`, `baseSalary`, `earnings`, `deductions`, `netPay`, `paymentStatus` | Compound unique index `{ employeeId, month, year }`; paymentStatus enum (`DRAFT`, `PROCESSED`, `PAID`) |
| **Holiday** | `holidays` | `name`, `date`, `type`, `description` | Compound unique index `{ date, name }`; type enum (`PUBLIC`, `COMPANY`, `REGIONAL`) |
| **Performance**| `performancenotes`| `employeeId`, `managerId`, `rating`, `category`, `title`, `comments`, `isSharedWithEmployee` | `rating` integer between 1 and 5; `managerId` references `User` |
| **LeaveType** | `leavetypes` | `name`, `code`, `daysAllowed`, `isPaid` | `code` unique uppercase; `daysAllowed` $\ge 0$ |

---

## 13. Entity Relationships & Foreign Keys

```
                           ┌───────────────────────────┐
                           │        Department         │
                           │  (headId -> User)         │
                           └─────────────┬─────────────┘
                                         │ 1
                                         │
                                         │ *
                           ┌─────────────▼─────────────┐
                           │        Designation        │
                           │  (departmentId)           │
                           └─────────────┬─────────────┘
                                         │ 1
                                         │
                                         │ *
                           ┌─────────────▼─────────────┐
                    ┌─────►│           User            │◄────────────────┐
                    │      │  (reportsTo/managerId)    │                 │
                    │      └──────┬──────┬──────┬──────┘                 │
                    │             │      │      │                        │
         Reports To │             │      │      │                        │
                    │             │      │      │                        │
                    │      ┌──────▼───┐  │  ┌───▼────────┐  ┌───────────▼──┐
                    └──────┤Attendance│  │  │LeaveRequest│  │LeaveBalance  │
                           └──────────┘  │  └────────────┘  └──────────────┘
                                         │
                                   ┌─────┴─────┬────────────────┐
                                   │           │                │
                             ┌─────▼───┐ ┌─────▼───────┐  ┌─────▼──────────┐
                             │ Payslip │ │Performance  │  │ Holiday        │
                             │         │ │Note         │  │ (Company-wide) │
                             └─────────┘ └─────────────┘  └────────────────┘
```

* **Hierarchical Self-Reference:** `User.managerId` (or `User.reportsTo`) points back to `User._id`.
* **Departmental Attachment:** `User.departmentId` $\rightarrow$ `Department._id`, with reciprocal `Department.headId` $\rightarrow$ `User._id`.
* **Designation Attachment:** `User.designationId` $\rightarrow$ `Designation._id`.
* **Transaction Ownership:** `Attendance`, `LeaveRequest`, `LeaveBalance`, `Payslip`, and `PerformanceNote` all reference `User._id` as `employeeId`.

---

## 14. Database Indexes & Justifications

| Collection | Indexed Fields | Type | Engineering Justification |
|---|---|---|---|
| `users` | `{ email: 1 }` | Unique | Enforces single account per email; accelerates authentication lookups |
| `attendances` | `{ employeeId: 1, date: 1 }` | Compound Unique | Prevents duplicate daily clock-ins; optimizes date-range attendance retrieval |
| `leavebalances` | `{ employeeId: 1, year: 1 }` | Compound Unique | Guarantees exactly one quota ledger per employee per calendar year |
| `payslips` | `{ employeeId: 1, payPeriodMonth: 1, payPeriodYear: 1 }` | Compound Unique | Guarantees financial immutability; blocks duplicate monthly payroll runs |
| `holidays` | `{ date: 1, name: 1 }` | Compound Unique | Prevents duplicate holiday declarations on identical calendar dates |
| `leaverequests`| `{ employeeId: 1, status: 1 }` | Compound | Optimizes leave history queries and pending manager approval views |
| `departments` | `{ code: 1 }`, `{ name: 1 }` | Unique | Ensures institutional department codes (e.g., `ENG`, `HR`) remain unambiguous |

---

## 15. Setup Instructions

### Prerequisites
* **Node.js:** v18.0.0 or later installed (`node -v`)
* **MongoDB:** Community Edition installed locally on port `27017` or a MongoDB Atlas cloud URI
* **Git:** Installed on development workstation

### Installation Steps
```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/corporate-hr-payroll-system.git
cd "corporate-hr-payroll-system"

# 2. Install production and development dependencies
npm install  # (On Windows PowerShell: use npm.cmd install)

# 3. Create .env configuration from template
cp .env.example .env
```

---

## 16. Environment Variables

Configure the newly created `.env` file with environment-specific parameters:

```ini
# Server Execution
PORT=5000
NODE_ENV=development

# Database Connection
MONGO_URI=mongodb://localhost:27017/corporate_hr_db

# Security & JSON Web Tokens
# Replace with a cryptographically secure random string (minimum 32 characters)
JWT_SECRET=replace_with_a_secure_random_secret_at_least_32_characters
JWT_EXPIRES_IN=7d

# API Rate Limiting (express-rate-limit)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=200
```

---

## 17. How to Run Locally

### 1. Seed Database with Realistic Enterprise Data
Populates corporate departments, designations, test users across all three roles, leave quotas, holidays, and past attendance:
```bash
node seed.js  # (or npm run seed)
```

### 2. Start Application in Development Mode
Starts Express REST service with hot-reloading:
```bash
npm run dev
```

### 3. Start Application in Production Mode
```bash
npm start  # (or node server.js)
```

### 4. Access Client Web Application
Open your web browser and navigate to:
```
http://localhost:5000
```
The application serves the Single Page Application directly from `/public`, complete with topbar role simulator chips for 1-click evaluation.

---

## 18. Postman Testing Instructions

The repository includes an automated Postman test collection ([postman_collection.json](./postman_collection.json)):

1. **Import:** Launch Postman $\rightarrow$ Click **Import** $\rightarrow$ Select `postman_collection.json`.
2. **Execute Authentication First:** Run folder `01. Authentication & Role Tokens`. Test scripts will extract and store `adminToken`, `managerToken`, and `employeeToken` into collection variables automatically.
3. **Run Automated Suite:** Use the **Postman Collection Runner** or **Newman CLI** to execute all 13 folders sequentially:
   ```bash
   npx newman run postman_collection.json
   ```

---

## 19. Sample Requests & Responses

### Sample 1: Successful Login (`POST /api/v1/auth/login`)
**Request Body:**
```json
{
  "email": "admin@apexcorp.com",
  "password": "Admin@123456"
}
```
**Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Authentication successful",
  "data": {
    "user": {
      "id": "60c72b2f9b1d8b2badbee001",
      "name": "Sarah Jenkins",
      "email": "admin@apexcorp.com",
      "role": "hr_admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Sample 2: Validation Error (`POST /api/v1/leaves/apply`)
**Request Body (Invalid Inverted Date Range):**
```json
{
  "type": "CASUAL",
  "fromDate": "2026-10-20",
  "toDate": "2026-10-15",
  "reason": "Personal time off"
}
```
**Response (`400 Bad Request`):**
```json
{
  "success": false,
  "message": "Invalid date span: 'fromDate' (2026-10-20) cannot be after 'toDate' (2026-10-15).",
  "errorCode": "INVALID_DATE_RANGE",
  "errors": [
    {
      "field": "fromDate",
      "message": "fromDate must be earlier than or equal to toDate."
    }
  ]
}
```

### Sample 3: Role-Based Access Violation (`POST /api/v1/payroll/run`)
**Request Header:** `Authorization: Bearer <employeeToken>`  
**Response (`403 Forbidden`):**
```json
{
  "success": false,
  "message": "Forbidden: Role 'employee' is not authorized to access this resource.",
  "errorCode": "FORBIDDEN"
}
```

---

## 20. Known Limitations & Scope Boundaries
1. **Statutory Tax Framework:** The payroll deduction engine utilizes standardized statutory rates (PF 12%, PT $200, Flat TDS 5%) rather than complex multi-tiered progressive national tax regimes.
2. **Biometric Integration:** Clock-in and clock-out actions are driven by authenticated HTTP requests rather than physical biometric hardware sensors.
3. **Single Currency:** Remuneration calculations and payroll records are denominated in a single corporate base currency.
4. **Email Dispatch:** Account creation and leave notification events generate auditable database records and UI notifications rather than external SMTP/SES mail transmissions.
