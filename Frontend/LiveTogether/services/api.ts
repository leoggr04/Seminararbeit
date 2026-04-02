import axios from "axios";
import * as SecureStore from "expo-secure-store";

const API_BASE_URL = "https://217.154.6.104:9000/api";
const WS_BASE_URL = API_BASE_URL.replace(/^http/, "ws");

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

export const clearStoredAuth = async () => {
    await SecureStore.deleteItemAsync("authToken");
    await SecureStore.deleteItemAsync("refreshToken");
    await SecureStore.deleteItemAsync("userId");
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

export const getChatParticipants = async (chatId: number) => {
    const res = await api.get(`/chats/${chatId}/participants`);
    return res.data.data;
}

export const connectToChatUpdates = async (
    chatId: number,
    onEvent: (payload: any) => void
) => {
    const token = await getAuthToken();
    const url = `${WS_BASE_URL}/ws/chats/${chatId}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    const socket = new WebSocket(url);

    socket.onmessage = (event) => {
        try {
            onEvent(JSON.parse(event.data));
        } catch {
            onEvent(event.data);
        }
    };

    socket.onerror = (event) => {
        console.log("[WS] chat socket error", event);
    };

    return socket;
};

export const connectToChatsUpdates = async (onEvent: (payload: any) => void) => {
    const token = await getAuthToken();
    const url = `${WS_BASE_URL}/ws/chats${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    const socket = new WebSocket(url);

    socket.onmessage = (event) => {
        try {
            onEvent(JSON.parse(event.data));
        } catch {
            onEvent(event.data);
        }
    };

    socket.onerror = (event) => {
        console.log("[WS] chats socket error", event);
    };

    return socket;
};
