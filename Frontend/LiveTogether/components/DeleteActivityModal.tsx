// components/DeleteActivityModal.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";

type Props = {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
    activityName?: string;
};

const DeleteActivityModal: React.FC<Props> = ({
                                                  visible,
                                                  onClose,
                                                  onConfirm,
                                                  activityName = "diese Aktivität",
                                              }) => {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalBox}>
                    <Text style={styles.modalTitle}>Aktivität löschen</Text>
                    <Text style={styles.modalMessage}>
                        Willst du wirklich {activityName} löschen?
                    </Text>

                    <View style={styles.modalButtons}>
                        <TouchableOpacity
                            style={[styles.modalButton, { backgroundColor: "#6c757d" }]}
                            onPress={onClose}
                        >
                            <Text style={styles.modalButtonText}>Nein</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.modalButton, { backgroundColor: "#dc3545" }]}
                            onPress={onConfirm}
                        >
                            <Text style={styles.modalButtonText}>Ja, jetzt löschen</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalBox: {
        backgroundColor: "#fff",
        padding: 20,
        borderRadius: 12,
        width: "100%",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 10,
        textAlign: "center",
    },
    modalMessage: {
        fontSize: 16,
        marginBottom: 20,
        textAlign: "center",
    },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    modalButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 6,
    },
    modalButtonText: {
        color: "white",
        fontWeight: "700",
        fontSize: 16,
        textAlign: "center",
    },
});

export default DeleteActivityModal;
