import axios from "axios";
import * as SecureStore from "expo-secure-store";

const API_BASE_URL = "http://192.168.0.100:3000/api";

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { "Content-Type": "application/json" },
});

// === Helper-Funktionen ===
const getAuthToken = async () => SecureStore.getItemAsync("authToken");
const getRefreshToken = async () => SecureStore.getItemAsync("refreshToken");

const saveTokens = async (accessToken: string, refreshToken: string) => {
    await SecureStore.setItemAsync("authToken", accessToken);
    await SecureStore.setItemAsync("refreshToken", refreshToken);
};

// === REQUEST INTERCEPTOR ===
api.interceptors.request.use(async (config) => {
    const token = await getAuthToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
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
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
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
                await SecureStore.deleteItemAsync("authToken");
                await SecureStore.deleteItemAsync("refreshToken");
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

// === PASSWORD RESET ===
export const requestPasswordReset = (email: string) =>
    api.post("/users/request-reset", { email });

export const resetPassword = (token: string, newPassword: string) =>
    api.post("/users/reset", { token, newPassword });

// === AKTIVITÄTEN ===
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

export const updateActivity = async (postId: number, data: { description?: string; status?: string }) => {
    const res = await api.put(`/activities/posts/${postId}`, data);
    return res.data;
};
