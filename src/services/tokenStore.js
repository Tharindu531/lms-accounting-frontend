// In-memory token store keeps access tokens out of persistent browser storage.
let inMemoryToken = null;

export const getToken = () => inMemoryToken;

export const setToken = (token) => {
  inMemoryToken = token;
};

export const clearToken = () => {
  inMemoryToken = null;
};
