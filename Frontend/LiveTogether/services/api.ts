import axios from "axios";
import * as SecureStore from "expo-secure-store";

const API_BASE_URL = "https://217.154.6.104:9000/api";
const WS_BASE_URL = API_BASE_URL.replace(/^http/, "ws");
const WS_ORIGIN = WS_BASE_URL.replace(/\/api\/?$/, "");
let wsPathPrefix = "/api/ws";

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { "Content-Type": "application/json" },
});

const isAuthRoute = (url?: string) => {
    if (!url) return false;

    return ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"].some((route) =>
        url.includes(route)
    );
};

// === Helper-Funktionen ===
const getAuthToken = async () => SecureStore.getItemAsync("authToken");
const getRefreshToken = async () => SecureStore.getItemAsync("refreshToken");

const saveTokens = async (accessToken: string, refreshToken: string) => {
    await SecureStore.setItemAsync("authToken", accessToken);
    await SecureStore.setItemAsync("refreshToken", refreshToken);
};

const parseJwtPayload = (token: string) => {
    try {
        const parts = token.split(".");
        if (parts.length < 2) return null;

        const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
        const json = atob(padded);
        return JSON.parse(json);
    } catch {
        return null;
    }
};

const isTokenNearExpiry = (token: string, skewSeconds = 30) => {
    const payload = parseJwtPayload(token);
    if (!payload || typeof payload.exp !== "number") return true;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp <= now + skewSeconds;
};

let wsRefreshInFlight: Promise<string | null> | null = null;

const buildWsUrl = (path: string, token: string | null) => {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${WS_ORIGIN}${wsPathPrefix}${cleanPath}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
};

const maybeFlipWsPrefixOn404 = (event: { reason?: string } | undefined) => {
    const reason = event?.reason || "";
    if (!reason.includes("404")) return;
    wsPathPrefix = wsPathPrefix === "/api/ws" ? "/ws" : "/api/ws";
    console.log("[WS] switched websocket prefix", wsPathPrefix);
};

const getValidWsAccessToken = async () => {
    const currentToken = await getAuthToken();
    if (currentToken && !isTokenNearExpiry(currentToken)) {
        return currentToken;
    }

    if (wsRefreshInFlight) {
        return wsRefreshInFlight;
    }

    wsRefreshInFlight = (async () => {
        try {
            const refreshToken = await getRefreshToken();
            if (!refreshToken) return null;

            const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
            const newAccessToken = res.data?.accessToken;
            const newRefreshToken = res.data?.refreshToken;
            if (!newAccessToken || !newRefreshToken) return null;

            await saveTokens(newAccessToken, newRefreshToken);
            api.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;
            return newAccessToken;
        } catch (error) {
            console.log("[WS] Token refresh failed", error);
            await clearStoredAuth();
            return null;
        } finally {
            wsRefreshInFlight = null;
        }
    })();

    return wsRefreshInFlight;
};

export const clearStoredAuth = async () => {
    await SecureStore.deleteItemAsync("authToken");
    await SecureStore.deleteItemAsync("refreshToken");
    await SecureStore.deleteItemAsync("userId");
    await SecureStore.deleteItemAsync("userEmail");
};

// === REQUEST INTERCEPTOR ===
api.interceptors.request.use(async (config) => {
    const token = await getAuthToken();
    const shouldAttachToken = !isAuthRoute(config.url);

    if (token && shouldAttachToken) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log("Das ist der token "+token);
    }
    const method = (config.method || "GET").toUpperCase();
    const url = `${config.baseURL || ""}${config.url || ""}`;
    console.log(`[API] ${method} ${url}`, config.data ?? null);
    return config;
});

