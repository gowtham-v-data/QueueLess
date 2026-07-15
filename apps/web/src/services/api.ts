import axios from 'axios';

const Api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 10000,
  withCredentials: true
});

const ACCESS_KEY = 'ql_access_token';
const savedToken = typeof window !== 'undefined' ? localStorage.getItem(ACCESS_KEY) : null;
if (savedToken) {
  Api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
}

export const setAuthToken = (token: string | null) => {
  if (token) {
    Api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem(ACCESS_KEY, token);
  } else {
    delete Api.defaults.headers.common['Authorization'];
    localStorage.removeItem(ACCESS_KEY);
  }
};

export default Api;
