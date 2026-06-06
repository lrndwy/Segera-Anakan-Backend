import type { PaginationMeta } from './response';

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

export type PaginationInput = {
  page?: number | undefined;
  limit?: number | undefined;
};

export type PaginationParams = {
  page: number;
  limit: number;
  offset: number;
};

export const normalizePagination = (input: PaginationInput): PaginationParams => {
  const page = Math.max(input.page ?? DEFAULT_PAGE, 1);
  const rawLimit = input.limit ?? DEFAULT_LIMIT;
  const limit = Math.min(Math.max(rawLimit, 1), MAX_LIMIT);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
};

export const buildPaginationMeta = (input: { page: number; limit: number; totalItems: number }): PaginationMeta => ({
  page: input.page,
  limit: input.limit,
  total_items: input.totalItems,
  total_pages: input.totalItems === 0 ? 0 : Math.ceil(input.totalItems / input.limit),
});
