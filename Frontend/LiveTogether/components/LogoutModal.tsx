import React from "react";
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type LogoutModalProps = {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
};

const LogoutModal: React.FC<LogoutModalProps> = ({ visible, onClose, onConfirm }) => {
    if (!visible) return null;

    return (
        <View style={styles.modalOverlay}>
            <Pressable style={styles.overlayBackdrop} onPress={onClose} />

            <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>Abmelden</Text>
                <Text style={styles.modalMessage}>Willst du dich wirklich abmelden?</Text>

                <View style={styles.modalButtons}>
                    <TouchableOpacity
                        style={[styles.modalButton, styles.cancelButton]}
                        onPress={onClose}
                    >
                        <Text style={styles.modalButtonText}>Abbrechen</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.modalButton, styles.confirmButton]}
                        onPress={onConfirm}
                    >
                        <Text style={styles.modalButtonText}>Ja, abmelden</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        zIndex: 999,
        elevation: 20,
    },
    overlayBackdrop: {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalBox: {
        width: "100%",
        backgroundColor: "#fff",
        borderRadius: 18,
        paddingHorizontal: 22,
        paddingVertical: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 12,
        color: "#1f2937",
    },
    modalMessage: {
        fontSize: 16,
        lineHeight: 23,
        textAlign: "center",
        color: "#4b5563",
        marginBottom: 22,
    },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 10,
    },
    modalButton: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: "center",
    },
    cancelButton: {
        backgroundColor: "#6b7280",
    },
    confirmButton: {
        backgroundColor: "#dc2626",
    },
    modalButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
});

export default LogoutModal;
