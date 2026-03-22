import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type FeedbackModalProps = {
    visible: boolean;
    title: string;
    message: string;
    buttonText?: string;
    onClose: () => void;
};

const FeedbackModal: React.FC<FeedbackModalProps> = ({
    visible,
    title,
    message,
    buttonText = "Nochmal versuchen",
    onClose,
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
                    <Text style={styles.modalMessage}>{message}</Text>

                    <TouchableOpacity style={styles.modalButton} onPress={onClose}>
                        <Text style={styles.modalButtonText}>{buttonText}</Text>
                    </TouchableOpacity>
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
    modalButton: {
        backgroundColor: "#2563eb",
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: "center",
    },
    modalButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
});

export default FeedbackModal;