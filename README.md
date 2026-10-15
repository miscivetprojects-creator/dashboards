# CIVET DASHBOARDS — ENTERPRISE MANAGEMENT MIS
**CIVET PROJECTS PRIVATE LIMITED**

Complete, production-grade Web and Windows Desktop application built strictly according to the **34-page Management MIS Developer Handoff specification** (`CIVET_Management_MIS_Developer_Handoff.pdf`).

---

## 1. System Architecture

- **Frontend:** React 19 with Vite, Lucide icons, Recharts, and custom enterprise CSS conforming to the PDF design tokens.
- **Backend:** Node.js Express REST API server with session authentication, role-based authorization, and schema validation.
- **Database Engine:** Dual-mode MongoDB driver with transparent embedded durable engine (`data/civet_db_data.json`) providing zero-downtime persistence on Windows desktop or offline environments, with automatic external MongoDB server auto-detection.
- **Desktop Application:** Electron with sandbox isolation (`contextIsolation: true`, `nodeIntegration: false`), native window frames, and auto-spawning backend server process.
- **Excel Engine:** ExcelJS for branded template generation, workbook parsing, schema verification, and error report generation.
- **PDF Engine:** PDFKit for executive dashboard exports and register summaries.

---

## 2. Design System Tokens (Exact PDF Reproduction)

- **Sidebar Navy:** `#0F2A4A`
- **Primary Blue:** `#1F6FEB`
- **Page Background:** `#F4F6F9`
- **Success Green:** `#2E9E6B`
- **Warning Amber:** `#D99A1E`
- **Error Red:** `#C8423A`
- **Subtle Borders:** `#D9DEE5`
- **Card Surfaces:** `#FFFFFF`
- **Typography:** Calibri / Segoe UI sans-serif
- **Grid & Compact Rows:** 8px grid, ~32px compact table row height

---

## 3. Strict Business Safeguards & Zero-Dummy-Data Policy

- **No Dummy / Mock Data:** When no transactions exist, dashboards honestly report `₹0`, `0`, or `Not available` with explanatory empty states.
- **No Outstanding Balances:** Never displays vendor balances, overdue, or payable amounts anywhere. Only actual payments made are aggregated.
- **Missing Data Distinction:** Missing operational submissions are distinguished from zero values (marked as `Missing` in the Coverage Matrix).
- **Weighted Equipment Utilisation:** Calculated strictly as `(Σ Working Hours / Σ Available Hours) × 100` only on rows where available hours exist.

---

## 4. Default Credentials

- **Email:** `admin@civetprojects.com`
- **Password:** `Admin@123`
- **Role:** `Admin` (Director level full system privileges)

---

## 5. How to Run

### Quick Launch (Windows)
- Double-click `start_civet_web.bat` to run the Web Server at `http://localhost:5000`.
- Double-click `start_civet_desktop.bat` to launch the Desktop Electron application.

### From Command Line
```bash
# Start backend server (serves both API & Frontend bundle)
cd backend
node server.js

# Launch Electron desktop application
cd desktop
npm start

# Build Frontend (if modified)
cd frontend
npm run build
```

---

## 6. Functional Capabilities

1. **Single Login:** Secure login leading directly to executive dashboards.
2. **Permanent Left Sidebar:** Navigates across Main Executive Dashboard, 6 Project Locations, 5 Core Departments (+ dynamic depts), Data Workspace, Data Register, and Master Data.
3. **Main Dashboard:** 6 KPI cards, 4 analytical charts (Monthly Spending, Dept Share, Location Comparison, Service Breakdown), Department Overview table, and Locations × Departments Submission Coverage Matrix.
4. **Department Dashboards:** Specialized views for P&M, Stores, Accounts, Admin, and Planning.
5. **Location Dashboards:** Cross-department operational summaries for specific project sites.
6. **Data Workspace:**
   - Dynamic manual form entry.
   - 6-step Excel Bulk Upload Wizard with template download, schema validation, and error report export.
7. **Data Register:**
   - Multi-column filtered search.
   - Detail view with full version audit trail.
   - Audited revision workflow requiring mandatory justification and version incrementation.
8. **Master Data:** Configuration panel for Departments, Locations, Equipment Types, Assets, Materials, Vendors, Service Types, and User Accounts.
