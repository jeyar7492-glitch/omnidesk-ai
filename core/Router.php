<?php
/**
 * OmniDesk AI — Router
 *
 * A clean, secure URL dispatcher that:
 *   - Maps GET and POST routes to controller callbacks or methods
 *   - Supports named route parameters (e.g. /users/{id})
 *   - Rejects arbitrary controller/method execution from URL input
 *   - Handles 404 and 405 responses cleanly
 *
 * Usage:
 *   $router = new Router();
 *   $router->get('/', [DashboardController::class, 'index']);
 *   $router->post('/contact', [ContactController::class, 'submit']);
 *   $router->get('/users/{id}', function(array $params) { ... });
 *   $router->dispatch();
 *
 * SECURITY:
 *   Route handlers are registered explicitly in code — never constructed
 *   dynamically from URL-supplied class/method names.
 *   This prevents remote code execution via URL manipulation.
 */

namespace Core;

class Router
{
    /** @var array<string, array<string, callable>> method → [pattern => handler] */
    private array $routes = [
        'GET'  => [],
        'POST' => [],
    ];

    /** @var callable|null Custom 404 handler */
    private mixed $notFoundHandler = null;

    /**
     * Register a GET route with optional middleware.
     *
     * @param string          $path       URL path pattern.
     * @param callable|array  $handler    Controller callback or [Class::class, 'method'].
     * @param string|array    $middleware Guard string or list of guards (e.g. 'auth', 'guest').
     */
    public function get(string $path, callable|array $handler, string|array $middleware = []): void
    {
        $this->addRoute('GET', $path, $handler, (array) $middleware);
    }

    /**
     * Register a POST route with optional middleware.
     */
    public function post(string $path, callable|array $handler, string|array $middleware = []): void
    {
        $this->addRoute('POST', $path, $handler, (array) $middleware);
    }

    /**
     * Register a route for both GET and POST methods.
     */
    public function any(string $path, callable|array $handler, string|array $middleware = []): void
    {
        $this->addRoute('GET',  $path, $handler, (array) $middleware);
        $this->addRoute('POST', $path, $handler, (array) $middleware);
    }

    /**
     * Register a custom 404 Not Found handler.
     */
    public function setNotFound(callable $handler): void
    {
        $this->notFoundHandler = $handler;
    }

    /**
     * Dispatch the current HTTP request to the matching route handler.
     * Sends 404 if no route matches, 405 if method not allowed.
     */
    public function dispatch(): void
    {
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $uri    = $this->normalizeUri($_SERVER['REQUEST_URI'] ?? '/');

        // Check if method is supported at all
        if (!array_key_exists($method, $this->routes)) {
            $this->sendMethodNotAllowed();
            return;
        }

        // Try to match against registered routes for this method
        foreach ($this->routes[$method] as $pattern => $routeInfo) {
            $params = $this->matchRoute($pattern, $uri);
            if ($params !== null) {
                // Execute middleware pipeline before calling handler
                $this->runMiddleware($routeInfo['middleware']);
                $this->callHandler($routeInfo['handler'], $params);
                return;
            }
        }

        // Check if the path exists on another method (for 405 vs 404)
        $otherMethods = array_keys($this->routes);
        foreach ($otherMethods as $otherMethod) {
            if ($otherMethod === $method) continue;
            foreach ($this->routes[$otherMethod] as $pattern => $routeInfo) {
                if ($this->matchRoute($pattern, $uri) !== null) {
                    $this->sendMethodNotAllowed([$otherMethod]);
                    return;
                }
            }
        }

        $this->sendNotFound();
    }

    /**
     * Register a route internally with middleware.
     */
    private function addRoute(string $method, string $path, callable|array $handler, array $middleware = []): void
    {
        $pattern = $this->pathToPattern($path);
        $this->routes[$method][$pattern] = [
            'handler'    => $handler,
            'middleware' => $middleware,
        ];
    }

    /**
     * Run middleware guard checks before invoking route handlers.
     */
    private function runMiddleware(array $middlewares): void
    {
        foreach ($middlewares as $mw) {
            if ($mw === 'auth') {
                Security::requireAuth();
            } elseif ($mw === 'guest') {
                Security::requireGuest();
            } elseif (str_starts_with($mw, 'permission:')) {
                $permission = substr($mw, 11);
                Auth::requirePermission($permission);
            } elseif (is_callable($mw)) {
                $mw();
            }
        }
    }

    /**
     * Convert a path with {param} placeholders into a regex pattern.
     *
     * Example: '/users/{id}/posts/{slug}'
     *     →    '#^/users/(?P<id>[^/]+)/posts/(?P<slug>[^/]+)$#'
     */
    private function pathToPattern(string $path): string
    {
        $pattern = preg_replace_callback(
            '/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/',
            fn($m) => '(?P<' . $m[1] . '>[^/]+)',
            $path
        );
        return '#^' . $pattern . '$#';
    }

    /**
     * Try to match a URI against a route regex pattern.
     *
     * @return array<string, string>|null Named params on match, null on no match.
     */
    private function matchRoute(string $pattern, string $uri): ?array
    {
        if (!preg_match($pattern, $uri, $matches)) {
            return null;
        }

        // Return only named captures (filter out numeric keys)
        return array_filter(
            $matches,
            fn($k) => is_string($k),
            ARRAY_FILTER_USE_KEY
        );
    }

    /**
     * Invoke the route handler safely.
     *
     * Accepts:
     *   - A plain callable (closure or function name)
     *   - [ClassName::class, 'methodName']  (instantiates the class)
     *
     * Routes are NEVER resolved from URL input — only from explicitly
     * registered route definitions in the codebase.
     *
     * @param callable|array             $handler
     * @param array<string, string>      $params  Named URL parameters.
     */
    private function callHandler(callable|array $handler, array $params): void
    {
        if (is_array($handler)) {
            [$class, $method] = $handler;

            // Validate that this is a real, registered class
            if (!class_exists($class)) {
                throw new \RuntimeException("Router: class '{$class}' not found.");
            }
            if (!method_exists($class, $method)) {
                throw new \RuntimeException("Router: method '{$class}::{$method}' not found.");
            }

            $instance = new $class();
            $instance->$method($params);
            return;
        }

        // Callable (closure, function)
        ($handler)($params);
    }

    /**
     * Normalize the request URI: strip query string, normalize slashes.
     */
    private function normalizeUri(string $uri): string
    {
        $path = parse_url($uri, PHP_URL_PATH) ?? '/';
        $path = '/' . trim($path, '/');
        // Collapse double slashes
        $path = preg_replace('#/+#', '/', $path);
        return $path === '' ? '/' : $path;
    }

    /**
     * Send a 404 Not Found response.
     */
    private function sendNotFound(): void
    {
        http_response_code(404);
        if ($this->notFoundHandler !== null) {
            ($this->notFoundHandler)([]);
            return;
        }
        echo '<h1>404 — Page Not Found</h1>';
        echo '<p>The requested resource does not exist.</p>';
    }

    /**
     * Send a 405 Method Not Allowed response.
     *
     * @param array<string> $allowed Allowed methods for the matched path.
     */
    private function sendMethodNotAllowed(array $allowed = []): void
    {
        http_response_code(405);
        if (!empty($allowed)) {
            header('Allow: ' . implode(', ', $allowed));
        }
        echo '<h1>405 — Method Not Allowed</h1>';
    }
}
