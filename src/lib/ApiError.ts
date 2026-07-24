export class ApiError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(message: string, statusCode: number, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype); // Ensure instanceof works correctly
  }

  static badRequest(message: string, details?: any) {
    return new ApiError(message, 400, details);
  }

  static unauthorized(message: string, details?: any) {
    return new ApiError(message, 401, details);
  }

  static forbidden(message: string, details?: any) {
    return new ApiError(message, 403, details);
  }

  static notFound(message: string, details?: any) {
    return new ApiError(message, 404, details);
  }

  static internal(message: string, details?: any) {
    return new ApiError(message, 500, details);
  }
}
