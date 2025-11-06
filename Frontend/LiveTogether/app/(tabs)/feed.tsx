import React, { useEffect, useState, useCallback } from "react";
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
    Alert,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import {getUserActivities, deleteActivity, getActivityTypes} from "@/services/api";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";

type Activity = {
    post_id: number;
    activity_type_id: number;
    description: string;
    start_time: string;
    end_time: string;
    latitude: number;
    longitude: number;
    status: string;
    created_at: string;
    user_id: number;
};

const Feed: React.FC = () => {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [locations, setLocations] = useState<{ [post_id: number]: string }>({});
    const router = useRouter();
    const now = new Date();
    const [activityTypes, setActivityTypes] = useState<{ [id: number]: { name: string; icon_url: string | null } }>({});


    const activeActivities = activities.filter(a => new Date(a.end_time) > now);
    const pastActivities = activities.filter(a => new Date(a.end_time) <= now);

    const displayActivities: (Activity | { type: "divider" })[] = [
        ...activeActivities,
        ...(pastActivities.length > 0 ? [{ type: "divider" }] : []),
        ...pastActivities,
    ];

    useEffect(() => {
        const fetchActivityTypes = async () => {
            try {
                const types = await getActivityTypes(); // ruft die API auf
                const map: { [id: number]: { name: string; icon_url: string | null } } = {};
                types.forEach((t: any) => {
                    map[t.activity_type_id] = { name: t.name, icon_url: t.icon_url };
                });
                setActivityTypes(map);
            } catch (err) {
                console.error("Fehler beim Laden der Activity Types:", err);
            }
        };

        fetchActivityTypes();
    }, []);

    const fetchActivities = useCallback(async () => {
        setError(null);
        try {
            setLoading(true);
            const userId = await SecureStore.getItemAsync("userId");
            if (!userId) {
                setError("Kein Benutzer gefunden. Bitte einloggen.");
                setActivities([]);
                return;
            }

            const data = await getUserActivities(userId);
            setActivities(Array.isArray(data) ? data : []);
        } catch (err: any) {
            console.error("Fehler beim Laden der Aktivitäten:", err);
            setError(err?.response?.data?.message || err?.message || "Ladefehler");
            setActivities([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            fetchActivities();
        }, [])
    );

    useEffect(() => {
        let isMounted = true;

        const fetchLocations = async () => {
            for (const a of activities) {
                if (!locations[a.post_id]) {
                    try {
                        const [place] = await Location.reverseGeocodeAsync({
                            latitude: a.latitude,
                            longitude: a.longitude,
                        });
                        if (isMounted) {
                            setLocations(prev => ({
                                ...prev,
                                [a.post_id]: place?.city || place?.region || `${round(a.latitude)}, ${round(a.longitude)}`,
                            }));
                        }
                    } catch (err) {
                        if (isMounted) {
                            setLocations(prev => ({
                                ...prev,
                                [a.post_id]: `${round(a.latitude)}, ${round(a.longitude)}`,
                            }));
                        }
                    }
                }
            }
        };

        fetchLocations();

        return () => {
            isMounted = false;
        };
    }, [activities]);


    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await fetchActivities();
        } finally {
            setRefreshing(false);
        }
    }, [fetchActivities]);

    const renderItem = ({ item }: { item: Activity | { type: "divider" } }) => {
        if ("type" in item && item.type === "divider") {
            return (
                <View style={styles.divider}>
                    <Text style={styles.dividerText}>Vergangene Aktivitäten</Text>
                </View>
            );
        }

        const isPast = new Date(item.end_time) <= now;
        const statusText = isPast ? "Abgeschlossen" : capitalize(item.status);
        const statusColor = isPast ? "#28a745" : "#007bff";

        const handleDelete = () => {
            Alert.alert(
                "Aktivität löschen",
                "Willst du diese Aktivität wirklich löschen?",
                [
                    { text: "Abbrechen", style: "cancel" },
                    {
                        text: "Ja",
                        style: "destructive",
                        onPress: async () => {
                            try {
                                await deleteActivity(item.post_id);
                                fetchActivities();
                            } catch (err) {
                                console.error("Fehler beim Löschen:", err);
                            }
                        },
                    },
                ]
            );
        };

        return (
            <TouchableOpacity style={styles.card} onPress={() => {}}>
                <View style={{ opacity: isPast ? 0.5 : 1 }}>
                    {/* Alles, was ausgegraut werden soll */}
                    <View style={styles.row}>
                        <Text style={styles.title}>
                            {isEmoji(activityTypes[item.activity_type_id]?.icon_url)
                                ? `${activityTypes[item.activity_type_id]?.icon_url} `
                                : "📍"}
                            {activityTypes[item.activity_type_id]?.name} am {formatDateShort(item.start_time)}
                        </Text>

                        <Text style={[styles.status, { color: statusColor }]}>{statusText}</Text>
                    </View>
                    <Text style={styles.description}>
                        {item.description?.length ? item.description : "Keine Beschreibung"}
                    </Text>
                    <View style={styles.metaRow}>
                        <Text style={styles.metaText}>Start: {formatDateTime(item.start_time)}</Text>
                        <Text style={styles.metaText}>Ende: {formatDateTime(item.end_time)}</Text>
                    </View>
                    <Text style={[styles.metaText, { marginTop: 8 }]}>
                        Standort: {locations[item.post_id] || `${round(item.latitude)}, ${round(item.longitude)}`}
                    </Text>
                </View>




                {/* Untere Zeile: Bearbeiten links, Status rechts */}
                <View style={styles.bottomRow}>
                    { !isPast ? (
                        <TouchableOpacity style={styles.editButton}>
                            <Text style={styles.buttonText}>Bearbeiten</Text>
                        </TouchableOpacity>
                    ) : (
                        // Platzhalter, der gleiche Breite wie der Button hat
                        <View style={[styles.editButton, { backgroundColor: "transparent" }]} />
                    )}

                    <TouchableOpacity
                        onPress={handleDelete}
                        style={styles.deleteButton}
                    >
                        <Text style={styles.buttonText}>Löschen</Text>
                    </TouchableOpacity>
                </View>

            </TouchableOpacity>
        );
    };


    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Meine Aktivitäten</Text>

            {error ? (
                <View style={styles.center}>
                    <Text style={{ color: "red", marginBottom: 8 }}>{error}</Text>
                    <Text onPress={fetchActivities} style={{ color: "blue" }}>
                        Nochmals versuchen
                    </Text>
                </View>
            ) : activities.length === 0 ? (
                <View style={styles.center}>
                    <Text>Keine Aktivitäten gefunden.</Text>
                </View>
            ) : (
                <FlatList
                    data={displayActivities}
                    keyExtractor={(item, index) =>
                        "type" in item ? `divider-${index}` : String(item.post_id)
                    }
                    renderItem={renderItem}
                    ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                />
            )}
        </View>
    );
};

