// In-memory token store keeps access tokens out of persistent browser storage.
let inMemoryToken = null;
let expiresAt = null;

// The JWT's own "exp" claim, so the app can renew the token shortly before it runs out.
const readExpiry = (token) => {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload));
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
};

export const getToken = () => inMemoryToken;

/** When the access token expires (ms since epoch), or null when unknown or signed out. */
export const getTokenExpiry = () => expiresAt;

export const setToken = (token) => {
  inMemoryToken = token;
  expiresAt = token ? readExpiry(token) : null;
};

export const clearToken = () => {
  inMemoryToken = null;
  expiresAt = null;
};