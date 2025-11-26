import React, { useEffect, useState, useCallback } from "react";
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
    Alert, TextInput,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import {
    getUserActivities,
    deleteActivity,
    getActivityTypes,
    updateActivity,
    getAlLParticipantsOfPost
} from "@/services/api";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import ParticipantsModal from "@/components/ParticipantsModal";
import UpdateActivityModal from "@/components/UpdateActivityModal";
import DeleteActivityModal from "@/components/DeleteActivityModal";

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
    //Modal Variables
    const [editVisible, setEditVisible] = useState(false);
    const [editText, setEditText] = useState("");
    const [editPostId, setEditPostId] = useState<number | null>(null);
    const [originalText, setOriginalText] = useState("");
    const hasChanged = editText.trim() !== originalText.trim();
    // State für Teilnehmer-Modal
    const [participantsModalVisible, setParticipantsModalVisible] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState<number | null>(null);

    // Toast Nachricht
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastType, setToastType] = useState<"success" | "error">("success");

    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [deletePostId, setDeletePostId] = useState<number | null>(null);

    useEffect(() => {
        const requestLocationPermission = async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                Alert.alert(
                    "Berechtigung benötigt",
                    "Die App benötigt Zugriff auf den Standort, um Orte anzuzeigen."
                );
            }
        };

        requestLocationPermission();
    }, []);



    const openEditModal = (activity: Activity) => {
        setEditPostId(activity.post_id);
        setEditText(activity.description || "");
        setOriginalText(activity.description || "");
        setEditVisible(true);
    };

    const showToast = (message: string, type: "success" | "error" = "success") => {
        setToastMessage(message);
        setToastType(type);

        setTimeout(() => {
            setToastMessage(null);
        }, 2500);
    };

    const handleConfirmDelete = async () => {
        if (deletePostId == null) return;

        try {
            await deleteActivity(deletePostId);
            showToast("Aktivität gelöscht!", "success");
            fetchActivities();
        } catch (err) {
            console.error(err);
            showToast("Fehler beim Löschen", "error");
        } finally {
            setDeleteModalVisible(false);
            setDeletePostId(null);
        }
    };


    const saveEdit = async () => {
        if (editPostId == null || !hasChanged) return;

        try {
            await updateActivity(editPostId, { description: editText }); // 5 Sekunden
            showToast("Aktivität erfolgreich aktualisiert! 🎉", "success");
        } catch (err) {
            console.error("Fehler beim Bearbeiten:", err);
            showToast("Fehler beim Bearbeiten ❌", "error");
        } finally {
            // Modal schließen IMMER, egal ob success oder error
            setEditVisible(false);
            // Optional: Fetch erneut, falls du willst
            fetchActivities();
        }
    };


    const handleParticipants = (activity: Activity) => {
        setSelectedPostId(activity.post_id);
        setParticipantsModalVisible(true);
    };





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

                        const locationName =
                            place?.city ||
                            place?.region ||
                            place?.name ||
                            place?.street ||
                            `${round(a.latitude)}, ${round(a.longitude)}`;

                        if (isMounted) {
                            setLocations(prev => ({
                                ...prev,
                                [a.post_id]: locationName,
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


        const handleDeletePress = (postId: number) => {
            setDeletePostId(postId);
            setDeleteModalVisible(true);
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




                <View style={styles.bottomRow}>
                    { !isPast ? (
                        <>
                            <TouchableOpacity
                                style={styles.editButton}
                                onPress={() => openEditModal(item)}
                            >
                                <Text style={styles.buttonText}>Bearbeiten</Text>
                            </TouchableOpacity>

                            {/* Nur für aktive Aktivitäten anzeigen */}
                            <TouchableOpacity
                                style={styles.participantsButton}
                                onPress={() => handleParticipants(item)}
                            >
                                <Text style={styles.buttonText}>Teilnehmer</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        // Platzhalter, der gleiche Breite wie die beiden Buttons hat
                        <View style={{ flexDirection: "row" }}>
                            <View style={[styles.editButton, { backgroundColor: "transparent" }]} />
                            <View style={[styles.participantsButton, { backgroundColor: "transparent" }]} />
                        </View>
                    )}


                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeletePress(item.post_id)}
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

            <DeleteActivityModal
                visible={deleteModalVisible}
                onClose={() => setDeleteModalVisible(false)}
                onConfirm={handleConfirmDelete}
            />


            <UpdateActivityModal
                visible={editVisible}
                text={editText}
                onChangeText={setEditText}
                onClose={() => setEditVisible(false)}
                onSave={saveEdit}
                hasChanged={hasChanged}
            />


            {selectedPostId !== null && (
                <ParticipantsModal
                    visible={participantsModalVisible}
                    postId={selectedPostId}
                    onClose={() => setParticipantsModalVisible(false)}
                />
            )}




            {toastMessage && (
                <View
                    style={[
                        styles.toast,
                        toastType === "success" ? styles.toastSuccess : styles.toastError
                    ]}
                >
                    <Text style={styles.toastText}>{toastMessage}</Text>
                </View>
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
    modalOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalBox: {
        backgroundColor: "#fff",
        padding: 20,
        borderRadius: 10,
        width: "100%",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 10,
    },
    modalInput: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 10,
        height: 100,
        textAlignVertical: "top",
        fontSize: 16,
        marginBottom: 20,
    },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    modalButton: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 6,
    },
    modalButtonText: {
        color: "white",
        fontWeight: "700",
        fontSize: 16,
    },
    toast: {
        position: "absolute",
        top: 60,
        left: 20,
        right: 20,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 5,
    },

    toastSuccess: {
        backgroundColor: "#28a745",
    },

    toastError: {
        backgroundColor: "#dc3545",
    },

    toastText: {
        color: "white",
        fontSize: 16,
        textAlign: "center",
        fontWeight: "600",
    },

    participantsButton: {
        backgroundColor: "#28a745", // grün
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
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