export default Feed;

/* ---------- Hilfsfunktionen & Styles ---------- */

function formatDateTime(iso?: string) {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleString("de-DE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatDateShort(iso?: string) {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleDateString("de-DE"); // bleibt gleich
}


function round(num?: number) {
    if (num == null) return "-";
    return Math.round(num * 100000) / 100000;
}

function capitalize(s?: string) {
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// Hilfsfunktion, um zu checken, ob ein String ein Emoji ist
function isEmoji(str: string | null | undefined): boolean {
    if (!str) return false;
    // Einfacher Regex-Check für Unicode-Emojis
    return /\p{Emoji}/u.test(str);
}


const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f8f9fa", paddingTop: 80, paddingHorizontal: 20 },
    header: { fontSize: 28, fontWeight: "700", marginBottom: 20, textAlign: "center" },
    center: { alignItems: "center", justifyContent: "center" },
    card: {
        backgroundColor: "#fff",
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e6e6e6",
        shadowColor: "#000",
        shadowOpacity: 0.03,
        shadowRadius: 8,
    },
    title: { fontSize: 16, fontWeight: "700" },
    description: { marginTop: 8, fontSize: 15, color: "#333" },
    metaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
    metaText: { fontSize: 13, color: "#666" },
    metaSmall: { marginTop: 8, fontSize: 12, color: "#888" },
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    status: { fontSize: 12, textTransform: "capitalize", color: "#007bff" },
    divider: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#f0f0f0", borderRadius: 8, marginVertical: 8 },
    dividerText: { fontWeight: "700", color: "#555", textAlign: "center" },
    deleteButton: {
        backgroundColor: "red",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    editButton: {
        backgroundColor: "#007bff",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    buttonText: {
        color: "white",
        fontWeight: "700",
        fontSize: 14,
    },
    bottomRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 8,
    },

});
