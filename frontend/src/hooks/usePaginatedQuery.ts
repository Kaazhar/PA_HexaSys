import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

interface UsePaginatedQueryOptions<T> {
  queryKey: unknown[];
  queryFn: (params: { page: number; limit: number }) => Promise<{ data: any }>;
  select: (data: any) => { items: T[]; total: number };
  limit?: number;
}

export function usePaginatedQuery<T>({
  queryKey,
  queryFn,
  select,
  limit = 10,
}: UsePaginatedQueryOptions<T>) {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: [...queryKey, page],
    queryFn: () => queryFn({ page, limit }),
  });

  const result = data ? select(data.data) : { items: [] as T[], total: 0 };
  const totalPages = Math.ceil(result.total / limit);

  return {
    items: result.items,
    total: result.total,
    totalPages,
    isLoading,
    page,
    setPage,
  };
}
