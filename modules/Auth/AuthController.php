<?php
/**
 * OmniDesk AI — Auth Controller
 *
 * Handles HTTP requests for:
 *   - Login / Logout
 *   - User Registration
 *   - Forgot Password / Password Reset
 *   - Email Verification
 *
 * Namespace: Modules\Auth
 */

namespace Modules\Auth;

use Core\Auth;
use Core\Security;
use Core\Session;
use Core\Validator;
use Core\ActivityLog;

class AuthController
{
    /**
     * GET /login
     */
    public function showLogin(array $params = []): void
    {
        if (Auth::check()) {
            redirect('/dashboard');
        }

        require_once __DIR__ . '/views/login.php';
    }

    /**
     * POST /login
     */
    public function login(array $params = []): void
    {
        Security::requireValidCsrf();

        $v = Validator::make($_POST, [
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        if ($v->fails()) {
            flash('error', $v->firstError('email') ?? $v->firstError('password') ?? 'Invalid login input.');
            redirect('/login');
        }

        $email    = (string)$_POST['email'];
        $password = (string)$_POST['password'];
        $remember = isset($_POST['remember']);

        $res = Auth::attempt($email, $password, $remember);

        if (!$res['success']) {
            flash('error', $res['message']);
            redirect('/login');
        }

        flash('success', 'Welcome back to OmniDesk AI!');
        $intended = Session::get('intended_url', '/dashboard');
        Session::remove('intended_url');
        redirect($intended);
    }

    /**
     * GET /register
     */
    public function showRegister(array $params = []): void
    {
        if (Auth::check()) {
            redirect('/dashboard');
        }

        require_once __DIR__ . '/views/register.php';
    }

    /**
     * POST /register
     */
    public function register(array $params = []): void
    {
        Security::requireValidCsrf();

        $v = Validator::make($_POST, [
            'first_name' => 'required|string|min:2|max:50',
            'last_name'  => 'required|string|min:2|max:50',
            'email'      => 'required|email|max:255',
            'password'   => 'required|string|min:8|max:100|confirmed',
        ], [
            'first_name' => 'First name',
            'last_name'  => 'Last name',
            'email'      => 'Email address',
            'password'   => 'Password',
        ]);

        if ($v->fails()) {
            flash('error', implode(' ', $v->allErrors()));
            redirect('/register');
        }

        $res = Auth::register([
            'first_name' => $_POST['first_name'],
            'last_name'  => $_POST['last_name'],
            'email'      => $_POST['email'],
            'password'   => $_POST['password'],
        ]);

        if (!$res['success']) {
            flash('error', $res['message']);
            redirect('/register');
        }

        flash('success', $res['message']);
        redirect('/login');
    }

    /**
     * GET /forgot-password
     */
    public function showForgotPassword(array $params = []): void
    {
        if (Auth::check()) {
            redirect('/dashboard');
        }

        require_once __DIR__ . '/views/forgot_password.php';
    }

    /**
     * POST /forgot-password
     */
    public function forgotPassword(array $params = []): void
    {
        Security::requireValidCsrf();

        $v = Validator::make($_POST, [
            'email' => 'required|email',
        ]);

        if ($v->fails()) {
            flash('error', $v->firstError('email'));
            redirect('/forgot-password');
        }

        $res = Auth::requestPasswordReset((string)$_POST['email']);
        flash('info', $res['message']);

        // In development mode, display reset token for easy testing
        if (APP_DEBUG && isset($res['token'])) {
            flash('warning', '[DEV MODE] Password reset link: ' . url('/reset-password?token=' . $res['token']));
        }

        redirect('/forgot-password');
    }

    /**
     * GET /reset-password
     */
    public function showResetPassword(array $params = []): void
    {
        if (Auth::check()) {
            redirect('/dashboard');
        }

        $token = $_GET['token'] ?? '';
        if (empty($token)) {
            flash('error', 'Missing password reset token.');
            redirect('/forgot-password');
        }

        require_once __DIR__ . '/views/reset_password.php';
    }

    /**
     * POST /reset-password
     */
    public function resetPassword(array $params = []): void
    {
        Security::requireValidCsrf();

        $v = Validator::make($_POST, [
            'token'    => 'required|string',
            'password' => 'required|string|min:8|max:100|confirmed',
        ]);

        if ($v->fails()) {
            flash('error', implode(' ', $v->allErrors()));
            $token = urlencode((string)($_POST['token'] ?? ''));
            redirect('/reset-password?token=' . $token);
        }

        $res = Auth::resetPassword((string)$_POST['token'], (string)$_POST['password']);

        if (!$res['success']) {
            flash('error', $res['message']);
            redirect('/forgot-password');
        }

        flash('success', $res['message']);
        redirect('/login');
    }

    /**
     * GET /verify-email
     */
    public function verifyEmail(array $params = []): void
    {
        $token = $_GET['token'] ?? '';
        $res   = Auth::verifyEmail($token);

        flash($res['success'] ? 'success' : 'error', $res['message']);
        redirect(Auth::check() ? '/dashboard' : '/login');
    }

    /**
     * POST /logout or GET /logout
     */
    public function logout(array $params = []): void
    {
        Auth::logout();
        flash('info', 'You have been logged out securely.');
        redirect('/login');
    }
}
