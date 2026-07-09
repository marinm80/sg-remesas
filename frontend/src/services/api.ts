import { useAuthStore } from '../store/useAuthStore.js';

const API_BASE_URL = '/api';

interface RequestOptions extends RequestInit {
  bodyData?: any;
}

export async function apiRequest(path: string, options: RequestOptions = {}): Promise<any> {
  const { token, logout } = useAuthStore.getState();

  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.bodyData) {
    if (options.bodyData instanceof FormData) {
      options.body = options.bodyData;
      // Nota: No poner 'Content-Type' al usar FormData, para que fetch configure automáticamente el boundary
    } else {
      headers.set('Content-Type', 'application/json');
      options.body = JSON.stringify(options.bodyData);
    }
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
  };

  const response = await fetch(`${API_BASE_URL}${path}`, fetchOptions);

  if (response.status === 401) {
    // Sesión expirada o token_version invalidado (BR-24)
    logout();
    if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register') && window.location.pathname !== '/') {
      window.location.href = '/login?error=session_expired';
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Sesión expirada.');
  }

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(responseData.message || `Error en la petición: ${response.status}`);
  }

  return responseData;
}
