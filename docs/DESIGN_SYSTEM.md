# OmniDesk AI — Enterprise Design System Specification

**Version:** 1.0.1
**Author:** Senior Product Designer & Enterprise Systems Architect
**Architecture:** Pure Vanilla CSS3 Custom Properties & Component Classes

---

## 1. Design Principles

OmniDesk AI adheres to five core design principles tailored for mission-critical enterprise SaaS applications:

1. **Information Density with Breathing Room:** High information density optimized for professional users, structured through disciplined 4px grid spacing and deliberate visual hierarchy.
2. **Deterministic Visual Language:** Uniform geometry, border-radii, and elevation tokens across every module (CRM, Finance, Projects, Tasks, Intelligence, Operations).
3. **Subtle & Purposeful Aesthetics:** Premium dark mode canvas (`#090d16`) with restrained glassmorphism, hairline borders (`rgba(255,255,255,0.08)`), and soft radial glows. Zero cartoonish neon or gaming styling.
4. **Monospace Number Precision:** All financial figures, hashes, timestamps, and entity codes use monospace numerals (`--font-mono`) with tabular alignment.
5. **Accessibility by Default:** High contrast text ratios meeting WCAG 2.1 AA standards, visible focus rings, semantic HTML structure, and universal keyboard shortcuts (`Ctrl+K`).

---

## 2. Design Tokens

Declared in `public/assets/css/variables.css`:

### Color Palette (Dark Theme Default):

| Token | Value | Description |
| :--- | :--- | :--- |
| `--bg-app` | `#090d16` | Deep obsidian application background |
| `--bg-surface` | `#0f172a` | Elevated card & container surface |
| `--bg-surface-subtle` | `#131d35` | Secondary container & table header fill |
| `--border-subtle` | `#1e293b` | Primary hairline boundary border |
| `--border-focus` | `#6366f1` | Active input & keyboard focus ring |
| `--text-main` | `#f8fafc` | Primary high-contrast typography |
| `--text-muted` | `#94a3b8` | Secondary labels & telemetry captions |
| `--brand-primary` | `#4f46e5` | Primary Indigo action brand color |
| `--brand-accent` | `#38bdf8` | Electric Sky secondary accent |
| `--brand-subtle` | `rgba(99, 102, 241, 0.12)` | Tinted brand badge background |

### Status Colors:

| Status | Text Color Token | Background Token |
| :--- | :--- | :--- |
| **Success** | `--status-success` (`#10b981`) | `--status-success-bg` (`rgba(16, 185, 129, 0.12)`) |
| **Warning** | `--status-warning` (`#f59e0b`) | `--status-warning-bg` (`rgba(245, 158, 11, 0.12)`) |
| **Danger** | `--status-danger` (`#ef4444`) | `--status-danger-bg` (`rgba(239, 68, 68, 0.12)`) |
| **Info** | `--status-info` (`#06b6d4`) | `--status-info-bg` (`rgba(6, 182, 212, 0.12)`) |

### Typography Scale:
- `--font-sans`: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- `--font-mono`: `'JetBrains Mono', 'Fira Code', ui-monospace, Menlo, Consolas, monospace`
- `text-2xs` (10px / 0.625rem), `text-xs` (12px / 0.75rem), `text-sm` (14px / 0.875rem), `text-base` (16px / 1rem), `text-lg` (18px / 1.125rem), `text-xl` (20px / 1.25rem), `text-2xl` (24px / 1.5rem), `text-3xl` (30px / 1.875rem).

### Geometry & Elevation Tokens:
- **Radii:** `--radius-sm` (4px), `--radius-md` (8px), `--radius-lg` (12px), `--radius-xl` (16px), `--radius-full` (9999px).
- **Shadows:** `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-glass` (`0 8px 32px 0 rgba(0, 0, 0, 0.37)`).

---

## 3. Core Component Library

Declared in `public/assets/css/components.css`:

### 1. KPI Metric Card (`.kpi-card`)
Displays mission-critical business metrics with contextual trend metadata:
```html
<div class="kpi-card">
    <div class="kpi-header">
        <span class="kpi-label">Gross Invoiced Revenue</span>
        <span class="kpi-icon-pill">💰</span>
    </div>
    <div class="kpi-value font-mono">$114,400.00</div>
    <div class="kpi-footer text-success font-medium">
        <span>+14.2% month-over-month velocity</span>
    </div>
</div>
```

### 2. Glassmorphic Surface Container (`.card`, `.card-glass`)
Base container for forms, list items, and modules:
```html
<div class="card card-glass p-6">
    <div class="card-header border-b pb-3 mb-4 flex items-center justify-between">
        <h2 class="card-title">Section Title</h2>
        <span class="badge badge-brand">Active</span>
    </div>
    <div class="card-body">...</div>
</div>
```

### 3. Data Tables (`.table-container`, `.table`)
Responsive tabular views with sticky headers, striped hover rows, and monospace alignment:
```html
<div class="table-container mb-6">
    <table class="table">
        <thead>
            <tr>
                <th>Entity Code</th>
                <th>Title / Description</th>
                <th>Status</th>
                <th class="text-right">Amount</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="font-mono text-muted text-xs">INV-2026-001</td>
                <td class="font-bold text-main">Apex Dynamics SLA</td>
                <td><span class="badge badge-success">Paid</span></td>
                <td class="text-right font-mono font-bold text-main">$25,000.00</td>
            </tr>
        </tbody>
    </table>
</div>
```

### 4. Status Badges (`.badge-*`)
Pill badges for state classification:
- `.badge-brand` — Primary active items / intelligence agents
- `.badge-success` — Paid invoices, completed tasks, healthy services
- `.badge-warning` — Pending reviews, approaching deadlines, warnings
- `.badge-danger` — Critical risks, overdue invoices, blockers
- `.badge-neutral` — General categories, secondary metadata

### 5. Interactive Buttons (`.btn-*`)
- `.btn-primary` — Solid Indigo call to action
- `.btn-secondary` — Outlined subtle action
- `.btn-success` — Confirmation / Approve / Convert action
- `.btn-danger` — Rejection / Delete action
- `.btn-sm` — High-density toolbars (padding `6px 12px`, font `12px`)

### 6. Forms & Inputs (`.form-input`, `.form-select`, `.form-textarea`)
High-security inputs with dark surface fills, clear placeholder styling, and glowing focus borders:
```html
<div class="form-group mb-4">
    <label class="form-label" for="deal_title">Deal Title *</label>
    <input type="text" id="deal_title" name="title" class="form-input" placeholder="e.g. Enterprise Cloud Renewal" required>
</div>
```

### 7. Search & Modal Drawers (`.search-modal-backdrop`, `.search-modal-card`)
Accessible overlay modals for `Ctrl+K` global search and quick item creation.

---

## 4. Responsive Viewport Strategy

- **Desktop (&ge; 1024px):** Fixed multi-group enterprise sidebar (260px width) with expanded labels and topbar header.
- **Tablet (768px - 1023px):** Compact grid layouts, collapsing 4-column KPI rows into 2x2 grids.
- **Mobile (&le; 767px):** Full-bleed single column cards, horizontal scrolling for Kanban boards and data tables, slide-out drawer sidebar toggled via `.mobile-toggle`.
