import { Request, Response, NextFunction } from 'express';

// Error types enum
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  DATABASE = 'DATABASE_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  CSRF = 'CSRF_ERROR'
}

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  errorType: ErrorType;
  details?: any;

  constructor(
    message: string, 
    statusCode: number, 
    errorType: ErrorType = ErrorType.INTERNAL,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errorType = errorType;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Validation Error
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, ErrorType.VALIDATION, details);
  }
}

// Authentication Error
export class AuthenticationError extends AppError {
  constructor(message: string = 'Avtorizatsiya xatosi') {
    super(message, 401, ErrorType.AUTHENTICATION);
  }
}

// Authorization Error
export class AuthorizationError extends AppError {
  constructor(message: string = 'Ruxsat yo\'q') {
    super(message, 403, ErrorType.AUTHORIZATION);
  }
}

// Not Found Error
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resurs') {
    super(`${resource} topilmadi`, 404, ErrorType.NOT_FOUND);
  }
}

// Conflict Error
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, ErrorType.CONFLICT);
  }
}

// Prisma error handler
const handlePrismaError = (err: any): AppError => {
  // Unique constraint violation
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'field';
    return new ConflictError(`Bu ${field} allaqachon mavjud`);
  }

  // Foreign key constraint
  if (err.code === 'P2003') {
    return new ValidationError('Bog\'liq ma\'lumot topilmadi', {
      field: err.meta?.field_name
    });
  }

  // Record not found
  if (err.code === 'P2025') {
    return new NotFoundError('Ma\'lumot');
  }

  // Transaction conflict
  if (err.code === 'P2034') {
    return new AppError('Ma\'lumotlar bazasi band, qayta urinib ko\'ring', 503, ErrorType.DATABASE);
  }

  // Neon / connection errors — server ulanolmadi
  if (err.code === 'P1001' || err.code === 'P1002' || err.code === 'P1008' || err.code === 'P1009') {
    return new AppError(
      'Ma\'lumotlar bazasiga ulanib bo\'lmadi. Iltimos biroz kuting va qayta urinib ko\'ring.',
      503,
      ErrorType.DATABASE
    );
  }

  // Generic timeout
  const msg: string = err?.message || '';
  if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('connect')) {
    return new AppError(
      'Server vaqtinchalik yuklanmoqda, qayta urinib ko\'ring.',
      503,
      ErrorType.DATABASE
    );
  }

  return new AppError('Ma\'lumotlar bazasi xatosi', 500, ErrorType.DATABASE);
};

// JWT error handler
const handleJWTError = (err: any): AppError => {
  if (err.name === 'TokenExpiredError') {
    return new AuthenticationError('Token muddati tugagan');
  }
  if (err.name === 'JsonWebTokenError') {
    return new AuthenticationError('Noto\'g\'ri token');
  }
  return new AuthenticationError('Token xatosi');
};

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Default error
  let error: AppError = new AppError('Ichki server xatosi', 500);
  
  // Known error types
  if (err instanceof AppError) {
    error = err;
  } else if (err.name === 'PrismaClientKnownRequestError') {
    error = handlePrismaError(err);
  } else if (err.name?.includes('Token') || err.name === 'JsonWebTokenError') {
    error = handleJWTError(err);
  } else if (err.name === 'ValidationError' || err.name === 'ZodError') {
    error = new ValidationError(err.message);
  } else if (err.name === 'SyntaxError' && 'body' in err) {
    error = new ValidationError('Noto\'g\'ri JSON format');
  }

  // 📝 Structured logging
  const errorLog = {
    timestamp: new Date().toISOString(),
    type: error.errorType,
    statusCode: error.statusCode,
    message: error.message,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: (req as any).user?.id,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    details: error.details,
    isOperational: error.isOperational
  };

  // Log based on severity
  if (error.statusCode >= 500) {
    console.error('🔴 SERVER ERROR:', errorLog);
  } else if (error.statusCode >= 400) {
    console.warn('🟡 CLIENT ERROR:', errorLog);
  }

  // 🚨 Alert for critical errors (production)
  if (error.statusCode >= 500 && process.env.NODE_ENV === 'production') {
    // Here you would send alerts to monitoring services
    // e.g., Sentry, PagerDuty, etc.
  }

  // Send response with standard format
  const response: any = {
    success: false,
    error: error.message,
  };

  // Only include details for operational errors in development
  if (process.env.NODE_ENV === 'development') {
    if (error.details) {
      response.details = error.details;
    }
    if (err.stack) {
      response.stack = err.stack.split('\n').slice(0, 5);
    }
  }

  return res.status(error.statusCode).json(response);
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
