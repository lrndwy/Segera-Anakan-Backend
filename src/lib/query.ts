import { z } from 'zod';

import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT, normalizePagination } from './pagination';

export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');

export const queryParamsSchema = z.object({
  search: z.string().trim().optional(),
  sort_by: z.string().trim().optional(),
  sort_order: sortOrderSchema.optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).optional(),
});

export type QueryParams = z.infer<typeof queryParamsSchema>;

export type ParsedQueryParams = {
  search?: string | undefined;
  sortBy?: string | undefined;
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
  offset: number;
};

export const parseQueryParams = (input: Record<string, string | string[] | undefined>): ParsedQueryParams => {
  const parsed = queryParamsSchema.parse({
    search: getFirstValue(input.search),
    sort_by: getFirstValue(input.sort_by),
    sort_order: getFirstValue(input.sort_order),
    page: getFirstValue(input.page),
    limit: getFirstValue(input.limit),
  });

  const pagination = normalizePagination({
    page: parsed.page ?? DEFAULT_PAGE,
    limit: parsed.limit ?? DEFAULT_LIMIT,
  });

  return {
    ...(parsed.search ? { search: parsed.search } : {}),
    ...(parsed.sort_by ? { sortBy: parsed.sort_by } : {}),
    sortOrder: parsed.sort_order ?? 'desc',
    page: pagination.page,
    limit: pagination.limit,
    offset: pagination.offset,
  };
};

const getFirstValue = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};
