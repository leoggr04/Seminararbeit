import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Modal, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { createNewChat, listChats } from "@/services/api";
import { useUser } from "@/components/UserContext";

interface Chat {
    chat_id: number;
    created_at: string;
    // Optional: falls dein Backend auch Teilnehmer zurückgibt
    chat_name?: string;
    avatar?: string;
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
    const [participantIds, setParticipantIds] = useState<number[]>([]);

    const fetchChats = async () => {
        try {
            const data = await listChats(); // ruft /api/chats auf
            setChats(data); // speichert das Array in den State
        } catch (error) {
            console.log("Fehler beim Laden der Chats:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchChats();
    }, []);

    const handleCreateChat = async () => {
        if(!participantIds.includes(Number(user?.id))) {
            participantIds.push(Number(user?.id));
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
            setParticipantIds([]);
        } catch (error) {
            console.log("Fehler beim Erstellen des Chats:", error);
        } finally {
            setIsCreatingChat(false);
        }
    };

    const addParticipantId = () => {
        const id = Number(participantInput.trim());
        if (!Number.isFinite(id) || id <= 0) return;
        if (participantIds.includes(id)) return;
        setParticipantIds((prev) => [...prev, id]);
        setParticipantInput("");
    };

    const removeParticipantId = (id: number) => {
        setParticipantIds((prev) => prev.filter((x) => x !== id));
    };



    const renderChatItem = ({ item }: { item: Chat }) => {
        // Zufallszahl zwischen 1 und 9
        const randomNum = Math.floor(Math.random() * 9) + 1;

        // Bild-URL mit zufälliger Zahl
        const avatarUri = item.avatar || `https://randomuser.me/api/portraits/lego/${randomNum}.jpg`;

        return (
            <TouchableOpacity
                style={styles.chatItem}
                onPress={() => router.push({
                    pathname: `/chat/[id]`,
                    params: { id: item.chat_id, name: item.chat_name }
                })}
                activeOpacity={0.8}
            >
                <Image
                    source={{ uri: avatarUri }}
                    style={styles.avatar}
                />
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

                        <Text style={styles.modalLabel}>Teilnehmer-ID hinzufügen</Text>
                        <View style={styles.modalRow}>
                            <TextInput
                                style={[styles.modalInput, { flex: 1 }]}
                                placeholder="User-ID"
                                keyboardType="number-pad"
                                value={participantInput}
                                onChangeText={setParticipantInput}
                            />
                            <TouchableOpacity style={styles.addIdButton} onPress={addParticipantId}>
                                <Text style={styles.addIdButtonText}>+</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.chipContainer}>
                            {participantIds.map((id) => (
                                <TouchableOpacity
                                    key={id}
                                    style={styles.chip}
                                    onPress={() => removeParticipantId(id)}
                                >
                                    <Text style={styles.chipText}>ID {id} ✕</Text>
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
                                disabled={isCreatingChat || participantIds.length === 0}
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
    chatItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, padding: 12, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 6, elevation: 1 },
    avatar: { width: 60, height: 60, borderRadius: 30, marginRight: 12 },
    chatContent: { flex: 1, borderBottomColor: "#eee" },
    chatHeader: { flexDirection: "row", justifyContent: "space-between" },
    chatName: { fontSize: 18, fontWeight: "600" },
    chatTime: { fontSize: 14, color: "#666" },
    chatMessage: { fontSize: 15, color: "#888", marginTop: 2 },
});
