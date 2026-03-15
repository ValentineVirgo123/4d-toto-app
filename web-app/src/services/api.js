/**
 * Central API client for all web interactors.
 * Change BASE_URL here if the backend port changes.
 */
export const BASE_URL = 'http://localhost:3001/api';

async function request(method, path, body, isFormData = false) {
  const headers = {};
  if (!isFormData && body) headers['Content-Type'] = 'application/json';

  const token = localStorage.getItem('auth_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach backend — is the server running on port 3001?');
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Backend returned an unexpected response (HTTP ${res.status}). Please restart the backend server.`);
  }

  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

export const api = {
  get:      (path)              => request('GET',    path),
  post:     (path, body)        => request('POST',   path, body),
  postForm: (path, form)        => request('POST',   path, form, true),
  patch:    (path, body)        => request('PATCH',  path, body),
  delete:   (path)              => request('DELETE', path),
};
