export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;

  constructor(
    messageOrStatusCode: string | number,
    statusCodeOrMessage: number | string = 400,
    code: string = "BAD_REQUEST",
    details?: any
  ) {
    let message: string;
    let statusCode: number;
    if (typeof messageOrStatusCode === "number") {
      statusCode = messageOrStatusCode;
      message = String(statusCodeOrMessage);
    } else {
      message = messageOrStatusCode;
      statusCode = typeof statusCodeOrMessage === "number" ? statusCodeOrMessage : 400;
    }
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Access denied: insufficient permissions or workspace boundary violation") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
  }
}

export class ValidationError extends AppError {
  constructor(message: string = "Validation failed", details?: any) {
    super(message, 422, "VALIDATION_ERROR", details);
  }
}
