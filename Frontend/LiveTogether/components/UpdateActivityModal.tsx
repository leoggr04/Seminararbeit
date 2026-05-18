/*
Component for the Update Activity Modal.
Can be used with visible,text,onChangeText,onClose,onSave and hasChanged.
Modal needs to know the ID of a Activity

Creator: David Pleyer
Version: v1
*/

import { Picker } from "@react-native-picker/picker";
import { X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { WebView } from "react-native-webview";
import DateRangePicker from "./DateTimePicker";

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
    const webViewRef = React.useRef<WebView>(null);

    const updateLocation = (lat: number, lng: number) => {
        setMarkerCoord({ latitude: lat, longitude: lng });
        onChangeLatitude(String(lat));
        onChangeLongitude(String(lng));
    };

    useEffect(() => {
        const coord = hasValidLocation ? { latitude: parsedLat, longitude: parsedLng } : DEFAULT_COORDS;
        setMarkerCoord(coord);
        if (webViewRef.current) {
            webViewRef.current.injectJavaScript(`
                window.updateMarkerLocation(${coord.latitude}, ${coord.longitude});
                true;
            `);
        }
    }, [parsedLat, parsedLng, hasValidLocation]);

    const handleWebViewMessage = (e: any) => {
        try {
            const data = JSON.parse(e.nativeEvent.data);
            if (data.type === "markerMoved") {
                updateLocation(data.latitude, data.longitude);
            } else if (data.type === "mapClick") {
                updateLocation(data.latitude, data.longitude);
            }
        } catch (error) {
            console.error("Error parsing WebView message:", error);
        }
    };

    const leafletHtmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
            <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
            <style>
                * { margin: 0; padding: 0; }
                html, body, #map { width: 100%; height: 100%; }
                .marker-point { cursor: move; }
            </style>
        </head>
        <body>
            <div id="map"></div>
            <script>
                const map = L.map('map').setView([${initialCoord.latitude}, ${initialCoord.longitude}], 13);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors',
                    maxZoom: 19,
                }).addTo(map);

                let marker = L.marker([${initialCoord.latitude}, ${initialCoord.longitude}], {
                    draggable: true,
                    icon: L.icon({
                        iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxNiIgZmlsbD0iIzAwN0FGRiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+',
                        iconSize: [40, 40],
                        iconAnchor: [20, 20],
                    }),
                    className: 'marker-point'
                }).addTo(map);

                window.updateMarkerLocation = function(lat, lng) {
                    marker.setLatLng([lat, lng]);
                    map.setView([lat, lng], map.getZoom());
                };

                marker.on('dragend', function() {
                    const pos = marker.getLatLng();
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'markerMoved',
                        latitude: pos.lat,
                        longitude: pos.lng
                    }));
                });

                map.on('click', function(e) {
                    const { lat, lng } = e.latlng;
                    marker.setLatLng([lat, lng]);
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'mapClick',
                        latitude: lat,
                        longitude: lng
                    }));
                });
            </script>
        </body>
        </html>
    `;


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
                            <WebView
                                ref={webViewRef}
                                source={{ html: leafletHtmlContent }}
                                style={styles.map}
                                onMessage={handleWebViewMessage}
                                javaScriptEnabled={true}
                                scalesPageToFit={false}
                                startInLoadingState={true}
                            />
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