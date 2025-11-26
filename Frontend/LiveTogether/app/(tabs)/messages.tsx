import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import {listChats} from "@/services/api";

interface Chat {
    chat_id: number;
    created_at: string;
    // Optional: falls dein Backend auch Teilnehmer zurückgibt
    name?: string;
    avatar?: string;
}

const Messages = () => {
    const router = useRouter();
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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

        fetchChats();
    }, []);



    const renderChatItem = ({ item }: { item: Chat }) => {
        // Zufallszahl zwischen 1 und 9
        const randomNum = Math.floor(Math.random() * 9) + 1;

        // Bild-URL mit zufälliger Zahl
        const avatarUri = item.avatar || `https://randomuser.me/api/portraits/lego/${randomNum}.jpg`;

        return (
            <TouchableOpacity
                style={styles.chatItem}
                onPress={() => router.push(`/chat/${item.chat_id}`)}
                activeOpacity={0.8}
            >
                <Image
                    source={{ uri: avatarUri }}
                    style={styles.avatar}
                />
                <View style={styles.chatContent}>
                    <View style={styles.chatHeader}>
                        <Text style={styles.chatName}>{item.name || `Chat ${item.chat_id}`}</Text>
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
            <Text style={styles.header}>Nachrichten</Text>
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
    header: { fontSize: 28, fontWeight: "700", marginBottom: 40, textAlign: "center" },
    chatItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, padding: 12, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 6, elevation: 1 },
    avatar: { width: 60, height: 60, borderRadius: 30, marginRight: 12 },
    chatContent: { flex: 1, borderBottomColor: "#eee" },
    chatHeader: { flexDirection: "row", justifyContent: "space-between" },
    chatName: { fontSize: 18, fontWeight: "600" },
    chatTime: { fontSize: 14, color: "#666" },
    chatMessage: { fontSize: 15, color: "#888", marginTop: 2 },
});
