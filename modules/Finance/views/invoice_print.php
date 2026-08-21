<?php
/**
 * OmniDesk AI — Executive Printable Invoice Document View
 *
 * Clean HTML/CSS document layout formatted for window.print() or PDF export.
 */

if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$inv   = $invoice ?? [];
$items = $inv['items'] ?? [];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice <?= e($inv['invoice_number'] ?? '') ?> — OmniDesk AI</title>
    <style>
        :root {
            --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            --font-mono: 'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            --color-primary: #4f46e5;
            --color-dark: #0f172a;
            --color-text: #334155;
            --color-muted: #64748b;
            --color-border: #e2e8f0;
            --color-bg-subtle: #f8fafc;
            --color-success: #10b981;
            --color-danger: #ef4444;
        }

        * { box-sizing: border-box; }
        body {
            font-family: var(--font-sans);
            color: var(--color-text);
            background: #f1f5f9;
            padding: 40px 20px;
            margin: 0;
            line-height: 1.5;
            -webkit-font-smoothing: antialiased;
        }

        .invoice-sheet {
            max-width: 850px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid var(--color-border);
            padding: 48px;
            border-radius: 12px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
        }

        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 36px; }
        .header-table td { vertical-align: top; }

        .brand-logo-text {
            font-size: 22px;
            font-weight: 800;
            letter-spacing: -0.03em;
            color: var(--color-dark);
            margin: 0 0 6px 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .brand-logo-text svg {
            width: 28px;
            height: 28px;
        }

        .brand-subtext {
            font-size: 12px;
            color: var(--color-muted);
            line-height: 1.6;
        }

        .inv-headline {
            font-size: 28px;
            font-weight: 800;
            letter-spacing: -0.03em;
            color: var(--color-primary);
            text-align: right;
            margin: 0 0 6px 0;
        }

        .inv-meta-text {
            text-align: right;
            font-size: 13px;
            color: var(--color-muted);
            line-height: 1.6;
        }

        .status-pill {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            background: rgba(79, 70, 229, 0.1);
            color: var(--color-primary);
        }

        .status-pill.paid { background: #dcfce7; color: #166534; }
        .status-pill.sent { background: #e0f2fe; color: #0369a1; }
        .status-pill.overdue { background: #fee2e2; color: #991b1b; }

        .address-box {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            background: var(--color-bg-subtle);
            border: 1px solid var(--color-border);
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 36px;
        }

        .address-col-title {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: var(--color-muted);
            margin-bottom: 6px;
        }

        .address-col-name {
            font-size: 15px;
            font-weight: 700;
            color: var(--color-dark);
            margin-bottom: 4px;
        }

        .address-col-meta {
            font-size: 13px;
            color: var(--color-muted);
            line-height: 1.5;
        }

        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 28px;
        }

        .items-table th {
            background: var(--color-bg-subtle);
            border-bottom: 2px solid var(--color-border);
            padding: 12px 14px;
            text-align: left;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--color-muted);
        }

        .items-table td {
            padding: 14px;
            border-bottom: 1px solid var(--color-border);
            font-size: 13px;
            color: var(--color-dark);
        }

        .totals-summary-box {
            width: 320px;
            margin-left: auto;
            border-collapse: collapse;
            font-size: 13px;
            margin-bottom: 36px;
        }

        .totals-summary-box td {
            padding: 7px 12px;
        }

        .totals-summary-box .grand-total-row {
            font-size: 16px;
            font-weight: 800;
            color: var(--color-dark);
            border-top: 2px solid var(--color-border);
            border-bottom: 2px solid var(--color-border);
        }

        .footer-terms {
            border-top: 1px solid var(--color-border);
            padding-top: 20px;
            font-size: 12px;
            color: var(--color-muted);
            line-height: 1.6;
        }

        .action-toolbar {
            max-width: 850px;
            margin: 0 auto 20px auto;
            display: flex;
            justify-content: flex-end;
            gap: 12px;
        }

        .btn-print {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: var(--color-primary);
            color: #ffffff;
            padding: 9px 18px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 13px;
            border: none;
            cursor: pointer;
            transition: opacity 0.15s ease;
        }

        .btn-print:hover { opacity: 0.9; }

        @media print {
            body { background: #ffffff; padding: 0; }
            .action-toolbar { display: none !important; }
            .invoice-sheet { border: none; padding: 0; box-shadow: none; max-width: 100%; }
        }
    </style>
</head>
<body>

    <div class="action-toolbar">
        <button type="button" onclick="window.print()" class="btn-print">🖨️ Print / Save as PDF</button>
    </div>

    <div class="invoice-sheet">
        <!-- ── Document Header ─────────────────────────────────────────── -->
        <table class="header-table">
            <tr>
                <td style="width: 55%;">
                    <div class="brand-logo-text">
                        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="32" height="32" rx="8" fill="#4f46e5"/>
                            <path d="M9 16L15 10L21 16L15 22L9 16Z" fill="#38bdf8"/>
                            <circle cx="21" cy="11" r="3" fill="#ffffff"/>
                        </svg>
                        OmniDesk AI
                    </div>
                    <div class="brand-subtext">
                        <strong>OmniDesk AI Enterprise Systems</strong><br>
                        Corporate Financial Operations & Billing<br>
                        Tax Identification: US-84920491-EI
                    </div>
                </td>
                <td style="width: 45%;">
                    <div class="inv-headline">INVOICE</div>
                    <div class="inv-meta-text">
                        <strong>Invoice # <?= e($inv['invoice_number'] ?? '') ?></strong><br>
                        Issue Date: <span style="font-family: var(--font-mono);"><?= e($inv['issue_date'] ?? '') ?></span><br>
                        Due Date: <span style="font-family: var(--font-mono);"><?= e($inv['due_date'] ?? '') ?></span><br>
                        Status: <span class="status-pill <?= e($inv['status'] ?? 'sent') ?>"><?= e(str_replace('_', ' ', $inv['status'] ?? 'draft')) ?></span>
                    </div>
                </td>
            </tr>
        </table>

        <!-- ── Client & Project Context ─────────────────────────────────── -->
        <div class="address-box">
            <div>
                <div class="address-col-title">Billed To (Client Account)</div>
                <div class="address-col-name"><?= e($inv['customer_name'] ?? 'Customer Account') ?></div>
                <div class="address-col-meta">
                    <?= e($inv['customer_email'] ?: 'billing@client.com') ?><br>
                    <?= e($inv['customer_phone'] ?: '') ?>
                </div>
            </div>
            <div>
                <div class="address-col-title">Project Delivery Context</div>
                <div class="address-col-name"><?= e($inv['project_name'] ?: 'Corporate Retainer & SLA') ?></div>
                <div class="address-col-meta">
                    Payment Terms: Net 30 Days<br>
                    Currency: USD ($)
                </div>
            </div>
        </div>

        <!-- ── Itemized Line Items ──────────────────────────────────────── -->
        <table class="items-table">
            <thead>
                <tr>
                    <th>Line Item Description</th>
                    <th style="width: 70px; text-align: center;">Qty</th>
                    <th style="width: 120px; text-align: right;">Unit Price</th>
                    <th style="width: 90px; text-align: right;">Tax Rate</th>
                    <th style="width: 130px; text-align: right;">Total Amount</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!empty($items)): ?>
                    <?php foreach ($items as $it): ?>
                        <tr>
                            <td>
                                <strong><?= e($it['description']) ?></strong>
                            </td>
                            <td style="text-align: center; font-family: var(--font-mono);"><?= e($it['quantity']) ?></td>
                            <td style="text-align: right; font-family: var(--font-mono);">$<?= number_format($it['unit_price'], 2) ?></td>
                            <td style="text-align: right; font-family: var(--font-mono);"><?= e($it['tax_rate']) ?>%</td>
                            <td style="text-align: right; font-family: var(--font-mono); font-weight: 700;">$<?= number_format($it['total'], 2) ?></td>
                        </tr>
                    <?php endforeach; ?>
                <?php else: ?>
                    <tr>
                        <td colspan="5" style="text-align: center; padding: 24px; color: var(--color-muted);">No line items itemized.</td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>

        <!-- ── Financial Summary ────────────────────────────────────────── -->
        <table class="totals-summary-box">
            <tr>
                <td style="color: var(--color-muted);">Subtotal:</td>
                <td style="text-align: right; font-family: var(--font-mono); font-weight: 600;">$<?= number_format($inv['subtotal'] ?? 0, 2) ?></td>
            </tr>
            <tr>
                <td style="color: var(--color-muted);">Tax Total:</td>
                <td style="text-align: right; font-family: var(--font-mono); font-weight: 600;">$<?= number_format($inv['tax_amount'] ?? 0, 2) ?></td>
            </tr>
            <tr class="grand-total-row">
                <td>Grand Total:</td>
                <td style="text-align: right; font-family: var(--font-mono); color: var(--color-primary);">$<?= number_format($inv['total_amount'] ?? 0, 2) ?></td>
            </tr>
            <tr>
                <td style="color: var(--color-success); font-weight: 600;">Paid Collections:</td>
                <td style="text-align: right; font-family: var(--font-mono); color: var(--color-success); font-weight: 700;">$<?= number_format($inv['paid_amount'] ?? 0, 2) ?></td>
            </tr>
            <tr>
                <td style="color: var(--color-danger); font-weight: 800;">Balance Due:</td>
                <td style="text-align: right; font-family: var(--font-mono); color: var(--color-danger); font-weight: 800; font-size: 15px;">$<?= number_format($inv['balance_due'] ?? 0, 2) ?></td>
            </tr>
        </table>

        <!-- ── Terms & Wire Notes ───────────────────────────────────────── -->
        <div class="footer-terms">
            <strong>Payment Instructions & Terms:</strong><br>
            Please remit payments via Bank Wire or ACH Transfer referencing Invoice <strong>#<?= e($inv['invoice_number'] ?? '') ?></strong>.<br>
            For billing inquiries or electronic receipt copies, contact <span style="font-family: var(--font-mono); color: var(--color-primary);">finance@omnidesk.internal</span>.
        </div>
    </div>

</body>
</html>
