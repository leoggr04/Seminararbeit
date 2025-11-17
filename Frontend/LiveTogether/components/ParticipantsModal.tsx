/*
Component for showing the participants of a activity.
Modal needs to know the ID of a Activity.

Creator: David Pleyer
Version: v1
*/

import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    FlatList,
    ActivityIndicator,
} from "react-native";
import { getAlLParticipantsOfPost } from "@/services/api";
import { Users, UserX, X } from "lucide-react-native";

type Participant = {
    post_id: number;
    user_id: number;
    joined_at: string;
    first_name: string;
    last_name: string;
    email: string;
};

type ParticipantsModalProps = {
    visible: boolean;
    postId: number;
    onClose: () => void;
};

const ParticipantsModal: React.FC<ParticipantsModalProps> = ({ visible, postId, onClose }) => {
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!visible) return;

        const fetchParticipants = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getAlLParticipantsOfPost(postId);
                setParticipants(data);
            } catch (err: any) {
                console.error("Fehler beim Laden der Teilnehmer:", err);
                setError(err?.message || "Fehler beim Laden");
            } finally {
                setLoading(false);
            }
        };

        fetchParticipants();
    }, [visible, postId]);

    const renderParticipant = ({ item }: { item: Participant }) => (
        <View style={styles.participantRow}>
            <Users size={24} color="#007bff" style={{ marginRight: 12 }} />
            <Text style={styles.participantName}>{`${item.first_name} ${item.last_name}`}</Text>
        </View>
    );

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Teilnehmer</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="red" />
                        </TouchableOpacity>
                    </View>

                    {/* Inhalt */}
                    {loading ? (
                        <View style={styles.center}>
                            <ActivityIndicator size="large" />
                        </View>
                    ) : error ? (
                        <View style={styles.center}>
                            <Text style={{ color: "red" }}>{error}</Text>
                        </View>
                    ) : participants.length === 0 ? (
                        <View style={styles.noParticipants}>
                            <UserX size={60} color="#ccc" />
                            <Text style={styles.noParticipantsText}>Noch keine Teilnehmer</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={participants}
                            keyExtractor={(item) => item.user_id.toString()}
                            renderItem={renderParticipant}
                            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                            contentContainerStyle={{ paddingBottom: 20 }}
                        />
                    )}
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
        padding: 16,
    },
    modalContainer: {
        width: "100%",
        maxHeight: "80%",
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 20,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        minHeight: 100,
    },
    participantRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderRadius: 8,
        backgroundColor: "#f2f2f2",
    },
    participantName: {
        fontSize: 16,
        fontWeight: "500",
        color: "#333",
    },
    noParticipants: {
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 40,
    },
    noParticipantsText: {
        marginTop: 12,
        fontSize: 16,
        color: "#888",
        fontWeight: "500",
    },
});

export default ParticipantsModal;
