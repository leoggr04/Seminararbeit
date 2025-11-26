import React, { useState, useEffect } from "react";
import {
    View,
    StyleSheet,
    Alert,
    Modal,
    Text,
    TextInput,
    TouchableOpacity, Keyboard, Image,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import SearchBar from "@/components/SearchBar";
import { createMarker, getMarkers, MarkerType } from "@/services/appwrite";
import MarkerWithEmoji from "@/components/MarkerWithEmoji";
import DateTimePicker from "@/components/DateTimePicker";
import {createActivity, deleteActivity, getActivityTypes, getAllActivities, getUserActivities, joinActivity} from "@/services/api";
import * as SecureStore from "expo-secure-store";
import {Picker} from "@react-native-picker/picker";
import {awaitExpression} from "@babel/types";
import {useFocusEffect} from "@react-navigation/native";
import * as Location from "expo-location"
import {AntDesign} from "@expo/vector-icons";


const initialRegion = {
    latitude: 47.6510,
    longitude: 9.4797,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
};

const Map = () => {
    const [markers, setMarkers] = useState<MarkerType[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [newMarkerCoords, setNewMarkerCoords] = useState<{ latitude: number; longitude: number } | null>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [emoji, setEmoji] = useState<string>("🌲");
    const [activityTypes, setActivityTypes] = useState<{id: number, name: string, icon_url?: string}[]>([]);
    const [selectedActivityType, setSelectedActivityType] = useState<{id: number, name: string, icon_url?: string} | null>(null);
    const [readOnly, setReadOnly] = useState(false);
    const [activityTypesMap, setActivityTypesMap] = useState<{ [id: number]: string }>({});
    const [userId, setUserId] = useState<number | null>(null);
    const [selectedMarker, setSelectedMarker] = useState<MarkerType | null>(null);
    const now = new Date();
    const mapRef = React.useRef<MapView>(null);

    const requestLocationPermission = async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Berechtigung benötigt", "Die App benötigt Zugriff auf den Standort.");
            return false;
        }
        return true;
    };

    useEffect(() => {
        requestLocationPermission();
    }, []);



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


    // 🔍 NEU: Suchbegriff
    const [searchQuery, setSearchQuery] = useState<string>("");
//-------------------   Autocomplete    ------------------
    const [showSuggestions, setShowSuggestions] = useState(true);
    const [isSearchActive, setIsSearchActive] = useState(false);

// 1️⃣ Lade Aktivitätstypen und Marker gemeinsam
    useEffect(() => {
        const loadActivityTypesAndMarkers = async () => {
            try {
                // Activity Types laden
                const types = await getActivityTypes();
                const map: { [id: number]: string } = {};
                const mappedTypes = types.map(t => {
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
                const activities = await getAllActivities();
                const formattedMarkers = activities
                    .filter(a => a.latitude != null && a.longitude != null)
                    .filter(a => new Date(a.end_time) > now)
                    .map(a => {
                        const type = activityTypes.find(t => t.id === a.activity_type_id);
                        return {
                            post_id: a.post_id,
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




    const uniqueDescription = React.useMemo(() => {
        return Array.from(new Set(markers
            .map(m => (m.description ?? "").trim())
            .filter(t => t.length > 0)
        ));
    }, [markers]);

    // Vorschläge für Suche
    const suggestions = React.useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase().trim();
        return uniqueDescription.filter(title => title.toLowerCase().startsWith(q)).slice(0, 5);
    }, [uniqueDescription, searchQuery]);


// Handler wenn ein Vorschlag ausgewählt wird
    const handleSelectSuggestion = (suggestion: string) => {
        if (suggestion) {
            setSearchQuery(suggestion);
        }
        setShowSuggestions(false); // egal ob leer oder Vorschlag -> Liste weg
        Keyboard.dismiss();
        setIsSearchActive(false);

    };

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
                    const activities = await getAllActivities();
                    const formattedMarkers = activities
                        .filter(a => a.latitude != null && a.longitude != null)
                        .filter(a => new Date(a.end_time) > now)
                        .map(a => {
                            const type = activityTypes.find(t => t.id === a.activity_type_id);
                            return {
                                post_id: a.post_id,
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
                    latitude: savedActivity.latitude,
                    longitude: savedActivity.longitude,
                    activityTypeName: selectedActivityType.name,
                    title: selectedActivityType.name,
                    description: savedActivity.description,
                    start_time: savedActivity.start_time,
                    end_time: savedActivity.end_time,
                    status: savedActivity.status,
                    user_id: userId,
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


    const handleMarkerPress = (marker: MarkerType) => {
        setSelectedMarker(marker); // <--- speichere den aktuellen Marker
        setTitle(marker.activityTypeName);
        setDescription(marker.description ?? "");
        setEmoji(marker.emoji ?? "📍");
        setStartDate(new Date(marker.start_time));
        setEndDate(new Date(marker.end_time));
        setModalVisible(true);
        setReadOnly(true);
    };


    const handleJoinActivity = async () => {
        if (!selectedMarker) return;

        try {
            console.log(selectedMarker.post_id);
            const response = await joinActivity(selectedMarker.post_id);

            Alert.alert("Beigetreten ✅", "Du nimmst jetzt an dieser Aktivität teil!");
            setModalVisible(false);

            // OPTIONAL: Marker aktualisieren
            // setMarkers(...) falls du später Teilnehmer anzeigen willst

        } catch (err) {
            console.error(err);
            Alert.alert("Fehler", "Beitreten fehlgeschlagen.");
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





    // 🔍 Filtert Marker nach Suchbegriff (beschreibung)
    const filteredMarkers = markers.filter(marker =>
        marker.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

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


            <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFill}
                provider={PROVIDER_GOOGLE}
                initialRegion={initialRegion}
                showsUserLocation
                showsMyLocationButton={false}
                showsCompass={false}
                showsPointsOfInterest
                showsBuildings
                onPress={(e) => {
                    if(isSearchActive) {
                        setIsSearchActive(false);
                        setShowSuggestions(false);
                        Keyboard.dismiss();
                        return;
                    }
                    handleMapPress(e);
                }}
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

            {/* 🔍 Suchleiste */}
            <View
                style={{ marginTop: 50, paddingHorizontal: 16 }}>
                <SearchBar
                    placeholder="Suche eine Aktivität"
                    value={searchQuery}
                    onChangeText={(text) => {
                        setSearchQuery(text);
                        setShowSuggestions(true);
                        setIsSearchActive(true);
                    }}
                    suggestions={suggestions}
                    showSuggestions={showSuggestions}
                    onSelectSuggestion={handleSelectSuggestion}
                />
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

                                {/* "Beitreten"-Button */}
                                <TouchableOpacity
                                    style={[
                                        styles.button,
                                        {
                                            backgroundColor:
                                                selectedMarker?.user_id === userId ? "#007bff" : "#28A745",
                                            marginTop: 16,
                                        },
                                    ]}
                                    onPress={() => {
                                        if (selectedMarker?.user_id === userId) {
                                            // später: bearbeiten
                                        } else {
                                            handleJoinActivity();  // <---- Wichtig!!
                                        }
                                    }}
                                >
                                    <Text style={{ color: "white", fontWeight: "bold" }}>
                                        {selectedMarker?.user_id === userId ? "Bearbeiten" : "Beitreten"}
                                    </Text>
                                </TouchableOpacity>


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
