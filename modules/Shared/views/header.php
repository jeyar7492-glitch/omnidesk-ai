<?php
/**
 * OmniDesk AI — Shared HTML Head & Theme Bootstrap
 */
if (!defined('OMNIDESK_APP')) {
    http_response_code(403);
    exit('Direct access forbidden.');
}

$pageTitle = $pageTitle ?? 'Enterprise Platform';
?>
<!DOCTYPE html>
<html lang="en" data-theme="system">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <meta name="csrf-token" content="<?= csrf_token() ?>">
    <meta name="description" content="OmniDesk AI — Professional AI-Powered Enterprise Management Platform">
    <title><?= e($pageTitle) ?> — <?= e(APP_NAME) ?></title>

    <!-- Theme initialization script (prevents flash of unstyled content) -->
    <script>
        (function() {
            const saved = localStorage.getItem('omnidesk_theme') || 'system';
            document.documentElement.setAttribute('data-theme', saved);
        })();
    </script>

    <!-- Design Tokens & Component Styles -->
    <link rel="stylesheet" href="<?= asset('css/variables.css') ?>">
    <link rel="stylesheet" href="<?= asset('css/base.css') ?>">
    <link rel="stylesheet" href="<?= asset('css/components.css') ?>">

    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
</head>
