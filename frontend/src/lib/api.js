const backendUrl = (process.env.REACT_APP_BACKEND_URL || "").trim();
const normalizedBackendUrl = backendUrl.endsWith("/")
  ? backendUrl.slice(0, -1)
  : backendUrl;

export const API = `${normalizedBackendUrl}/api`;
