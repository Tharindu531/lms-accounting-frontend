// In-memory token store - keeps access token out of localStorage for security
let inMemoryToken = null;

export const getToken = () => inMemoryToken;
export const setToken = (token) => { inMemoryToken = token; };
export const clearToken = () => { inMemoryToken = null; };
