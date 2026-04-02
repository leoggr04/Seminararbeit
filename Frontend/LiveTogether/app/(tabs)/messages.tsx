import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Modal, TextInput, Alert } from "react-native";
import { useRouter } from "expo-router";
import { connectToChatsUpdates, createNewChat, getUserByEmail, listChats } from "@/services/api";
import { useUser } from "@/components/UserContext";

interface Chat {
    chat_id: number;
    created_at: string;
    // Optional: falls dein Backend auch Teilnehmer zurückgibt
    chat_name?: string;
    avatar?: string;
}

interface SelectedParticipant {
    id: number;
    email: string;
}

const Messages = () => {
    const router = useRouter();
    const { user } = useUser();
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreatingChat, setIsCreatingChat] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [chatName, setChatName] = useState("");
    const [participantInput, setParticipantInput] = useState("");
    const [selectedParticipants, setSelectedParticipants] = useState<SelectedParticipant[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const chatsSocketRef = useRef<WebSocket | null>(null);

    const fetchChats = useCallback(async () => {
        try {
            const data = await listChats(); // ruft /api/chats auf
            setChats(data); // speichert das Array in den State
        } catch (error) {
            console.log("Fehler beim Laden der Chats:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchChats();
        setRefreshing(false);
    }, [fetchChats]);

    useEffect(() => {
        fetchChats();
    }, [fetchChats]);

    useEffect(() => {
        let isMounted = true;

        const setupSocket = async () => {
            try {
                const socket = await connectToChatsUpdates(() => {
                    if (isMounted) {
                        fetchChats();
                    }
                });
                chatsSocketRef.current = socket;
            } catch (error) {
                console.log("[WS] Chats live update nicht verbunden:", error);
            }
        };

        setupSocket();

        return () => {
            isMounted = false;
            if (chatsSocketRef.current) {
                chatsSocketRef.current.close();
                chatsSocketRef.current = null;
            }
        };
    }, [fetchChats]);

    const handleCreateChat = async () => {
        const participantIds = selectedParticipants.map((p) => p.id);
        const currentUserId = Number(user?.id);

        if (Number.isFinite(currentUserId) && currentUserId > 0 && !participantIds.includes(currentUserId)) {
            participantIds.push(currentUserId);
        }

        if (isCreatingChat || participantIds.length === 0) return;
        setIsCreatingChat(true);
        try {
            const name = chatName.trim() || "Neuer Chat";
            await createNewChat(name, participantIds);
            await fetchChats();
            setIsModalVisible(false);
            setChatName("");
            setParticipantInput("");
            setSelectedParticipants([]);
        } catch (error) {
            console.log("Fehler beim Erstellen des Chats:", error);
        } finally {
            setIsCreatingChat(false);
        }
    };

    const addParticipantId = async () => {
        const email = participantInput.trim().toLowerCase();
        if (!email) return;

        try {
            const userRes = await getUserByEmail(email);
            const user = userRes?.data?.data || userRes?.data || userRes;
            const id = Number(user?.user_id || user?.id);

            if (!Number.isFinite(id) || id <= 0) {
                Alert.alert("Fehler", "Kein Nutzer mit dieser E-Mail gefunden.");
                return;
            }

            if (selectedParticipants.some((p) => p.id === id)) {
                Alert.alert("Hinweis", "Dieser Nutzer wurde bereits hinzugefügt.");
                return;
            }

            setSelectedParticipants((prev) => [...prev, { id, email }]);
            setParticipantInput("");
        } catch (error) {
            console.log("Fehler beim Suchen des Users per E-Mail:", error);
            Alert.alert("Fehler", "Nutzer konnte nicht über E-Mail gefunden werden.");
        }
    };

    const removeParticipantId = (id: number) => {
        setSelectedParticipants((prev) => prev.filter((x) => x.id !== id));
    };



    const renderChatItem = ({ item }: { item: Chat }) => {
        return (
            <TouchableOpacity
                style={styles.chatItem}
                onPress={() => router.push({
                    pathname: `/chat/[id]`,
                    params: { id: item.chat_id, name: item.chat_name }
                })}
                activeOpacity={0.8}
            >
                <View style={styles.chatContent}>
                    <View style={styles.chatHeader}>
                        <Text style={styles.chatName}>{item.chat_name || `Chat ${item.chat_id}`}</Text>
                        <Text style={styles.chatTime}>{new Date(item.created_at).toLocaleDateString()}</Text>
                    </View>
                    <Text style={styles.chatMessage} numberOfLines={1}>
                        Nachrichtenvorschau...
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };


    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
                <ActivityIndicator size="large" color="#000" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.header}>Nachrichten</Text>
                <TouchableOpacity
                    style={styles.createButton}
                    onPress={() => setIsModalVisible(true)}
                >
                    <Text style={styles.createButtonText}>Neu</Text>
                </TouchableOpacity>
            </View>
            <Modal
                visible={isModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Neuen Chat erstellen</Text>

                        <Text style={styles.modalLabel}>Chatname</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="z.B. Friday Running Group"
                            value={chatName}
                            onChangeText={setChatName}
                        />

                        <Text style={styles.modalLabel}>Teilnehmer per E-Mail hinzufügen</Text>
                        <View style={styles.modalRow}>
                            <TextInput
                                style={[styles.modalInput, { flex: 1 }]}
                                placeholder="E-Mail"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                value={participantInput}
                                onChangeText={setParticipantInput}
                            />
                            <TouchableOpacity style={styles.addIdButton} onPress={addParticipantId}>
                                <Text style={styles.addIdButtonText}>+</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.chipContainer}>
                            {selectedParticipants.map((participant) => (
                                <TouchableOpacity
                                    key={participant.id}
                                    style={styles.chip}
                                    onPress={() => removeParticipantId(participant.id)}
                                >
                                    <Text style={styles.chipText}>{participant.email} ✕</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonSecondary]}
                                onPress={() => setIsModalVisible(false)}
                            >
                                <Text style={styles.modalButtonSecondaryText}>Abbrechen</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonPrimary]}
                                onPress={handleCreateChat}
                                disabled={isCreatingChat || selectedParticipants.length === 0}
                            >
                                <Text style={styles.modalButtonPrimaryText}>Erstellen</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            <FlatList
                data={chats}
                renderItem={renderChatItem}
                keyExtractor={(item) => item.chat_id.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                refreshing={refreshing}
                onRefresh={onRefresh}
            />
        </View>
    );
};

export default Messages;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f8f9fa", paddingTop: 80, paddingHorizontal: 20 },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 40,
    },
    header: { fontSize: 28, fontWeight: "700" },
    createButton: {
        backgroundColor: "#4e9bff",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
    },
    createButtonText: { color: "#fff", fontWeight: "600" },
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
    modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
    modalLabel: { fontSize: 14, fontWeight: "600", marginTop: 8, marginBottom: 6 },
    modalInput: {
        backgroundColor: "#f2f2f2",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    modalRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    addIdButton: {
        backgroundColor: "#4e9bff",
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    addIdButtonText: { color: "#fff", fontSize: 20, fontWeight: "700" },
    chipContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
    chip: {
        backgroundColor: "#e8f0ff",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 14,
    },
    chipText: { color: "#2b5ad5", fontWeight: "600" },
    modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 16 },
    modalButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
    modalButtonSecondary: { backgroundColor: "#f2f2f2" },
    modalButtonSecondaryText: { color: "#333", fontWeight: "600" },
    modalButtonPrimary: { backgroundColor: "#4e9bff" },
    modalButtonPrimaryText: { color: "#fff", fontWeight: "600" },
    chatItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
    chatContent: { flex: 1, borderBottomColor: "#eee" },
    chatHeader: { flexDirection: "row", justifyContent: "space-between" },
    chatName: { fontSize: 18, fontWeight: "600" },
    chatTime: { fontSize: 14, color: "#666" },
    chatMessage: { fontSize: 15, color: "#888", marginTop: 2 },
});
