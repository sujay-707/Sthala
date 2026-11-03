
const API = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

export function getToken() {
  return localStorage.getItem("sthala_token");
}

export async function request(path, options = {}) {
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(getToken()
      ? { Authorization: `Bearer ${getToken()}` }
      : {}),
    ...options.headers,
  };

  const response = await fetch(
    `${API}${path.startsWith("/") ? path : "/" + path}`,
    { ...options, headers },
  );

  const data = await response
    .json()
    .catch(() => ({ message: "Unexpected server response" }));

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}
