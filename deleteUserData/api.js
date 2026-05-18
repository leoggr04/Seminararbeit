const API_BASE_URL = "https://217.154.6.104:9000/api";

class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch {
    throw new ApiError("Netzwerkfehler", 0, null);
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  if (!response.ok) {
    const message = payload?.error || payload?.message || response.statusText || "Request failed";
    throw new ApiError(message, response.status, payload);
  }

  return payload;
}

export async function loginUser(email, password) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getUserByEmail(email, accessToken) {
  return request(`/users/by-email?email=${encodeURIComponent(email)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function deleteUserAccount(userId, accessToken) {
  return request(`/users/${userId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export function getFriendlyErrorMessage(error) {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return "Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung.";
    }

    if ([400, 401, 403, 404].includes(error.status)) {
      return "E-Mail oder Passwort ist falsch.";
    }

    if (error.status >= 500) {
      return "Der Server hat einen Fehler gemeldet. Bitte später erneut versuchen.";
    }
  }

  return "Unbekannter Fehler. Bitte später erneut versuchen.";
}

export function getDeleteErrorMessage(error) {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return "Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung.";
    }

    if (error.status === 403) {
      return "Dieser Account darf nicht gelöscht werden.";
    }

    if (error.status === 404) {
      return "Der Nutzer wurde nicht gefunden.";
    }

    if (error.status >= 500) {
      return "Der Server hat beim Löschen einen Fehler gemeldet.";
    }
  }

  return "Das Konto konnte nicht gelöscht werden.";
}

export { ApiError };