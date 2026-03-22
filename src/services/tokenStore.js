// In-memory token store - keeps access token out of localStorage for security.
// sessionStorage is used as a fallback so tokens survive page refresh but not tab close.
let inMemoryToken = null;

export const getToken = () => {
  if (!inMemoryToken) {
    inMemoryToken = sessionStorage.getItem('_t'); // restore from sessionStorage on refresh
  }
  return inMemoryToken;
};

export const setToken = (token) => {
  inMemoryToken = token;
  sessionStorage.setItem('_t', token); // sessionStorage survives refresh, not tab close
};

export const clearToken = () => {
  inMemoryToken = null;
  sessionStorage.removeItem('_t');
};
