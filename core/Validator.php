<?php
/**
 * OmniDesk AI — Validator
 *
 * Server-side input validation layer.
 *
 * All validation is server-side authoritative.
 * Client-side validation may improve UX but is never trusted.
 *
 * Usage:
 *   $v = new Validator($_POST, [
 *       'email'    => 'required|email|max:255',
 *       'name'     => 'required|string|min:2|max:100',
 *       'age'      => 'required|integer|min:1|max:120',
 *       'role'     => 'required|in:admin,member,viewer',
 *       'website'  => 'url|max:500',
 *   ]);
 *
 *   if (!$v->passes()) {
 *       $errors = $v->errors();
 *   }
 *
 * Supported rules:
 *   required        Field must be present and non-empty.
 *   string          Must be a string (non-array).
 *   email           Must be a valid email format.
 *   integer         Must be an integer value.
 *   numeric         Must be numeric (int or float).
 *   url             Must be a valid URL.
 *   min:N           Minimum length (string) or minimum value (numeric).
 *   max:N           Maximum length (string) or maximum value (numeric).
 *   in:a,b,c        Value must be one of the listed options.
 *   confirmed        Must match field_confirmation counterpart.
 *   alpha           Only alphabetic characters.
 *   alphanumeric    Only alphanumeric characters.
 *   boolean         Must be a boolean-like value.
 */

namespace Core;

class Validator
{
    /** @var array<string, mixed> Input data to validate */
    private array $data;

    /** @var array<string, string> Field rules */
    private array $rules;

    /** @var array<string, string[]> Validation errors: field => [message, ...] */
    private array $errors = [];

    /** @var array<string, string> Custom field labels for error messages */
    private array $labels;

    /**
     * @param array<string, mixed>  $data   Input data (e.g. $_POST).
     * @param array<string, string> $rules  Field rules (pipe-separated rule strings).
     * @param array<string, string> $labels Optional human-readable field names.
     */
    public function __construct(array $data, array $rules, array $labels = [])
    {
        $this->data   = $data;
        $this->rules  = $rules;
        $this->labels = $labels;
        $this->validate();
    }

    /**
     * Run all validation rules.
     */
    private function validate(): void
    {
        foreach ($this->rules as $field => $ruleString) {
            $rules = array_map('trim', explode('|', $ruleString));
            $value = $this->data[$field] ?? null;
            $label = $this->labels[$field] ?? ucfirst(str_replace('_', ' ', $field));

            // If not required and empty, skip further validation for this field
            $isRequired = in_array('required', $rules, true);
            $isEmpty    = $value === null || $value === '' || $value === [];

            if ($isEmpty && !$isRequired) {
                continue;
            }

            foreach ($rules as $rule) {
                $this->applyRule($field, $value, $rule, $label);
            }
        }
    }

    /**
     * Apply a single validation rule to a field value.
     */
    private function applyRule(string $field, mixed $value, string $rule, string $label): void
    {
        // Rules with parameters use colon notation: max:255
        $param = null;
        if (str_contains($rule, ':')) {
            [$rule, $param] = explode(':', $rule, 2);
        }

        $isEmpty = $value === null || $value === '';

        match ($rule) {
            'required' => $isEmpty
                ? $this->addError($field, "{$label} is required.")
                : null,

            'string' => (!$isEmpty && !is_string($value))
                ? $this->addError($field, "{$label} must be a string.")
                : null,

            'email' => (!$isEmpty && !filter_var($value, FILTER_VALIDATE_EMAIL))
                ? $this->addError($field, "{$label} must be a valid email address.")
                : null,

            'integer' => (!$isEmpty && !filter_var($value, FILTER_VALIDATE_INT))
                ? $this->addError($field, "{$label} must be an integer.")
                : null,

            'numeric' => (!$isEmpty && !is_numeric($value))
                ? $this->addError($field, "{$label} must be numeric.")
                : null,

            'url' => (!$isEmpty && !filter_var($value, FILTER_VALIDATE_URL))
                ? $this->addError($field, "{$label} must be a valid URL.")
                : null,

            'boolean' => (!$isEmpty && !in_array(strtolower((string)$value), ['1','0','true','false','yes','no'], true))
                ? $this->addError($field, "{$label} must be a boolean value.")
                : null,

            'alpha' => (!$isEmpty && !ctype_alpha($value))
                ? $this->addError($field, "{$label} may only contain alphabetic characters.")
                : null,

            'alphanumeric' => (!$isEmpty && !ctype_alnum($value))
                ? $this->addError($field, "{$label} may only contain alphanumeric characters.")
                : null,

            'min' => $this->validateMin($field, $value, (int) $param, $label),

            'max' => $this->validateMax($field, $value, (int) $param, $label),

            'in' => (!$isEmpty && !in_array($value, explode(',', $param ?? ''), true))
                ? $this->addError($field, "{$label} must be one of: {$param}.")
                : null,

            'confirmed' => $this->validateConfirmed($field, $value, $label),

            default => null, // Unknown rules are silently ignored (log in debug)
        };

        if (APP_DEBUG && !in_array($rule, [
            'required','string','email','integer','numeric','url',
            'boolean','alpha','alphanumeric','min','max','in','confirmed',
        ], true)) {
            error_log("[OmniDesk][Validator] Unknown rule '{$rule}' on field '{$field}'.");
        }
    }

