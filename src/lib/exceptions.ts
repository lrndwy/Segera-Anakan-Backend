import type { ValidationErrorDetail } from './response';

export abstract class HttpException extends Error {
  abstract readonly statusCode: number;

  constructor(
    message: string,
    public readonly errors?: ValidationErrorDetail[],
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestException extends HttpException {
  readonly statusCode = 400;

  constructor(message = 'Bad request', errors?: ValidationErrorDetail[]) {
    super(message, errors);
  }
}

export class UnauthorizedException extends HttpException {
  readonly statusCode = 401;

  constructor(message = 'Unauthorized') {
    super(message);
  }
}

export class ForbiddenException extends HttpException {
  readonly statusCode = 403;

  constructor(message = 'Forbidden') {
    super(message);
  }
}

export class NotFoundException extends HttpException {
  readonly statusCode = 404;

  constructor(message = 'Resource not found') {
    super(message);
  }
}

export class ConflictException extends HttpException {
  readonly statusCode = 409;

  constructor(message = 'Conflict') {
    super(message);
  }
}

export class ValidationException extends HttpException {
  readonly statusCode = 422;

  constructor(message = 'Validation failed', errors: ValidationErrorDetail[] = []) {
    super(message, errors);
  }
}

export class InternalServerException extends HttpException {
  readonly statusCode = 500;

  constructor(message = 'Internal server error') {
    super(message);
  }
}

export class TooManyRequestsException extends HttpException {
  readonly statusCode = 429;

  constructor(message = 'Too many requests') {
    super(message);
  }
}

export const isHttpException = (error: unknown): error is HttpException => error instanceof HttpException;

/** @deprecated Use HttpException subclasses instead */
export class AppError extends HttpException {
  readonly statusCode: number;

  constructor(
    message: string,
    statusCode = 500,
    _code = 'INTERNAL_SERVER_ERROR',
    details?: unknown,
  ) {
    const errors = Array.isArray(details)
      ? (details as ValidationErrorDetail[])
      : undefined;
    super(message, errors);
    this.statusCode = statusCode;
  }
}

export const isAppError = (error: unknown): error is HttpException => isHttpException(error);
