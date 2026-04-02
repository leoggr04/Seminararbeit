import DeleteActivityModal from "@/components/DeleteActivityModal";
import ParticipantsModal from "@/components/ParticipantsModal";
import UpdateActivityModal from "@/components/UpdateActivityModal";
import {
    deleteActivity,
    getActivityTypes,
    getAllSelfActivities,
    leaveActivity,
    updateActivity
} from "@/services/api";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

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
    // Modal Variables
    const [editVisible, setEditVisible] = useState(false);
    const [editPostId, setEditPostId] = useState<number | null>(null);

    const [editDescription, setEditDescription] = useState("");
    const [editActivityTypeId, setEditActivityTypeId] = useState<number | null>(null);
    const [editStartDate, setEditStartDate] = useState<Date>(new Date());
    const [editEndDate, setEditEndDate] = useState<Date>(new Date());
    const [editLatitude, setEditLatitude] = useState<string>("");
    const [editLongitude, setEditLongitude] = useState<string>("");

    const [originalEditValues, setOriginalEditValues] = useState<{
        activity_type_id: number;
        description: string;
        start_time: string;
        end_time: string;
        latitude: number;
        longitude: number;
    } | null>(null);

    const hasChanged = Boolean(
        originalEditValues &&
        (editDescription.trim() !== originalEditValues.description.trim() ||
            editActivityTypeId !== originalEditValues.activity_type_id ||
            editStartDate.toISOString() !== originalEditValues.start_time ||
            editEndDate.toISOString() !== originalEditValues.end_time ||
            Number(editLatitude) !== originalEditValues.latitude ||
            Number(editLongitude) !== originalEditValues.longitude)
    );

    // State für Teilnehmer-Modal
    const [participantsModalVisible, setParticipantsModalVisible] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState<number | null>(null);

    // Toast Nachricht
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastType, setToastType] = useState<"success" | "error">("success");

    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [deletePostId, setDeletePostId] = useState<number | null>(null);
    const [leaveModalVisible, setLeaveModalVisible] = useState(false);
    const [leavePostId, setLeavePostId] = useState<number | null>(null);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);

    useEffect(() => {
        const loadUserId = async () => {
            const storedId = await SecureStore.getItemAsync("userId");
            if (storedId) setCurrentUserId(Number(storedId));
        };
        loadUserId();
    }, []);

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
        setEditDescription(activity.description || "");
        setEditActivityTypeId(activity.activity_type_id);
        setEditStartDate(new Date(activity.start_time));
        setEditEndDate(new Date(activity.end_time));
        setEditLatitude(String(activity.latitude));
        setEditLongitude(String(activity.longitude));
        setOriginalEditValues({
            activity_type_id: activity.activity_type_id,
            description: activity.description || "",
            start_time: activity.start_time,
            end_time: activity.end_time,
            latitude: activity.latitude,
            longitude: activity.longitude,
        });
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

        const activityToDelete = activities.find(a => a.post_id === deletePostId);
        if (activityToDelete && currentUserId != null && activityToDelete.user_id !== currentUserId) {
            showToast("Nur Ersteller dürfen löschen", "error");
            setDeleteModalVisible(false);
            setDeletePostId(null);
            return;
        }

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
            const payload: any = {
                description: editDescription,
                start_time: editStartDate.toISOString(),
                end_time: editEndDate.toISOString(),
                latitude: Number(editLatitude),
                longitude: Number(editLongitude),
            };

            if (editActivityTypeId != null) {
                payload.activity_type_id = editActivityTypeId;
            }
            if (Number.isNaN(payload.latitude)) delete payload.latitude;
            if (Number.isNaN(payload.longitude)) delete payload.longitude;

            await updateActivity(editPostId, payload);
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

    const handleLeavePress = (postId: number) => {
        setLeavePostId(postId);
        setLeaveModalVisible(true);
    };

    const handleConfirmLeave = async () => {
        if (leavePostId == null) return;

        try {
            await leaveActivity(leavePostId);
            showToast("Aktivität verlassen", "success");
            fetchActivities();
        } catch (err) {
            console.error("Fehler beim Verlassen:", err);
            showToast("Verlassen fehlgeschlagen", "error");
        } finally {
            setLeaveModalVisible(false);
            setLeavePostId(null);
        }
    };





    const activeActivities = activities.filter(a => new Date(a.end_time) > now);
    const pastActivities = activities.filter(a => new Date(a.end_time) <= now);

    const dividerItem = { type: "divider" } as const;
    const displayActivities: (Activity | typeof dividerItem)[] = [
        ...activeActivities,
        ...(pastActivities.length > 0 ? [dividerItem] : []),
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

            const data = await getAllSelfActivities();
            setActivities(Array.isArray(data) ? data : []);

        } catch (err: any) {
            console.error("Fehler beim Laden der Aktivitäten:", err);
            setError(
                err?.response?.data?.message ||
                err?.message ||
                "Ladefehler"
            );
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

    const isDividerItem = (item: Activity | { type: "divider" }): item is { type: "divider" } => {
        return (item as any).type === "divider";
    };

    const goToActivityOnMap = (activity: Activity) => {
        const isPastActivity = new Date(activity.end_time) <= new Date();
        if (isPastActivity) return;

        router.push({
            pathname: "/map",
            params: {
                focusLat: String(activity.latitude),
                focusLng: String(activity.longitude),
                focusPostId: String(activity.post_id),
                focusTs: Date.now().toString(),
            },
        });
    };

    const renderItem = ({ item }: { item: Activity | { type: "divider" } }) => {
        if (isDividerItem(item)) {
            return (
                <View style={styles.divider}>
                    <Text style={styles.dividerText}>Vergangene Aktivitäten</Text>
                </View>
            );
        }

        const activity = item;
        const isPast = new Date(activity.end_time) <= now;
        const statusText = isPast ? "Abgeschlossen" : capitalize(activity.status);
        const statusColor = isPast ? "#28a745" : "#007bff";
        const isOwner = currentUserId != null && activity.user_id === currentUserId;


        const handleDeletePress = (postId: number) => {
            setDeletePostId(postId);
            setDeleteModalVisible(true);
        };




        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => goToActivityOnMap(activity)}
                disabled={isPast}
                activeOpacity={isPast ? 1 : 0.7}
            >
                <View style={{ opacity: isPast ? 0.5 : 1 }}>
                    {/* Alles, was ausgegraut werden soll */}
                    <View style={styles.row}>
                        <Text style={styles.title}>
                            {isEmoji(activityTypes[activity.activity_type_id]?.icon_url)
                                ? `${activityTypes[activity.activity_type_id]?.icon_url} `
                                : "📍"}
                            {activityTypes[activity.activity_type_id]?.name} am {formatDateShort(activity.start_time)}
                        </Text>

                        <Text style={[styles.status, { color: statusColor }]}>{statusText}</Text>
                    </View>
                    <Text style={styles.description}>
                        {activity.description?.length ? activity.description : "Keine Beschreibung"}
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
                                style={[
                                    styles.editButton,
                                    !isOwner && styles.editButtonDisabled,
                                ]}
                                onPress={() => {
                                    if (isOwner) openEditModal(item);
                                }}
                                disabled={!isOwner}
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


                    {isOwner ? (
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => handleDeletePress(item.post_id)}
                        >
                            <Text style={styles.buttonText}>Löschen</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => handleLeavePress(item.post_id)}
                        >
                            <Text style={styles.buttonText}>Verlassen</Text>
                        </TouchableOpacity>
                    )}

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
                <View style={[styles.center, styles.emptyContainer]}>
                    <Text style={styles.emptyEmoji}>📭</Text>
                    <Text style={styles.emptyTitle}>Keine Aktivitäten gefunden</Text>
                    <Text style={styles.emptySubtitle}>
                        Du hast noch keine eigenen Aktivitäten erstellt. Gehe zur Karte, um Aktivitäten zu erstellen oder beizutreten.
                    </Text>
                    <TouchableOpacity
                        style={styles.emptyButton}
                        onPress={() => router.push("/map")}
                    >
                        <Text style={styles.emptyButtonText}>Zur Karte</Text>
                    </TouchableOpacity>
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

            <DeleteActivityModal
                visible={leaveModalVisible}
                onClose={() => {
                    setLeaveModalVisible(false);
                    setLeavePostId(null);
                }}
                onConfirm={handleConfirmLeave}
                title="Aktivität verlassen"
                message="Bist du sicher, dass du diese Aktivität verlassen möchtest?"
                confirmText="Ja, verlassen"
            />


            <UpdateActivityModal
                visible={editVisible}
                activityTypes={Object.entries(activityTypes).map(([id, info]) => ({
                    id: Number(id),
                    name: info.name,
                    icon_url: info.icon_url ?? undefined,
                }))}
                selectedActivityTypeId={editActivityTypeId}
                onSelectActivityType={setEditActivityTypeId}
                description={editDescription}
                onChangeDescription={setEditDescription}
                startDate={editStartDate}
                endDate={editEndDate}
                onChangeDateRange={(start, end) => {
                    setEditStartDate(start);
                    setEditEndDate(end);
                }}
                latitude={editLatitude}
                longitude={editLongitude}
                onChangeLatitude={setEditLatitude}
                onChangeLongitude={setEditLongitude}
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
    emptyContainer: { paddingHorizontal: 20, paddingTop: 60 },
    emptyEmoji: { fontSize: 60, marginBottom: 16 },
    emptyTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8, textAlign: "center" },
    emptySubtitle: { fontSize: 15, color: "#555", textAlign: "center", marginBottom: 16, lineHeight: 22 },
    emptyButton: {
        backgroundColor: "#007bff",
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 999,
    },
    emptyButtonText: {
        color: "white",
        fontWeight: "700",
        fontSize: 16,
    },
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
    editButtonDisabled: {
        backgroundColor: "#9ca3af",
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
