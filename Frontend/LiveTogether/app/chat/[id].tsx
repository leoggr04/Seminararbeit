import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    TouchableWithoutFeedback,
    SafeAreaView,
} from "react-native";
import {Stack, useLocalSearchParams} from "expo-router";
import * as SecureStore from "expo-secure-store";
import { listChatMessages, sendMessage } from "@/services/api";
import Ionicons from '@expo/vector-icons/Ionicons';
import {useRouter} from "expo-router";

interface Message {
    message_id: number;
    chat_id: number;
    sender_id: number;
    content: string;
    sent_at: string;
}

export default function ChatScreen() {
    const { id } = useLocalSearchParams();
    const chatId = Number(id);
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [input, setInput] = useState("");
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);

    useEffect(() => {
        const loadUserId = async () => {
            const storedId = await SecureStore.getItemAsync("userId");
            if (storedId) setCurrentUserId(Number(storedId));
        };
        loadUserId();
    }, []);

    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const res = await listChatMessages(chatId);
                const arr: Message[] = Array.isArray(res) ? res : res.data ?? [];
                arr.sort((a, b) => Date.parse(b.sent_at) - Date.parse(a.sent_at));
                setMessages(arr);
            } catch (err) {
                console.log("Fehler beim Laden der Nachrichten:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMessages();
    }, [chatId]);


    const handleSend = async () => {
        if (!input.trim() || currentUserId === null) return;
        try {
            const newMsg = await sendMessage(chatId, input);
            setMessages((prev) => [newMsg, ...prev]);
            setInput("");
        } catch (err) {
            console.log("Fehler beim Senden:", err);
        }
    };

    const renderItem = ({ item }: { item: Message }) => {
        const date = new Date(item.sent_at);
        const isMine = item.sender_id === currentUserId;
        return (
            <View
                style={[
                    styles.messageContainer,
                    isMine ? styles.myMessage : styles.theirMessage,
                ]}
            >
                <Text
                    style={[
                        styles.messageText,
                        isMine ? styles.myMessageText : styles.theirMessageText,
                    ]}
                >
                    {item.content}
                </Text>
                <Text
                    style={[
                        styles.messageTime,
                        isMine ? styles.myMessageTime : styles.theirMessageTime,
                    ]}
                >
                    {isNaN(date.getTime())
                        ? ""
                        : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
            </View>
        );
    };

    return (
        <>
        <Stack.Screen options={{ headerShown: false }} />
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={28} color="black" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Chat {chatId}</Text>
        </View>

        <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 95 : 95}
            >
                {/* Schließt die Tastatur, wenn man außerhalb tippt */}
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={{ flex: 1 }}>
                        <FlatList
                            data={messages}
                            renderItem={renderItem}
                            keyExtractor={(item) => item.message_id.toString()}
                            contentContainerStyle={{ padding: 10 }}
                            inverted
                        />

                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Schreibe eine Nachricht..."
                                value={input}
                                onChangeText={setInput}
                                multiline
                            />
                            <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                                <Text style={styles.sendButtonText}>Senden</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </SafeAreaView>
            </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    messageContainer: {
        maxWidth: "70%",
        padding: 10,
        borderRadius: 12,
        marginVertical: 5,
    },
    myMessage: { alignSelf: "flex-end", backgroundColor: "#4e9bff" },
    theirMessage: { alignSelf: "flex-start", backgroundColor: "#e5e5ea" },
    messageText: { color: "#fff" },
    myMessageText: { color: "#fff" },
    theirMessageText: { color: "#333" },
    messageTime: { fontSize: 10, marginTop: 4, textAlign: "right" },
    myMessageTime: { color: "#fff" },
    theirMessageTime: { color: "#666" },
    inputContainer: {
        flexDirection: "row",
        padding: 15,
        backgroundColor: "#fff",
        alignItems: "flex-end",
    },
    input: {
        flex: 1,
        backgroundColor: "#f0f0f0",
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 12,
        marginRight: 10,
        fontSize: 16,
        maxHeight: 120, // verhindert zu großes Wachsen
    },
    sendButton: {
        backgroundColor: "#4e9bff",
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    sendButtonText: { color: "#fff", fontWeight: "600" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 15,
        paddingVertical: 25,
        backgroundColor: "#f8f9fa",
        borderBottomWidth: 1,
        borderBottomColor: "#ddd",
        marginTop:22,
    },

    headerTitle: {
        fontSize: 22,
        fontWeight: "600",
        marginLeft: 10,
    },

});
