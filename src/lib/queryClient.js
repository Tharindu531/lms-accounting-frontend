import { QueryClient } from '@tanstack/react-query';

/**
 * Lists are cached for 30 s and shown instantly when you navigate back, then
 * refreshed in the background. Auth and validation errors are not retried.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: true,
      retry: (count, err) => {
        const s = err?.response?.status;
        if (s && s >= 400 && s < 500) return false;
        return count < 2;
      },
    },
  },
});

/** Unwraps the backend's { success, data } envelope. */
export const unwrap = (res) => res.data?.data;