    private function validateMin(string $field, mixed $value, int $min, string $label): void
    {
        if ($value === null || $value === '') return;

        $isNumericRule = $this->hasNumericRule($field);

        if ($isNumericRule && is_numeric($value)) {
            if ((float) $value < $min) {
                $this->addError($field, "{$label} must be at least {$min}.");
            }
        } else {
            if (mb_strlen((string) $value) < $min) {
                $this->addError($field, "{$label} must be at least {$min} characters.");
            }
        }
    }

    private function validateMax(string $field, mixed $value, int $max, string $label): void
    {
        if ($value === null || $value === '') return;

        $isNumericRule = $this->hasNumericRule($field);

        if ($isNumericRule && is_numeric($value)) {
            if ((float) $value > $max) {
                $this->addError($field, "{$label} must not exceed {$max}.");
            }
        } else {
            if (mb_strlen((string) $value) > $max) {
                $this->addError($field, "{$label} must not exceed {$max} characters.");
            }
        }
    }

    /**
     * Check if a field's rules include 'integer' or 'numeric'.
     */
    private function hasNumericRule(string $field): bool
    {
        $ruleString = $this->rules[$field] ?? '';
        $rules      = array_map('trim', explode('|', $ruleString));
        return in_array('integer', $rules, true) || in_array('numeric', $rules, true);
    }

    private function validateConfirmed(string $field, mixed $value, string $label): void
    {
        $confirmationKey   = $field . '_confirmation';
        $confirmationValue = $this->data[$confirmationKey] ?? null;

        if ($value !== $confirmationValue) {
            $this->addError($field, "{$label} confirmation does not match.");
        }
    }

    /**
     * Add a validation error for a field.
     */
    private function addError(string $field, string $message): void
    {
        $this->errors[$field][] = $message;
    }

    /**
     * Return true if validation passed (no errors).
     */
    public function passes(): bool
    {
        return empty($this->errors);
    }

    /**
     * Return true if validation failed.
     */
    public function fails(): bool
    {
        return !empty($this->errors);
    }

    /**
     * Return all validation errors.
     *
     * @return array<string, string[]>
     */
    public function errors(): array
    {
        return $this->errors;
    }

    /**
     * Return the first error for a specific field, or null.
     */
    public function firstError(string $field): ?string
    {
        return $this->errors[$field][0] ?? null;
    }

    /**
     * Return the first error for every field that failed.
     *
     * @return array<string, string>
     */
    public function firstErrors(): array
    {
        return array_map(fn($msgs) => $msgs[0], $this->errors);
    }

    /**
     * Check whether a specific field has errors.
     */
    public function hasError(string $field): bool
    {
        return isset($this->errors[$field]);
    }

    /**
     * Return a flat list of all error messages.
     *
     * @return string[]
     */
    public function allErrors(): array
    {
        return array_merge(...array_values($this->errors));
    }

    /**
     * Static convenience factory.
     */
    public static function make(array $data, array $rules, array $labels = []): static
    {
        return new static($data, $rules, $labels);
    }
}
