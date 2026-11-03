const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Nov 2026" for content tagged with a fee month, or null when it's free. */
export const periodLabel = (month, year) => (month ? `${SHORT[month - 1]} ${year ?? ''}`.trim() : null);
