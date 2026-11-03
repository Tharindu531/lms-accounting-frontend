/** The message to show for a failed API call: the server's message when it sent one. */
export const errorMessage = (err, fallback = 'Something went wrong. Check your connection and try again.') => {
  if (!err) return fallback;
  if (err.code === 'ECONNABORTED') return 'The server took too long to respond. Try again.';
  if (!err.response) return 'Can\'t reach the server. Check your internet connection.';
  const d = err.response.data;
  if (d?.data && typeof d.data === 'object' && !Array.isArray(d.data)) {
    const first = Object.values(d.data).find((v) => typeof v === 'string');
    if (first) return first;
  }
  return d?.message || d?.error || fallback;
};
