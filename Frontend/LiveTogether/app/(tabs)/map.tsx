import DateTimePicker from "@/components/DateTimePicker";
import MarkerWithEmoji from "@/components/MarkerWithEmoji";
import {
    createActivity,
    deleteActivity,
    getActivityTypes,
    getAllActivities,
    getAlLParticipantsOfPost,
    joinActivity,
    leaveActivity
} from "@/services/api";
import { AntDesign } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import MapView, { Region } from "react-native-maps";


const initialRegion = {
    latitude: 47.6510,
    longitude: 9.4797,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
};

type ActivityTypeOption = {
    id: number;
    name: string;
    icon_url?: string;
    emoji?: string;
};

type ApiActivity = {
    post_id: number;
    activity_type_id: number;
    description: string;
    start_time: string;
    end_time: string;
    latitude: number;
    longitude: number;
    status: string;
    user_id: number;
};

type ActivityMarker = {
    post_id: number;
    activity_type_id: number;
    latitude: number;
    longitude: number;
    user_id: number;
    activityTypeName: string;
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    status: string;
    emoji: string;
};

type BubbleItem = {
    id: number;
    leaving: boolean;
};

const Map = () => {
    const router = useRouter();
    const { focusLat, focusLng, focusPostId, focusTs } = useLocalSearchParams<{
        focusLat?: string;
        focusLng?: string;
        focusPostId?: string;
        focusTs?: string;
    }>();
    const [markers, setMarkers] = useState<ActivityMarker[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [newMarkerCoords, setNewMarkerCoords] = useState<{ latitude: number; longitude: number } | null>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [emoji, setEmoji] = useState<string>("🌲");
    const [activityTypes, setActivityTypes] = useState<ActivityTypeOption[]>([]);
    const [selectedActivityType, setSelectedActivityType] = useState<ActivityTypeOption | null>(null);
    const [readOnly, setReadOnly] = useState(false);
    const [activityTypesMap, setActivityTypesMap] = useState<{ [id: number]: string }>({});
    const [userId, setUserId] = useState<number | null>(null);
    const [selectedMarker, setSelectedMarker] = useState<ActivityMarker | null>(null);
    const [isSelectedMarkerJoined, setIsSelectedMarkerJoined] = useState(false);
    const [mapInitialRegion, setMapInitialRegion] = useState(initialRegion);
    const [isInitialRegionResolved, setIsInitialRegionResolved] = useState(false);
    const [hasLocationPermission, setHasLocationPermission] = useState(false);
    const [visibleRegion, setVisibleRegion] = useState<Region>(initialRegion);
    const now = new Date();
    const mapRef = React.useRef<MapView>(null);
    const lastAppliedFocusKey = React.useRef<string | null>(null);
    const lastVisibleRegionRef = React.useRef<Region>(initialRegion);
    const bubbleItemsRef = React.useRef<BubbleItem[]>([]);
    const bubbleTranslateAnimRef = React.useRef<Record<number, Animated.Value>>({});
    const bubbleOpacityAnimRef = React.useRef<Record<number, Animated.Value>>({});
    const leavingAnimationStartedRef = React.useRef<Set<number>>(new Set());

    const requestLocationPermission = async () => {
        const currentPermission = await Location.getForegroundPermissionsAsync();
        let status = currentPermission.status;

        if (status !== "granted") {
            const requestedPermission = await Location.requestForegroundPermissionsAsync();
            status = requestedPermission.status;
        }

        const isGranted = status === "granted";
        setHasLocationPermission(isGranted);

        if (!isGranted) {
            Alert.alert("Berechtigung benötigt", "Die App benötigt Zugriff auf den Standort.");
            return false;
        }
        return true;
    };

    useEffect(() => {
        const resolveInitialRegion = async () => {
            try {
                const hasPermission = await requestLocationPermission();

                if (!hasPermission) {
                    setMapInitialRegion(initialRegion);
                    return;
                }

                const providerStatus = await Location.getProviderStatusAsync();

                if (!providerStatus.locationServicesEnabled) {
                    setMapInitialRegion(initialRegion);
                    return;
                }

                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });

                const { latitude, longitude } = location.coords;
                setMapInitialRegion({
                    latitude,
                    longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                });
            } catch (err) {
                console.error("Fehler beim Initialisieren der Kartenposition:", err);
                setMapInitialRegion(initialRegion);
            } finally {
                setIsInitialRegionResolved(true);
            }
        };

        resolveInitialRegion();
    }, []);

    useEffect(() => {
        if (!isInitialRegionResolved) return;
        setVisibleRegion(mapInitialRegion);
        lastVisibleRegionRef.current = mapInitialRegion;
    }, [isInitialRegionResolved, mapInitialRegion]);



    useEffect(() => {
        const printToken = async () => {
            const token = await SecureStore.getItemAsync("refreshToken");
            console.log("Aktueller Token:", token);
        };
        printToken();
    }, []);

    // UserId aus SecureStore holen
    useEffect(() => {
        const loadUser = async () => {
            const id = await SecureStore.getItemAsync("userId");
            if (id) setUserId(Number(id));
        };
        loadUser();
    }, []);


    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [bubbleItems, setBubbleItems] = useState<BubbleItem[]>([]);

