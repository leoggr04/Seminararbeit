import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    TextInput,
    Modal,
    ActivityIndicator,
    Alert,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { listChatParticipants, deleteChatParticipant, addParticipantToChat, getUserByEmail } from "@/services/api";
import Ionicons from "@expo/vector-icons/Ionicons";

interface Participant {
    id?: number;
    user_id?: number;
    name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    [key: string]: any;
}

export default function ChatInfoScreen() {
    const { id, name } = useLocalSearchParams();
    const chatId = Number(id);
    const chatName = typeof name === "string" ? name : "Chat";
    const router = useRouter();
    
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [userEmailInput, setUserEmailInput] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    const fetchParticipants = async () => {
        try {
            const res = await listChatParticipants(chatId);
            console.log("Participants data:", res);
            let participantsArray = Array.isArray(res) ? res : res?.data || [];
            participantsArray = participantsArray.map((p: any) => ({
                ...p,
                id: p.id || p.user_id,
                name: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unbekannt',
            }));
            setParticipants(participantsArray);
        } catch (err) {
            console.log("Fehler beim Laden der Teilnehmer:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchParticipants();
    }, [chatId]);

    const handleAddParticipant = async () => {
        const email = userEmailInput.trim().toLowerCase();
        if (!email) return;
        
        setIsAdding(true);
        try {
            const userRes = await getUserByEmail(email);
            const user = userRes?.data?.data || userRes?.data || userRes;
            const userId = Number(user?.user_id || user?.id);

            if (!Number.isFinite(userId) || userId <= 0) {
                Alert.alert("Fehler", "Kein Nutzer mit dieser E-Mail gefunden.");
                return;
            }

            if (participants.some((p) => Number(p.id) === userId)) {
                Alert.alert("Hinweis", "Dieser Nutzer ist bereits im Chat.");
                return;
            }

            await addParticipantToChat(chatId, userId);
            setUserEmailInput("");
            setIsModalVisible(false);
            await fetchParticipants();
        } catch (err) {
            console.log("Fehler beim Hinzufügen des Teilnehmers:", err);
            Alert.alert("Fehler", "Nutzer konnte nicht hinzugefügt werden.");
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteParticipant = async (userId: number) => {
        try {
            await deleteChatParticipant(chatId, userId);
            await fetchParticipants();
        } catch (err) {
            console.log("Fehler beim Löschen des Teilnehmers:", err);
        }
    };

    const renderParticipantItem = ({ item }: { item: Participant }) => {
        if (!item?.id) return null;
        return (
            <View style={styles.participantItem}>
                <View style={styles.participantInfo}>
                    <Text style={styles.participantName}>{item.name || "Unbekannt"}</Text>
                    {item.email && <Text style={styles.participantEmail}>{item.email}</Text>}
                </View>
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteParticipant(item.id!)}
                >
                    <Ionicons name="trash" size={20} color="#ff4444" />
                </TouchableOpacity>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
                <ActivityIndicator size="large" color="#4e9bff" />
            </View>
        );
    }

    return (
        <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={28} color="black" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{chatName} - Info</Text>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setIsModalVisible(true)}
                >
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                    Teilnehmer ({participants.length})
                </Text>
                <FlatList
                    data={participants.filter(p => p?.id)}
                    renderItem={renderParticipantItem}
                    keyExtractor={(item) => String(item?.id || Math.random())}
                    scrollEnabled={false}
                />
            </View>

            {/* Add Participant Modal */}
            <Modal
                visible={isModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Teilnehmer hinzufügen</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="E-Mail"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            value={userEmailInput}
                            onChangeText={setUserEmailInput}
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonSecondary]}
                                onPress={() => setIsModalVisible(false)}
                            >
                                <Text style={styles.modalButtonSecondaryText}>Abbrechen</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonPrimary]}
                                onPress={handleAddParticipant}
                                disabled={isAdding}
                            >
                                <Text style={styles.modalButtonPrimaryText}>
                                    {isAdding ? "..." : "Hinzufügen"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8f9fa",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 15,
        paddingVertical: 15,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#ddd",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "600",
        flex: 1,
        textAlign: "center",
    },
    addButton: {
        backgroundColor: "#4e9bff",
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    section: {
        padding: 15,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 12,
    },
    participantItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#fff",
        padding: 12,
        borderRadius: 10,
        marginBottom: 10,
    },
    participantInfo: {
        flex: 1,
    },
    participantName: {
        fontSize: 16,
        fontWeight: "600",
    },
    participantEmail: {
        fontSize: 12,
        color: "#666",
        marginTop: 4,
    },
    deleteButton: {
        paddingHorizontal: 10,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        padding: 20,
    },
    modalCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 16,
    },
    modalInput: {
        backgroundColor: "#f2f2f2",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 16,
    },
    modalActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 10,
    },
    modalButton: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
    },
    modalButtonSecondary: {
        backgroundColor: "#f2f2f2",
    },
    modalButtonSecondaryText: {
        color: "#333",
        fontWeight: "600",
    },
    modalButtonPrimary: {
        backgroundColor: "#4e9bff",
    },
    modalButtonPrimaryText: {
        color: "#fff",
        fontWeight: "600",
    },
});
