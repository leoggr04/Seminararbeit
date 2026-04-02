/*
Component for showing the participants of a activity.
Modal needs to know the ID of a Activity.

Creator: David Pleyer
Version: v1
*/

import { getAlLParticipantsOfPost } from "@/services/api";
import * as SecureStore from "expo-secure-store";
import { Trash2, Users, UserX, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

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
    activityOwnerId: number;
    onClose: () => void;
};

const ParticipantsModal: React.FC<ParticipantsModalProps> = ({ visible, postId, activityOwnerId, onClose }) => {
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);

    useEffect(() => {
        const loadUserId = async () => {
            const id = await SecureStore.getItemAsync("userId");
            if (id) setCurrentUserId(Number(id));
        };

        loadUserId();
    }, []);

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

    const handleRemoveParticipant = (userId: number) => {
        // Placeholder function - Backend-Endpunkt wird später implementiert
        console.log(`Entfernen des Nutzers ${userId} aus der Aktivität ${postId}`);
    };

    const renderParticipant = ({ item }: { item: Participant }) => {
        const isMe = currentUserId != null && item.user_id === currentUserId;
        const isOwner = currentUserId != null && currentUserId === activityOwnerId;
        const canRemove = isOwner && !isMe;
        const displayName = `${item.first_name} ${item.last_name}`;

        return (
            <View style={[styles.participantRow, isMe && styles.participantRowMe]}>
                <Users size={24} color={isMe ? "#1d4ed8" : "#007bff"} style={{ marginRight: 12 }} />
                <Text style={[styles.participantName, isMe && styles.participantNameMe]}>{displayName}</Text>
                {isMe && (
                    <View style={styles.meBadge}>
                        <Text style={styles.meBadgeText}>Du</Text>
                    </View>
                )}
                {canRemove && (
                    <TouchableOpacity onPress={() => handleRemoveParticipant(item.user_id)} style={styles.deleteButton}>
                        <Trash2 size={20} color="#dc2626" />
                    </TouchableOpacity>
                )}
            </View>
        );
    };

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
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: "#f2f2f2",
    },
    participantRowMe: {
        backgroundColor: "#e8f1ff",
        borderWidth: 1,
        borderColor: "#bfdbfe",
    },
    deleteButton: {
        marginLeft: "auto",
        padding: 6,
    },
    participantName: {
        fontSize: 16,
        fontWeight: "500",
        color: "#333",
    },
    participantNameMe: {
        color: "#1e3a8a",
        fontWeight: "700",
    },
    meBadge: {
        marginLeft: "auto",
        backgroundColor: "#2563eb",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    meBadgeText: {
        color: "white",
        fontSize: 12,
        fontWeight: "700",
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