// 1️⃣ Lade Aktivitätstypen und Marker gemeinsam
    useEffect(() => {
        const loadActivityTypesAndMarkers = async () => {
            try {
                // Activity Types laden
                const types = await getActivityTypes();
                const map: { [id: number]: string } = {};
                const mappedTypes: ActivityTypeOption[] = types.map((t: any) => {
                    map[t.activity_type_id] = t.name;
                    return {
                        id: t.activity_type_id,
                        name: t.name,
                        emoji: t.icon_url?.length === 2 || t.icon_url?.length === 4 ? t.icon_url : undefined // prüft, ob icon_url ein Emoji ist
                    };
                });

                setActivityTypes(mappedTypes);
                setActivityTypesMap(map);

                if (mappedTypes.length > 0 && !selectedActivityType) {
                    setSelectedActivityType(mappedTypes[0]);
                }

                // Activities (Marker) laden
                const activities = await getAllActivities() as ApiActivity[];
                const typeById = mappedTypes.reduce<Record<number, ActivityTypeOption>>((acc, type) => {
                    acc[type.id] = type;
                    return acc;
                }, {});

                const formattedMarkers = activities
                    .filter((a) => a.latitude != null && a.longitude != null)
                    .filter((a) => new Date(a.end_time) > now)
                    .map((a) => {
                        const type = typeById[a.activity_type_id];
                        return {
                            post_id: a.post_id,
                            activity_type_id: a.activity_type_id,
                            latitude: a.latitude,
                            longitude: a.longitude,
                            user_id: a.user_id,
                            activityTypeName: type?.name || "Unbenannte Aktivität",
                            title: type?.name || "Unbenannte Aktivität",
                            description: a.description,
                            start_time: a.start_time,
                            end_time: a.end_time,
                            status: a.status,
                            emoji: type?.emoji || "📍",
                        };
                    });



                setMarkers(formattedMarkers);
            } catch (err) {
                console.error("Fehler beim Laden:", err);
            }
        };

        loadActivityTypesAndMarkers();
    }, []);

    function formatDateTime(iso?: Date | string) {
        if (!iso) return "-";
        const d = iso instanceof Date ? iso : new Date(iso);
        return d.toLocaleString("de-DE", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    }




    // Lade Marker beim Start
    useFocusEffect(
        React.useCallback(() => {
            const loadMarkers = async () => {
                try {
                    const activities = await getAllActivities() as ApiActivity[];
                    const typeById = activityTypes.reduce<Record<number, ActivityTypeOption>>((acc, type) => {
                        acc[type.id] = type;
                        return acc;
                    }, {});

                    const formattedMarkers = activities
                        .filter((a) => a.latitude != null && a.longitude != null)
                        .filter((a) => new Date(a.end_time) > now)
                        .map((a) => {
                            const type = typeById[a.activity_type_id];
                            return {
                                post_id: a.post_id,
                                activity_type_id: a.activity_type_id,
                                latitude: a.latitude,
                                longitude: a.longitude,
                                user_id: a.user_id,
                                activityTypeName: type?.name || "Unbenannte Aktivität",
                                title: type?.name || "Unbenannte Aktivität",
                                description: a.description,
                                start_time: a.start_time,
                                end_time: a.end_time,
                                status: a.status,
                                emoji: type?.emoji || "📍",
                            };
                        });



                    setMarkers(formattedMarkers);
                } catch (err) {
                    console.error("Fehler beim Laden der Aktivitäten:", err);
                }
            };

            if (Object.keys(activityTypesMap).length > 0) { // warte bis map da ist
                loadMarkers();
            }
        }, [activityTypesMap]) // 👈 Dependency
    );

    useEffect(() => {
        if (!isInitialRegionResolved) return;

        const latitude = Number(focusLat);
        const longitude = Number(focusLng);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

        const postId = Number(focusPostId);
        const focusKey = `${focusTs ?? ""}:${latitude}:${longitude}:${Number.isFinite(postId) ? postId : ""}`;

        if (lastAppliedFocusKey.current === focusKey) return;

        mapRef.current?.animateToRegion(
            {
                latitude,
                longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            },
            1000
        );

        // Beim Sprung aus dem Feed nur zum Marker zoomen,
        // aber kein Detail-Modal automatisch öffnen.
        setModalVisible(false);

        lastAppliedFocusKey.current = focusKey;
    }, [focusLat, focusLng, focusPostId, focusTs, isInitialRegionResolved]);



    // Öffnet Modal beim Klick auf die Map
    const handleMapPress = (e: any) => {
        const { latitude, longitude } = e.nativeEvent.coordinate;
        setNewMarkerCoords({ latitude, longitude });
        setTitle("");
        setDescription("");
        setModalVisible(true);
        setReadOnly(false);
    };

    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());

    // Speichert neuen Marker
    const handleSaveMarker = async () => {
        if (!newMarkerCoords || !selectedActivityType) {
            Alert.alert("Fehler", "Bitte Aktivitätstyp auswählen.");
            return;
        }

        try {
            const activityPost = {
                activity_type_id: selectedActivityType?.id,
                description: description || "",
                start_time: startDate.toISOString(),
                end_time: endDate.toISOString(),
                latitude: newMarkerCoords.latitude,
                longitude: newMarkerCoords.longitude,
                status: "offen",
            };

            const savedActivity = await createActivity(activityPost);

            setMarkers(prev => [
                ...prev,
                {
                    post_id: savedActivity.id,
                    activity_type_id: selectedActivityType.id,
                    latitude: savedActivity.latitude,
                    longitude: savedActivity.longitude,
                    activityTypeName: selectedActivityType.name,
                    title: selectedActivityType.name,
                    description: savedActivity.description,
                    start_time: savedActivity.start_time,
                    end_time: savedActivity.end_time,
                    status: savedActivity.status,
                    user_id: userId ?? 0,
                    emoji: selectedActivityType.emoji || "📍",

                },
            ]);

            setModalVisible(false);
            Alert.alert("Gespeichert ✅", "Aktivität wurde erstellt!");
        } catch (err) {
            console.error("Fehler beim Speichern:", err);
            Alert.alert("Fehler", "Aktivität konnte nicht erstellt werden.");
        }
    };

    const handleDeleteMarker = async (postId: number) => {
        try {
            await deleteActivity(postId);
            setMarkers(prev => prev.filter(m => m.post_id !== postId));
            Alert.alert("Gelöscht ✅", "Aktivität wurde entfernt.");
        } catch (err) {
            console.error(err);
            Alert.alert("Fehler", "Löschen fehlgeschlagen.");
        }
    };


    const handleMarkerPress = async (marker: ActivityMarker) => {
        setSelectedMarker(marker); // <--- speichere den aktuellen Marker
        setTitle(marker.activityTypeName);
        setDescription(marker.description ?? "");
        setEmoji(marker.emoji ?? "📍");
        setStartDate(new Date(marker.start_time));
        setEndDate(new Date(marker.end_time));
        setModalVisible(true);
        setReadOnly(true);

        if (userId == null || marker.user_id === userId) {
            setIsSelectedMarkerJoined(false);
            return;
        }

        try {
            const participants = await getAlLParticipantsOfPost(marker.post_id);
            const joined = Array.isArray(participants)
                ? participants.some((p: any) => Number(p?.user_id ?? p?.id) === userId)
                : false;
            setIsSelectedMarkerJoined(joined);
        } catch (err) {
            console.error("Fehler beim Laden der Teilnehmer:", err);
            setIsSelectedMarkerJoined(false);
        }
    };


    const handleJoinActivity = async () => {
        if (!selectedMarker?.post_id) return;

        try {
            console.log(selectedMarker.post_id);
            await joinActivity(selectedMarker.post_id);

            Alert.alert("Beigetreten ✅", "Du nimmst jetzt an dieser Aktivität teil!");
            setIsSelectedMarkerJoined(true);
            setModalVisible(false);

            // OPTIONAL: Marker aktualisieren
            // setMarkers(...) falls du später Teilnehmer anzeigen willst

        } catch (err) {
            console.error(err);
            Alert.alert("Fehler", "Beitreten fehlgeschlagen.");
        }
    };

    const handleLeaveActivity = async () => {
        if (!selectedMarker?.post_id) return;

        try {
            await leaveActivity(selectedMarker.post_id);
            Alert.alert("Verlassen ✅", "Du hast die Aktivität verlassen.");
            setIsSelectedMarkerJoined(false);
            setModalVisible(false);
        } catch (err) {
            console.error(err);
            Alert.alert("Fehler", "Verlassen fehlgeschlagen.");
        }
    };

    const goToUserLocation = async () => {
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) return;

        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;

        mapRef.current?.animateToRegion({
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        }, 1000); // Dauer in ms
    };





    const filteredMarkers = markers.filter((marker) => {
        return selectedCategoryId === null || marker.activity_type_id === selectedCategoryId;
    });

    const isMarkerInsideRegion = React.useCallback((marker: ActivityMarker, region: Region) => {
        const latitudeHalfDelta = region.latitudeDelta / 2;
        const longitudeHalfDelta = region.longitudeDelta / 2;

        const minLatitude = region.latitude - latitudeHalfDelta;
        const maxLatitude = region.latitude + latitudeHalfDelta;
        const minLongitude = region.longitude - longitudeHalfDelta;
        const maxLongitude = region.longitude + longitudeHalfDelta;

        return (
            marker.latitude >= minLatitude &&
            marker.latitude <= maxLatitude &&
            marker.longitude >= minLongitude &&
            marker.longitude <= maxLongitude
        );
    }, []);

    const visibleCategoryIds = React.useMemo(() => {
        const ids = new Set<number>();

        for (const marker of markers) {
            if (isMarkerInsideRegion(marker, visibleRegion)) {
                ids.add(marker.activity_type_id);
            }
        }

        return ids;
    }, [markers, visibleRegion, isMarkerInsideRegion]);

    const visibleActivityTypes = React.useMemo(() => {
        return activityTypes.filter((type) => visibleCategoryIds.has(type.id));
    }, [activityTypes, visibleCategoryIds]);

    useEffect(() => {
        bubbleItemsRef.current = bubbleItems;
    }, [bubbleItems]);

    useEffect(() => {
        const nextVisibleIds = visibleActivityTypes.map((type) => type.id);
        const currentItems = bubbleItemsRef.current;
        const currentIds = currentItems.map((item) => item.id);
        const currentlyVisibleNonLeaving = currentItems.filter((item) => !item.leaving).length;
        const shouldEnterFromAlle = currentlyVisibleNonLeaving === 0 && nextVisibleIds.length > 0;

        const idsToAdd = nextVisibleIds.filter((id) => !currentIds.includes(id));
        const idsToRemove = currentIds.filter((id) => !nextVisibleIds.includes(id));

        const updatedItems: BubbleItem[] = currentItems.map((item) => {
            if (nextVisibleIds.includes(item.id)) {
                return { ...item, leaving: false };
            }
            return { ...item, leaving: true };
        });

        idsToAdd.forEach((id) => {
            updatedItems.push({ id, leaving: false });

            const startX = shouldEnterFromAlle ? -18 : 8;
            bubbleTranslateAnimRef.current[id] = new Animated.Value(startX);
            bubbleOpacityAnimRef.current[id] = new Animated.Value(0);

            Animated.parallel([
                Animated.timing(bubbleTranslateAnimRef.current[id], {
                    toValue: 0,
                    duration: 220,
                    useNativeDriver: true,
                }),
                Animated.timing(bubbleOpacityAnimRef.current[id], {
                    toValue: 1,
                    duration: 180,
                    useNativeDriver: true,
                }),
            ]).start();
        });

        nextVisibleIds.forEach((id) => {
            const wasLeaving = currentItems.some((item) => item.id === id && item.leaving);
            if (!wasLeaving) return;

            leavingAnimationStartedRef.current.delete(id);

            if (!bubbleTranslateAnimRef.current[id]) {
                bubbleTranslateAnimRef.current[id] = new Animated.Value(-10);
            }
            if (!bubbleOpacityAnimRef.current[id]) {
                bubbleOpacityAnimRef.current[id] = new Animated.Value(0.7);
            }

            bubbleTranslateAnimRef.current[id].stopAnimation();
            bubbleOpacityAnimRef.current[id].stopAnimation();

            Animated.parallel([
                Animated.timing(bubbleTranslateAnimRef.current[id], {
                    toValue: 0,
                    duration: 160,
                    useNativeDriver: true,
                }),
                Animated.timing(bubbleOpacityAnimRef.current[id], {
                    toValue: 1,
                    duration: 160,
                    useNativeDriver: true,
                }),
            ]).start();
        });

        idsToRemove.forEach((id) => {
            if (!bubbleTranslateAnimRef.current[id]) {
                bubbleTranslateAnimRef.current[id] = new Animated.Value(0);
            }
            if (!bubbleOpacityAnimRef.current[id]) {
                bubbleOpacityAnimRef.current[id] = new Animated.Value(1);
            }
        });

        updatedItems.sort((a, b) => {
            const ai = nextVisibleIds.indexOf(a.id);
            const bi = nextVisibleIds.indexOf(b.id);

            if (ai === -1 && bi === -1) return 0;
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi;
        });

        setBubbleItems(updatedItems);
    }, [visibleActivityTypes]);

    useEffect(() => {
        bubbleItems.forEach((item) => {
            if (!item.leaving) return;
            if (leavingAnimationStartedRef.current.has(item.id)) return;

            leavingAnimationStartedRef.current.add(item.id);

            const translate = bubbleTranslateAnimRef.current[item.id] ?? new Animated.Value(0);
            const opacity = bubbleOpacityAnimRef.current[item.id] ?? new Animated.Value(1);
            bubbleTranslateAnimRef.current[item.id] = translate;
            bubbleOpacityAnimRef.current[item.id] = opacity;

            Animated.parallel([
                Animated.timing(translate, {
                    toValue: -24,
                    duration: 180,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                leavingAnimationStartedRef.current.delete(item.id);
                setBubbleItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
                delete bubbleTranslateAnimRef.current[item.id];
                delete bubbleOpacityAnimRef.current[item.id];
            });
        });
    }, [bubbleItems]);

    useEffect(() => {
        if (selectedCategoryId !== null && !visibleCategoryIds.has(selectedCategoryId)) {
            setSelectedCategoryId(null);
        }
    }, [selectedCategoryId, visibleCategoryIds]);

    const handleRegionChangeComplete = React.useCallback((region: Region) => {
        const previous = lastVisibleRegionRef.current;

        const hasMeaningfulChange =
            Math.abs(previous.latitude - region.latitude) > 0.0002 ||
            Math.abs(previous.longitude - region.longitude) > 0.0002 ||
            Math.abs(previous.latitudeDelta - region.latitudeDelta) > 0.0002 ||
            Math.abs(previous.longitudeDelta - region.longitudeDelta) > 0.0002;

        if (!hasMeaningfulChange) return;

        lastVisibleRegionRef.current = region;
        setVisibleRegion(region);
    }, []);

    return (
        <View style={{ flex: 1 }}>
            <TouchableOpacity
                onPress={goToUserLocation}
                style={{
                    position: "absolute",
                    bottom: 110,      // näher an den unteren Rand
                    right: 20,
                    backgroundColor: "white",
                    padding: 18,
                    borderRadius: 50,
                    elevation: 5,    // Android
                    zIndex: 10,      // iOS
                }}
            >
                <AntDesign name="aim" size={24} color="black"/>
            </TouchableOpacity>


            {!isInitialRegionResolved && (
                <View style={styles.locationLoadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.locationLoadingText}>Standort wird geladen…</Text>
                </View>
            )}

            {isInitialRegionResolved && (
                <MapView
                    key={hasLocationPermission ? "map-with-location" : "map-without-location"}
                    ref={mapRef}
                    style={StyleSheet.absoluteFill}
                    initialRegion={mapInitialRegion}
                    showsUserLocation={hasLocationPermission}
                    showsMyLocationButton={false}
                    showsCompass={false}
                    showsPointsOfInterest
                    showsBuildings
                    onPress={handleMapPress}
                    onRegionChangeComplete={handleRegionChangeComplete}
                >
                    {filteredMarkers.map((marker) => (
                        <MarkerWithEmoji
                            // stable key -> not changing due to filtering
                            // if no stable key used, emoji falls back to default after applying filter
                            key={marker.post_id?.toString() || `${marker.latitude}-${marker.longitude}`}
                            marker={marker}
                            onPress={() => handleMarkerPress(marker)}
                        />
                    ))}

                </MapView>
            )}

            {/* Kategorie-Bubbles */}
            <View
                style={{ marginTop: 50, paddingHorizontal: 16 }}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryRow}
                >
                    <TouchableOpacity
                        style={[
                            styles.categoryBubble,
                            selectedCategoryId === null && styles.categoryBubbleActive,
                        ]}
                        onPress={() => setSelectedCategoryId(null)}
                    >
                        <Text
                            style={[
                                styles.categoryBubbleText,
                                selectedCategoryId === null && styles.categoryBubbleTextActive,
                            ]}
                        >
                            ✨ Alle
                        </Text>
                    </TouchableOpacity>

                    {bubbleItems.map((item) => {
                        const type = activityTypes.find((t) => t.id === item.id);
                        if (!type) return null;

                        const isActive = selectedCategoryId === type.id;
                        const translateX = bubbleTranslateAnimRef.current[type.id] ?? new Animated.Value(0);
                        const opacity = bubbleOpacityAnimRef.current[type.id] ?? new Animated.Value(1);
                        bubbleTranslateAnimRef.current[type.id] = translateX;
                        bubbleOpacityAnimRef.current[type.id] = opacity;

                        return (
                            <Animated.View
                                key={type.id}
                                style={{
                                    opacity,
                                    transform: [{ translateX }],
                                }}
                            >
                                <TouchableOpacity
                                    style={[
                                        styles.categoryBubble,
                                        isActive && styles.categoryBubbleActive,
                                    ]}
                                    onPress={() => setSelectedCategoryId(type.id)}
                                >
                                    <Text
                                        style={[
                                            styles.categoryBubbleText,
                                            isActive && styles.categoryBubbleTextActive,
                                        ]}
                                    >
                                        {(type.emoji || "📍")} {type.name}
                                    </Text>
                                </TouchableOpacity>
                            </Animated.View>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Modal für neue Marker */}
            {/* Modal für Marker */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalBackground}>
                    <View style={styles.modalContainer}>
                        {/* --- Titel & X-Button oben --- */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={styles.modalTitle}>{readOnly ? title : "Neue Aktivität"}</Text>

                            {/* Rotes X immer verfügbar */}
                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
                                style={{ padding: 4 }}
                            >
                                <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'red' }}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {readOnly ? (
                            // --- Read-Only Ansicht ---
                            <View>
                                <Text style={{ fontWeight: "bold", marginTop: 8 }}>Beschreibung:</Text>
                                <Text style={{ marginBottom: 8 }}>{description || "Keine Beschreibung"}</Text>

                                <Text style={{ fontWeight: "bold", marginTop: 8 }}>Dauer:</Text>
                                <Text>
                                    {formatDateTime(startDate)} – {formatDateTime(endDate)}
                                </Text>

                                {selectedMarker?.user_id === userId ? (
                                    <>
                                        <View style={styles.ownerHintBox}>
                                            <Text style={styles.ownerHintTitle}>Eigene Aktivität</Text>
                                            <Text style={styles.ownerHint}>
                                                Wechsele zum Bearbeiten oder Löschen deiner Aktivität in den Feed. Dort kannst du auch bequem die Teilnehmer verwalten!
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={[
                                                styles.button,
                                                {
                                                    backgroundColor: "#007bff",
                                                    marginTop: 16,
                                                },
                                            ]}
                                            onPress={() => {
                                                setModalVisible(false);
                                                router.push("/(tabs)/feed");
                                            }}
                                        >
                                            <Text style={{ color: "white", fontWeight: "bold" }}>
                                                Zum Feed
                                            </Text>
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <TouchableOpacity
                                        style={[
                                            styles.button,
                                            {
                                                backgroundColor: isSelectedMarkerJoined ? "red" : "#28A745",
                                                marginTop: 16,
                                            },
                                        ]}
                                        onPress={() => {
                                            if (isSelectedMarkerJoined) {
                                                handleLeaveActivity();
                                            } else {
                                                handleJoinActivity();
                                            }
                                        }}
                                    >
                                        <Text style={{ color: "white", fontWeight: "bold" }}>
                                            {isSelectedMarkerJoined ? "Verlassen" : "Beitreten"}
                                        </Text>
                                    </TouchableOpacity>
                                )}


                            </View>
                        ) : (
                            // --- Erstellen/Bearbeiten ---
                            <>
                                {/* Activity Type Picker */}
                                <Text style={{ fontWeight: "bold", marginBottom: 4 }}>Aktivitätstyp</Text>
                                <View style={{ marginBottom: 12 }}>
                                    <Picker
                                        selectedValue={selectedActivityType?.id || ""}
                                        onValueChange={(value) => {
                                            const numericValue = Number(value);
                                            const selected = activityTypes.find((t) => t.id === numericValue);
                                            setSelectedActivityType(selected || null);
                                        }}
                                    >
                                        {activityTypes.map((type) => (
                                            <Picker.Item key={type.id} label={type.name} value={type.id} />
                                        ))}
                                    </Picker>
                                </View>

                                {/* Beschreibung */}
                                <TextInput
                                    style={[styles.input, { height: 80 }]}
                                    placeholder="Beschreibung"
                                    value={description}
                                    onChangeText={setDescription}
                                    multiline
                                />

                                {/* Datum/Zeit Picker */}
                                <DateTimePicker
                                    startDate={startDate}
                                    endDate={endDate}
                                    onChange={(start, end) => {
                                        setStartDate(start);
                                        setEndDate(end);
                                    }}
                                />

                                {/* Speichern Button */}
                                <TouchableOpacity style={styles.button} onPress={handleSaveMarker}>
                                    <Text style={{ color: "white", fontWeight: "bold" }}>
                                        Speichern & Veröffentlichen
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>




        </View>
    );
};

const styles = StyleSheet.create({
    locationLoadingContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "white",
    },
    locationLoadingText: {
        marginTop: 12,
        fontSize: 15,
        color: "#334155",
        fontWeight: "600",
    },
    modalBackground: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContainer: {
        width: "85%",
        backgroundColor: "white",
        borderRadius: 12,
        padding: 20,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 12,
        textAlign: "center",
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 10,
        marginBottom: 12,
    },
    button: {
        backgroundColor: "#007AFF",
        padding: 12,
        borderRadius: 8,
        alignItems: "center",
    },
    ownerHintBox: {
        marginTop: 14,
        backgroundColor: "#eef5ff",
        borderColor: "#cfe2ff",
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
    },
    ownerHintTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: "#1d4ed8",
        marginBottom: 4,
        textAlign: "center",
    },
    ownerHint: {
        fontSize: 14,
        color: "#334155",
        lineHeight: 20,
    },
    categoryRow: {
        paddingTop: 10,
        paddingBottom: 2,
        gap: 8,
    },
    categoryBubble: {
        backgroundColor: "rgba(255,255,255,0.95)",
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    categoryBubbleActive: {
        backgroundColor: "#1d4ed8",
        borderColor: "#1d4ed8",
    },
    categoryBubbleText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#0f172a",
    },
    categoryBubbleTextActive: {
        color: "white",
    },
    emojiButton: {
        padding: 6,
        margin: 4,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "transparent",
    },
});

const pickerSelectStyles = StyleSheet.create({
    inputIOS: {
        fontSize: 16,
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        color: "black",
        paddingRight: 30, // Platz für Icon
        backgroundColor: "#f9f9f9",
    },
    inputAndroid: {
        fontSize: 16,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        color: "black",
        paddingRight: 30,
        backgroundColor: "#f9f9f9",
    },
    iconContainer: {
        top: 10,
        right: 12,
    },
});


export default Map;
