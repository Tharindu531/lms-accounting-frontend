/** Where each role lands after signing in. */
export const homeFor = (user) =>
  user?.userType === 'ADMIN' ? '/admin/dashboard' : user?.userType === 'INSTRUCTOR' ? '/admin/marking' : '/dashboard';
