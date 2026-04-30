/*
Component for the Update Activity Modal.
Can be used with visible,text,onChangeText,onClose,onSave and hasChanged.
Modal needs to know the ID of a Activity

Creator: David Pleyer
Version: v1
*/

import { Picker } from "@react-native-picker/picker";
import * as FileSystem from "expo-file-system";
import { X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    Dimensions,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import MapView, { Marker, Region, UrlTile } from "react-native-maps";
import DateRangePicker from "./DateTimePicker";
import { logMapProviderState, DEFAULT_OSM_TILE_CACHE_PATH, resolveOsmTileUrlWithFallback } from "@/utils/osmMap";

type ActivityType = {
    id: number;
    name: string;
    icon_url?: string;
};

type Props = {
    visible: boolean;
    activityTypes: ActivityType[];
    selectedActivityTypeId: number | null;
    onSelectActivityType: (id: number) => void;
    description: string;
    onChangeDescription: (text: string) => void;
    startDate: Date;
    endDate: Date;
    onChangeDateRange: (start: Date, end: Date) => void;
    latitude: string;
    longitude: string;
    onChangeLatitude: (value: string) => void;
    onChangeLongitude: (value: string) => void;
    onClose: () => void;
    onSave: () => void;
    hasChanged: boolean;
};

const DEFAULT_COORDS = { latitude: 48.137154, longitude: 11.576124 };
const OSM_TILE_URL = resolveOsmTileUrlWithFallback();
const IS_ANDROID = Platform.OS === "android";
const IS_IOS = Platform.OS === "ios";
const OSM_TILE_CACHE_DIR = new FileSystem.Directory(FileSystem.Paths.cache, DEFAULT_OSM_TILE_CACHE_PATH);

const UpdateActivityModal: React.FC<Props> = ({
                                                visible,
                                                activityTypes,
                                                selectedActivityTypeId,
                                                onSelectActivityType,
                                                description,
                                                onChangeDescription,
                                                startDate,
                                                endDate,
                                                onChangeDateRange,
                                                latitude,
                                                longitude,
                                                onChangeLatitude,
                                                onChangeLongitude,
                                                onClose,
                                                onSave,
                                                hasChanged,
                                            }) => {
    const parsedLat = Number(latitude);
    const parsedLng = Number(longitude);
    const hasValidLocation = !Number.isNaN(parsedLat) && !Number.isNaN(parsedLng);

    const initialCoord = hasValidLocation ? { latitude: parsedLat, longitude: parsedLng } : DEFAULT_COORDS;
    const [markerCoord, setMarkerCoord] = useState(initialCoord);

    useEffect(() => {
        try {
            OSM_TILE_CACHE_DIR.create({ intermediates: true, idempotent: true });
            console.log("[UpdateActivityModal] OSM tile cache directory:", OSM_TILE_CACHE_DIR.uri);
        } catch (error) {
            console.warn("[UpdateActivityModal] Failed to prepare OSM tile cache:", error);
        }

        logMapProviderState("UpdateActivityModal", OSM_TILE_URL, Platform.OS);
    }, []);

    const initialRegion: Region = {
        latitude: initialCoord.latitude,
        longitude: initialCoord.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    };
    const [region, setRegion] = useState<Region>(initialRegion);

    useEffect(() => {
        const coord = hasValidLocation ? { latitude: parsedLat, longitude: parsedLng } : DEFAULT_COORDS;
        setMarkerCoord(coord);
        setRegion((r) => ({ ...r, latitude: coord.latitude, longitude: coord.longitude }));
    }, [parsedLat, parsedLng, hasValidLocation]);

    const updateLocation = (lat: number, lng: number) => {
        setMarkerCoord({ latitude: lat, longitude: lng });
        setRegion((r) => ({ ...r, latitude: lat, longitude: lng }));
        onChangeLatitude(String(lat));
        onChangeLongitude(String(lng));
    };

    if (!visible) return null;

    const maxModalHeight = Dimensions.get("window").height * 0.85;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalBox, { maxHeight: maxModalHeight }]}> 
                    <ScrollView contentContainerStyle={styles.modalContent}>
                        {/* Header with title and red X */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Aktivität bearbeiten</Text>
                            <TouchableOpacity onPress={onClose}>
                                <X size={24} color="red" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Aktivitätstyp</Text>
                        <View style={styles.pickerWrapper}>
                            <Picker
                                selectedValue={selectedActivityTypeId ?? ""}
                                onValueChange={(value) => {
                                    const numericValue = Number(value);
                                    if (!Number.isNaN(numericValue)) {
                                        onSelectActivityType(numericValue);
                                    }
                                }}
                            >
                                {activityTypes.map((type) => (
                                    <Picker.Item key={type.id} label={type.name} value={type.id} />
                                ))}
                            </Picker>
                        </View>

                        <Text style={styles.label}>Beschreibung</Text>
                        <TextInput
                            value={description}
                            onChangeText={onChangeDescription}
                            style={styles.modalInput}
                            multiline
                        />

                        <DateRangePicker
                            startDate={startDate}
                            endDate={endDate}
                            onChange={onChangeDateRange}
                        />

                        <Text style={styles.label}>Standort</Text>
                        <View style={styles.mapContainer}>
                            <MapView
                                style={styles.map}
                                region={region}
                                mapType={IS_ANDROID ? "none" : "standard"}
                                onMapReady={() => {
                                    if (IS_ANDROID || IS_IOS) {
                                        console.log("[UpdateActivityModal] Map ready, OSM tile overlay active.");
                                    }
                                }}
                                onMapLoaded={() => {
                                    if (IS_ANDROID || IS_IOS) {
                                        console.log("[UpdateActivityModal] Map loaded, waiting for OSM tiles to finish rendering.");
                                    }
                                }}
                                onPress={(e) => {
                                    const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
                                    updateLocation(lat, lng);
                                }}
                                onRegionChangeComplete={(r) => setRegion(r)}
                                scrollEnabled
                                zoomEnabled
                            >
                                {(IS_ANDROID || IS_IOS) && (
                                    <UrlTile
                                        urlTemplate={OSM_TILE_URL}
                                        maximumZ={19}
                                        tileCachePath={OSM_TILE_CACHE_DIR.uri}
                                        tileCacheMaxAge={7 * 24 * 60 * 60}
                                        shouldReplaceMapContent={IS_IOS}
                                    />
                                )}
                                <Marker
                                    coordinate={markerCoord}
                                    draggable
                                    onDragEnd={(e) => {
                                        const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
                                        updateLocation(lat, lng);
                                    }}
                                />
                            </MapView>
                        </View>
                        <Text style={styles.mapHint}>
                            Tippe auf die Karte oder ziehe den Marker, um den Standort festzulegen.
                        </Text>
                        <View style={styles.locationRow}>
                            <View style={styles.locationField}>
                                <Text style={styles.label}>Latitude</Text>
                                <TextInput
                                    value={latitude}
                                    onChangeText={onChangeLatitude}
                                    style={styles.modalInput}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={styles.locationField}>
                                <Text style={styles.label}>Longitude</Text>
                                <TextInput
                                    value={longitude}
                                    onChangeText={onChangeLongitude}
                                    style={styles.modalInput}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: "red" }]}
                                onPress={onClose}
                            >
                                <Text style={styles.modalButtonText}>Abbrechen</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                disabled={!hasChanged}
                                style={[
                                    styles.modalButton,
                                    { backgroundColor: hasChanged ? "#007bff" : "#a1c4ff" },
                                ]}
                                onPress={onSave}
                            >
                                <Text
                                    style={[
                                        styles.modalButtonText,
                                        { opacity: hasChanged ? 1 : 0.6 },
                                    ]}
                                >
                                    Speichern
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
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
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
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
    label: {
        fontWeight: "700",
        marginBottom: 6,
        marginTop: 10,
    },
    pickerWrapper: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        marginBottom: 10,
        overflow: "hidden",
    },
    locationRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 10,
        marginTop: 10,
    },
    locationField: {
        flex: 1,
    },
    mapContainer: {
        height: 200,
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#ccc",
    },
    map: {
        flex: 1,
    },
    mapHint: {
        fontSize: 12,
        color: "#666",
        marginBottom: 12,
    },
    modalContent: {
        paddingBottom: 20,
    },
});

export default UpdateActivityModal;