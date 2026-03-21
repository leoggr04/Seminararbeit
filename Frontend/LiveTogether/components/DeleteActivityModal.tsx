/*
Component for the a Delete Activity Modal.
Can be used with visible, onClose, onConfirm and activityName.
Modal needs to know the ID of a Activity

Creator: David Pleyer
Version: v1
*/
import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
    activityName?: string;
    title?: string;
    message?: string;
    confirmText?: string;
};

const DeleteActivityModal: React.FC<Props> = ({
                                                  visible,
                                                  onClose,
                                                  onConfirm,
                                                  activityName = "diese Aktivität",
                                                  title = "Aktivität löschen",
                                                  message,
                                                  confirmText = "Ja, jetzt löschen",
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
                    <Text style={styles.modalTitle}>{title}</Text>
                    <Text style={styles.modalMessage}>
                        {message ?? `Willst du wirklich ${activityName} löschen?`}
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
                            <Text style={styles.modalButtonText}>{confirmText}</Text>
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