// === RESPONSE INTERCEPTOR ===
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) prom.reject(error);
        else prom.resolve(token);
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => {
        const method = (response.config.method || "GET").toUpperCase();
        const url = `${response.config.baseURL || ""}${response.config.url || ""}`;
        console.log(`[API] ${response.status} ${method} ${url}`, response.data ?? null);
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        const shouldSkipRefresh = isAuthRoute(originalRequest?.url);

        if (error.response) {
            const method = (error.config?.method || "GET").toUpperCase();
            const url = `${error.config?.baseURL || ""}${error.config?.url || ""}`;
            console.log(`[API] ${error.response.status} ${method} ${url}`, error.response.data ?? null);
        } else {
            console.log("[API] Network/Request error", error.message);
        }

        if (error.response?.status === 401 && !shouldSkipRefresh && !originalRequest._retry) {
            if (isRefreshing) {
                // Warte auf laufenden Refresh
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return api(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const refreshToken = await getRefreshToken();
                if (!refreshToken) throw new Error("No refresh token available");

                // Token aktualisieren
                const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
                const newAccessToken = res.data.accessToken;
                const newRefreshToken = res.data.refreshToken;

                await saveTokens(newAccessToken, newRefreshToken);

                api.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;
                processQueue(null, newAccessToken);

                // Wiederhole ursprünglichen Request
                return api(originalRequest);
            } catch (err) {
                processQueue(err, null);
                // Optional: Logout erzwingen, wenn Refresh fehlschlägt
                await clearStoredAuth();
                return Promise.reject(err);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

// === AUTH ROUTES ===
export const registerUser = (first_name: string, last_name: string, email: string, password: string) =>
    api.post("/auth/register", { first_name, last_name, email, password });

export const loginUser = (email: string, password: string) =>
    api.post("/auth/login", { email, password });

export const refreshAccessToken = (refreshToken: string) =>
    api.post("/auth/refresh", { refreshToken }); // ⚠️ umbenannt, damit es nicht mit der Funktion oben kollidiert

export const logoutUser = (token: string) =>
    api.post("/auth/logout", { token });

export const getUserById = (id: string) =>
    api.get(`/users/${id}`);

export const getUserByEmail = (email: string) =>
    api.get(`/users/by-email?email=${encodeURIComponent(email)}`);

// === PASSWORD RESET ===
export const requestPasswordReset = (email: string) =>
    api.post("/users/request-reset", { email });

export const resetPassword = (token: string, newPassword: string) =>
    api.post("/users/reset", { token, newPassword });

//=========================================================================
//  AKTIVITÄTEN
//=========================================================================
// Alle folgenden Calls nutzen automatisch den Token durch den Interceptor ✅

export const getActivityTypes = async () => {
    const res = await api.get("/activities/types");
    return res.data.data;
};

export const createActivity = async (activity: {
    activity_type_id: number;
    description: string;
    start_time: string;
    end_time: string;
    latitude: number;
    longitude: number;
    status?: string;
}) => {
    const res = await api.post("/activities/posts", activity);
    return res.data;
};

export const getAllActivities = async () => {
    const res = await api.get("/activities/posts");
    return res.data.data;
};

export const getUserActivities = async (userId: string) => {
    const res = await api.get(`/activities/user/${userId}`);
    return res.data.data;
};

export const deleteActivity = async (postId: number) => {
    const res = await api.delete(`/activities/posts/${postId}`);
    return res.data;
};

export const updateActivity = async (
    postId: number,
    data: {
        activity_type_id?: number;
        description?: string;
        start_time?: string;
        end_time?: string;
        latitude?: number;
        longitude?: number;
        status?: string;
    }
) => {
    const res = await api.put(`/activities/posts/${postId}`, data);
    return res.data;
};

export const getAlLParticipantsOfPost = async (postId: number) => {
    const res = await api.get(`/activities/posts/${postId}/participants`);
    return res.data.data;
}
export const joinActivity = async (postId:number)=>{
    const res = await api.post(`/activities/posts/${postId}/join`);
    return res.data;
}
export const leaveActivity = async (postId:number)=>{
    const res = await api.post(`/activities/posts/${postId}/leave`);
    return res.data;
}

export const getAllSelfActivities = async() =>{
    const res = await api.get("/activities/self");
    return res.data.data;
}

export const removeParticipantFromActivity = async (postId:number, userId:number) =>{
    const res = await api.delete(`/activities/posts/${postId}/participants/${userId}`);
    return res.data;
}

//=======================================================================
//  dashboard data access
//=======================================================================
export const getDashboardSummary = async (days: number = 30) => {
    const res = await api.get(`/dashboard/summary?days=${days}`);
    return res.data.data;
};

export const getDashboardEvents = async (params?: {
    limit?: number;
    offset?: number;
    eventType?: string;
    from?: string;
    to?: string;
}) => {
    const search = new URLSearchParams();

    if (params?.limit != null) search.set("limit", String(params.limit));
    if (params?.offset != null) search.set("offset", String(params.offset));
    if (params?.eventType) search.set("eventType", params.eventType);
    if (params?.from) search.set("from", params.from);
    if (params?.to) search.set("to", params.to);

    const query = search.toString();
    const res = await api.get(`/dashboard/events${query ? `?${query}` : ""}`);
    return res.data.data;
};

//=========================================================================
//  chat
//=========================================================================
export const createNewChat = async (chat_name: string, participantIds: number[])=>{
    const res = await api.post("/chats", { chat_name, participantIds });
    return res.data;
}

export const listChats = async() =>{
    const res = await api.get("/chats");
    return res.data.data;
}

export const addParticipantToChat = async (chatId:number,userId:number)=>{
    const res = await api.post(`/chats/${chatId}/participants`, {userId});
    return res.data;
}

export const listChatParticipants = async(chatId:number) =>{
    const res = await api.get(`/chats/${chatId}/participants`);
    return res.data.data;
}

export const deleteChatParticipant = async (chatId:number, userId:number) =>{
    const res = await api.delete(`/chats/${chatId}/participants/${userId}`);
    return res.data;
}

export const sendMessage = async (chatId:number,content:string) => {
    const res = await api.post(`/chats/${chatId}/messages`, {content});
    return res.data;
}

export const listChatMessages = async(chatId:number) =>{
    const res = await api.get(`/chats/${chatId}/messages`);
    return res.data.data;
}

export const markChatAsRead = async (chatId: number) => {
    const res = await api.post(`/chats/${chatId}/read`);
    return res.data.data;
};

export const getChatParticipants = async (chatId: number) => {
    const res = await api.get(`/chats/${chatId}/participants`);
    return res.data.data;
}

export const connectToChatUpdates = async (
    chatId: number,
    onEvent: (payload: any) => void
) => {
    const token = await getValidWsAccessToken();
    const url = buildWsUrl(`/chats/${chatId}`, token);
    const socket = new WebSocket(url);

    socket.onopen = () => {
        console.log("[WS] chat socket connected", { chatId, url });
    };

    socket.onmessage = (event) => {
        try {
            const parsed = JSON.parse(event.data);
            if (parsed?.type === "connected") {
                console.log("[WS] chat handshake confirmed", parsed);
            }
            onEvent(parsed);
        } catch {
            onEvent(event.data);
        }
    };

    socket.onerror = (event) => {
        console.log("[WS] chat socket error", event);
    };

    socket.onclose = (event) => {
        maybeFlipWsPrefixOn404(event);
    };

    return socket;
};

export const connectToChatsUpdates = async (onEvent: (payload: any) => void) => {
    const token = await getValidWsAccessToken();
    const url = buildWsUrl("/chats", token);
    const socket = new WebSocket(url);

    socket.onopen = () => {
        console.log("[WS] chats socket connected", { url });
    };

    socket.onmessage = (event) => {
        try {
            const parsed = JSON.parse(event.data);
            if (parsed?.type === "connected") {
                console.log("[WS] chats handshake confirmed", parsed);
            }
            onEvent(parsed);
        } catch {
            onEvent(event.data);
        }
    };

    socket.onerror = (event) => {
        console.log("[WS] chats socket error", event);
    };

    socket.onclose = (event) => {
        maybeFlipWsPrefixOn404(event);
    };

    return socket;
};
