export class AppError extends Error {
  /**
   * @param {string} message  human-readable message (shown to users)
   * @param {number} statusCode HTTP status
   * @param {Array}  [details] field errors [{ field, message }]
   * @param {string} [code]   machine-readable code, e.g. EMAIL_NOT_VERIFIED
   */
  constructor(message, statusCode = 400, details, code) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.code = code;
    this.isOperational = true;
  }
}

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
