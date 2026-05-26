export class TupletsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class APIStatusError extends TupletsError {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody: unknown,
  ) {
    super(message);
  }
}

export class AuthenticationError extends APIStatusError {}
export class PermissionDeniedError extends APIStatusError {}
export class ValidationError extends APIStatusError {}
export class PaymentRequiredError extends APIStatusError {}
export class NotFoundError extends APIStatusError {}
export class ConflictError extends APIStatusError {}
export class GoneError extends APIStatusError {}
export class RateLimitError extends APIStatusError {}
export class RequestTimeoutError extends TupletsError {}
export class WaitTimeoutError extends TupletsError {}

const statusErrorMap: Record<number, typeof APIStatusError> = {
  400: ValidationError,
  401: AuthenticationError,
  402: PaymentRequiredError,
  403: PermissionDeniedError,
  404: NotFoundError,
  409: ConflictError,
  410: GoneError,
  429: RateLimitError,
};

export function createAPIError(
  statusCode: number,
  message: string,
  responseBody: unknown,
): APIStatusError {
  const ErrorClass = statusErrorMap[statusCode] ?? APIStatusError;
  return new ErrorClass(message, statusCode, responseBody);
}
