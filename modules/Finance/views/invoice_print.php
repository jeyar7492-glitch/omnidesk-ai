<?php
/**
 * OmniDesk AI — Print-Ready Invoice View (Phase 6)
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
    <title>Invoice <?= e($inv['invoice_number'] ?? '') ?> — OmniDesk AI</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; background: #ffffff; padding: 40px; margin: 0; }
        .invoice-box { max-width: 800px; margin: auto; border: 1px solid #e2e8f0; padding: 40px; border-radius: 8px; }
        .header-table, .item-table { width: 100%; border-collapse: collapse; }
        .header-table td { vertical-align: top; }
        .brand-title { font-size: 24px; font-weight: 800; color: #4f46e5; margin: 0; }
        .inv-num { font-size: 20px; font-weight: 700; text-align: right; margin: 0; }
        .inv-meta { text-align: right; font-size: 13px; color: #64748b; }
        .item-table th { background: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left; padding: 12px; font-size: 12px; text-transform: uppercase; color: #64748b; }
        .item-table td { border-bottom: 1px solid #f1f5f9; padding: 12px; font-size: 13px; }
        .totals-table { width: 300px; margin-left: auto; font-size: 13px; margin-top: 20px; }
        .totals-table td { padding: 6px 12px; }
        .totals-table .grand-total { font-size: 16px; font-weight: 700; border-top: 2px solid #e2e8f0; border-bottom: 2px solid #e2e8f0; }
        .print-btn { display: inline-block; background: #4f46e5; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px; border: none; cursor: pointer; }
        @media print { .no-print { display: none !important; } .invoice-box { border: none; padding: 0; } }
    </style>
</head>
<body>

    <div class="no-print" style="max-width: 800px; margin: 0 auto 20px auto; text-align: right;">
        <button type="button" onclick="window.print()" class="print-btn">🖨️ Print / Download PDF</button>
    </div>

    <div class="invoice-box">
        <table class="header-table" style="margin-bottom: 40px;">
            <tr>
                <td>
                    <h1 class="brand-title">⚡ OMNIDESK AI</h1>
                    <div style="font-size: 13px; color: #64748b; margin-top: 5px;">
                        Enterprise Management Platform<br>
                        Billing & Financial Operations
                    </div>
                </td>
                <td>
                    <h2 class="inv-num">INVOICE</h2>
                    <div class="inv-meta">
                        <strong># <?= e($inv['invoice_number'] ?? '') ?></strong><br>
                        Issue Date: <?= e($inv['issue_date'] ?? '') ?><br>
                        Due Date: <?= e($inv['due_date'] ?? '') ?><br>
                        Status: <span style="text-transform: uppercase; font-weight: 700; color: #4f46e5;"><?= e($inv['status'] ?? '') ?></span>
                    </div>
                </td>
            </tr>
        </table>

        <table class="header-table" style="margin-bottom: 30px; background: #f8fafc; padding: 16px; border-radius: 6px;">
            <tr>
                <td style="width: 50%;">
                    <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 4px;">Billed To:</div>
                    <strong style="font-size: 15px;"><?= e($inv['customer_name'] ?? 'Customer Account') ?></strong><br>
                    <span style="font-size: 13px; color: #475569;">
                        <?= e($inv['customer_email'] ?: '') ?><br>
                        <?= e($inv['customer_phone'] ?: '') ?>
                    </span>
                </td>
                <td style="width: 50%;">
                    <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 4px;">Project Context:</div>
                    <strong style="font-size: 14px;"><?= e($inv['project_name'] ?: 'General Services') ?></strong>
                </td>
            </tr>
        </table>

        <table class="item-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th style="width: 60px; text-align: center;">Qty</th>
                    <th style="width: 100px; text-align: right;">Unit Price</th>
                    <th style="width: 80px; text-align: right;">Tax</th>
                    <th style="width: 110px; text-align: right;">Total</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($items as $it): ?>
                    <tr>
                        <td><strong><?= e($it['description']) ?></strong></td>
                        <td style="text-align: center;"><?= e($it['quantity']) ?></td>
                        <td style="text-align: right; font-family: monospace;">$<?= number_format($it['unit_price'], 2) ?></td>
                        <td style="text-align: right;"><?= e($it['tax_rate']) ?>%</td>
                        <td style="text-align: right; font-family: monospace; font-weight: 700;">$<?= number_format($it['total'], 2) ?></td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>

        <table class="totals-table">
            <tr>
                <td>Subtotal:</td>
                <td style="text-align: right; font-family: monospace;">$<?= number_format($inv['subtotal'] ?? 0, 2) ?></td>
            </tr>
            <tr>
                <td>Tax Amount:</td>
                <td style="text-align: right; font-family: monospace;">$<?= number_format($inv['tax_amount'] ?? 0, 2) ?></td>
            </tr>
            <tr class="grand-total">
                <td>Grand Total:</td>
                <td style="text-align: right; font-family: monospace;">$<?= number_format($inv['total_amount'] ?? 0, 2) ?></td>
            </tr>
            <tr>
                <td style="color: #10b981; font-weight: 600;">Paid Amount:</td>
                <td style="text-align: right; font-family: monospace; color: #10b981; font-weight: 600;">$<?= number_format($inv['paid_amount'] ?? 0, 2) ?></td>
            </tr>
            <tr>
                <td style="color: #ef4444; font-weight: 700;">Balance Due:</td>
                <td style="text-align: right; font-family: monospace; color: #ef4444; font-weight: 700;">$<?= number_format($inv['balance_due'] ?? 0, 2) ?></td>
            </tr>
        </table>

        <div style="margin-top: 40px; border-t: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #64748b;">
            <strong>Terms & Conditions:</strong> Payment due within 30 days of issue. Thank you for your business!
        </div>
    </div>

</body>
</html>
