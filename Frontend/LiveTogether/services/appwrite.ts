import { Client, Databases, ID, Query } from "react-native-appwrite";

// Environment Variablen
const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_ID!;
const PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!;

//Appwrite Client Setup
const client = new Client()
    .setEndpoint("https://cloud.appwrite.io/v1")
    .setProject(PROJECT_ID);

const database = new Databases(client);

// Marker Typ
export type MarkerType = {
    post_id?: number;          // ID vom Backend
    latitude: number;
    longitude: number;
    title?: string;            // z.B. activity type name
    description?: string;
    start_time: string;
    end_time: string;
    status?: string;
    emoji?: string;            // optional: kannst aus icon_url ableiten
};


// save Marker
export const createMarker = async (marker: MarkerType) => {
    try {
        const result = await database.createDocument(
            DATABASE_ID,
            COLLECTION_ID,
            ID.unique(),
            {
                latitude: marker.latitude,
                longitude: marker.longitude,
                title: marker.title || "Unbenannter Ort",
                description: marker.description || "",
                emoji: marker.emoji || "",
                userId: marker.userId || "",
                startDate: marker.startDate,
                endDate: marker.endDate,
            }
        );

        return result;
    } catch (error) {
        console.error("❌ Fehler beim Speichern des Markers:", error);
        throw error;
    }
};

// ✅ 2️⃣ Marker abrufen (optional gefiltert)
export const getMarkers = async (userId?: string) => {
    try {
        const queries = [];

        if (userId) {
            queries.push(Query.equal("userId", userId));
        }

        const result = await database.listDocuments(DATABASE_ID, COLLECTION_ID, queries);
        return result.documents as unknown as MarkerType[];
    } catch (error) {
        console.error("❌ Fehler beim Laden der Marker:", error);
        return [];
    }
};

// ✅ 3️⃣ Marker löschen (optional)
export const deleteMarker = async (markerId: string) => {
    try {
        await database.deleteDocument(DATABASE_ID, COLLECTION_ID, markerId);
        console.log("🗑️ Marker gelöscht:", markerId);
    } catch (error) {
        console.error("❌ Fehler beim Löschen des Markers:", error);
        throw error;
    }
};
