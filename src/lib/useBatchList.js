import { useQuery } from '@tanstack/react-query';
import { batchAPI } from '../services/api';
import { unwrap } from './queryClient';

/** All batches, newest first, plus a batchId -> name map. */
export const useBatchList = () => {
  const q = useQuery({ queryKey: ['admin', 'batches'], queryFn: () => batchAPI.getAll().then(unwrap) });
  const list = [...(q.data ?? [])].sort((a, b) => b.batchNumber - a.batchNumber);
  return { ...q, list, names: Object.fromEntries(list.map((b) => [b.id, b.name])) };
};
