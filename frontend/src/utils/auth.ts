export let accessToken = '';

export function setAccessToken(token: string) {
  accessToken = token;
}

export const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  if (!accessToken) {
    try {
      const refreshRes = await fetch(`${backendUrl}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (refreshRes.ok) {
        const { data } = await refreshRes.json();
        setAccessToken(data.accessToken);
      }
    } catch (e) {
      // ignore
    }
  }

  const withAuth = (options: RequestInit) => ({
    ...options,
    credentials: 'include' as RequestCredentials,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  let res = await fetch(input, withAuth(init));
  
  if (res.status === 401) {
    const refreshRes = await fetch(`${backendUrl}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!refreshRes.ok) {
      setAccessToken('');
      throw new Error('Session expired');
    }

    const { data } = await refreshRes.json();
    setAccessToken(data.accessToken);

    res = await fetch(input, withAuth(init));
  }
  
  return res;
}
