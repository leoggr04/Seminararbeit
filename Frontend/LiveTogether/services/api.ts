import axios from "axios";
import * as SecureStore from "expo-secure-store"


const API_BASE_URL = "http://192.168.0.100:3000/api";

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { "Content-Type": "application/json" },
});

// === AUTH ROUTES ===
export const registerUser = (first_name: string, last_name: string, email: string,  password: string) => {
    return api.post("/auth/register", { first_name, last_name, email, password });
};

export const loginUser = (email: string, password: string) => {
    return api.post("/auth/login", { email, password });
};

export const refreshToken = (refreshToken: string) => {
    return api.post("/auth/refresh", { refreshToken });
};

export const logoutUser = (token) => {
    return api.post("/auth/logout", { token });
};

export const getUserById = (id) => {
    return api.get(`/users/${id}`);
}

// === PASSWORD RESET ===
export const requestPasswordReset = (email) => {
    return api.post("/users/request-reset", { email });
};

export const resetPassword = (token, newPassword) => {
    return api.post("/users/reset", { token, newPassword });
};

// ----------------------------- Aktivitäten API ------------------------------------------------------
const getAuthToken = async () => {
    return await SecureStore.getItemAsync("authToken");
};

// ✅ Aktivitätstypen abrufen
export const getActivityTypes = async () => {
    const token = await getAuthToken();
    const res = await axios.get(`${API_BASE_URL}/activities/types`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data.data; // Array von ActivityTypes
};

// ✅ Neue Aktivität erstellen
export const createActivity = async (activity: {
    activity_type_id: number;
    description: string;
    start_time: string;
    end_time: string;
    latitude: number;
    longitude: number;
    status?: string;
}) => {
    const token = await getAuthToken();
    const res = await axios.post(`${API_BASE_URL}/activities/posts`, activity, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
};

// ✅ Alle Aktivitäten abrufen
export const getAllActivities = async () => {
    const token = await getAuthToken();
    const res = await axios.get(`${API_BASE_URL}/activities/posts`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data.data; // Array von ActivityPosts
};

// ✅ Aktivitäten eines Users abrufen
export const getUserActivities = async (userId: string) => {
    const token = await getAuthToken();
    const res = await axios.get(`${API_BASE_URL}/activities/user/${userId}/posts`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data.data;
};

// ✅ Post löschen
export const deleteActivity = async (postId: number) => {
    const token = await getAuthToken();
    const res = await axios.delete(`${API_BASE_URL}/activities/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
};

// ✅ Post updaten
export const updateActivity = async (postId: number, data: { description?: string; status?: string }) => {
    const token = await getAuthToken();
    const res = await axios.put(`${API_BASE_URL}/activities/posts/${postId}`, data, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
};
