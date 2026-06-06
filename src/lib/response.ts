export type ValidationErrorDetail = {
  field: string;
  message: string;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
};

export type SuccessResponse<T> = {
  success: true;
  message: string;
  data: T;
  meta?: PaginationMeta;
};

export type ErrorResponse = {
  success: false;
  message: string;
  errors?: ValidationErrorDetail[];
};

export const successResponse = <T>(message: string, data: T): SuccessResponse<T> => ({
  success: true,
  message,
  data,
});

export type PaginatedSuccessResponse<T> = {
  success: true;
  message: string;
  data: T;
  meta: PaginationMeta;
};

export const paginatedResponse = <T>(message: string, data: T[], meta: PaginationMeta): PaginatedSuccessResponse<T[]> => ({
  success: true,
  message,
  data,
  meta,
});

export const errorResponse = (message: string, errors?: ValidationErrorDetail[]): ErrorResponse => ({
  success: false,
  message,
  ...(errors && errors.length > 0 ? { errors } : {}),
});
