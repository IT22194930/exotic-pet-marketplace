/**
 * Decode the JWT stored in localStorage and return its payload.
 * Returns null if there is no token or if the token is malformed.
 */
export function getAuthUser() {
  try {
    const token = localStorage.getItem("jwt");
    if (!token) return null;
    // JWT: header.payload.signature — payload is base64url-encoded JSON
    const base64url = token.split(".")[1];
    if (!base64url) return null;
    const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

/** Returns the role string from the current JWT, e.g. "buyer" | "seller" | "admin" */
export function getRole() {
  return getAuthUser()?.role ?? null;
}

/** Returns true when the stored JWT exists and is not yet expired */
export function isAuthenticated() {
  const user = getAuthUser();
  if (!user) return false;
  if (user.exp && Date.now() / 1000 > user.exp) {
    localStorage.removeItem("jwt");
    return false;
  }
  return true;
}
