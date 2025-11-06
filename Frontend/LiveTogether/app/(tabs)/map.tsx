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
import {createActivity, deleteActivity, getActivityTypes, getAllActivities, getUserActivities} from "@/services/api";
import * as SecureStore from "expo-secure-store";
import {Picker} from "@react-native-picker/picker";
import {awaitExpression} from "@babel/types";
import {useFocusEffect} from "@react-navigation/native";

useEffect(() => {
    const printToken = async () => {
        const token = await SecureStore.getItemAsync("refreshToken");
        console.log("Aktueller Token:", token);
    };
    printToken();
}, []);


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


    // 🔍 NEU: Suchbegriff
    const [searchQuery, setSearchQuery] = useState<string>("");
//-------------------   Autocomplete    ------------------
    const [showSuggestions, setShowSuggestions] = useState(true);
    const [isSearchActive, setIsSearchActive] = useState(false);

    useEffect(() => {
        const loadActivityTypes = async () => {
            try {
                const types = await getActivityTypes();
                // Mappe activity_type_id auf id
                const mappedTypes = types.map(t => ({
                    id: t.activity_type_id,
                    name: t.name,
                    icon_url: t.icon_url
                }));
                setActivityTypes(mappedTypes);

                if (mappedTypes.length > 0 && !selectedActivityType) {
                    setSelectedActivityType(mappedTypes[0]); // Default
                }
            } catch (err) {
                console.error("Fehler beim Laden der Aktivitätstypen:", err);
            }
        };
        loadActivityTypes();
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



    // Lade Marker beim Start
    useFocusEffect(
        React.useCallback(()=>{
        const loadMarkers = async () => {
            try {
                const activities = await getAllActivities();
                const formattedMarkers = activities
                    .filter(a => a.latitude != null && a.longitude != null)
                    .map(a => ({
                        post_id: a.id,
                        latitude: a.latitude,
                        longitude: a.longitude,
                        title: a.activity_type_name || "Unbenannte Aktivität",
                        description: a.description,
                        start_time: a.start_time,
                        end_time: a.end_time,
                        status: a.status,
                    }));

                setMarkers(formattedMarkers);
            } catch (err) {
                console.error("Fehler beim Laden der Aktivitäten:", err);
            }
        };
        loadMarkers();
    }, [])
    );


    // Öffnet Modal beim Klick auf die Map
    const handleMapPress = (e: any) => {
        const { latitude, longitude } = e.nativeEvent.coordinate;
        setNewMarkerCoords({ latitude, longitude });
        setTitle("");
        setDescription("");
        setModalVisible(true);
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
                    title: selectedActivityType.name,
                    description: savedActivity.description,
                    start_time: savedActivity.start_time,
                    end_time: savedActivity.end_time,
                    status: savedActivity.status,
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
        setTitle(marker.title ?? "Unbenannter Ort");
        setDescription(marker.description ?? "");
        setEmoji(marker.emoji ?? "📍");
        setModalVisible(true);
    };


    // 🔍 Filtert Marker nach Suchbegriff (beschreibung)
    const filteredMarkers = markers.filter(marker =>
        marker.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <View style={{ flex: 1 }}>
            <MapView
                style={StyleSheet.absoluteFill}
                provider={PROVIDER_GOOGLE}
                initialRegion={initialRegion}
                showsUserLocation
                showsMyLocationButton={true}
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
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalBackground}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Neue Aktivität</Text>

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

                        {/* Optional: Emoji Picker */}
                        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginBottom: 12 }}>
                            {["📍", "🌲", "🏔️", "🏕️", "🏃", "🏈", "🏀", "🎾"].map((e, index) => (
                                <TouchableOpacity
                                    key={`${e}-${index}`}
                                    onPress={() => setEmoji(e)}
                                    style={[
                                        styles.emojiButton,
                                        emoji === e ? { borderWidth: 2, borderColor: "#007AFF" } : {},
                                    ]}
                                >
                                    <Text style={{ fontSize: 28 }}>{e}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

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

                        {/* Abbrechen Button */}
                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: "#aaa", marginTop: 8 }]}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={{ color: "white" }}>Abbrechen</Text>
                        </TouchableOpacity>
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
