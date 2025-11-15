import React from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet, Modal,
} from "react-native";

type Props = {
    visible: boolean;
    text: string;
    onChangeText: (text: string) => void;
    onClose: () => void;
    onSave: () => void;
    hasChanged: boolean;
};

const UpdateActivityModal: React.FC<Props> = ({
                                                visible,
                                                text,
                                                onChangeText,
                                                onClose,
                                                onSave,
                                                hasChanged,
                                            }) => {
    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
            >
        <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>Beschreibung bearbeiten</Text>

                <TextInput
                    value={text}
                    onChangeText={onChangeText}
                    style={styles.modalInput}
                    multiline
                />

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
});

export default UpdateActivityModal;
