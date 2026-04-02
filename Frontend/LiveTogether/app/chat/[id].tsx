import React, { useEffect, useRef, useState } from "react";
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
} from "react-native";
import {Stack, useLocalSearchParams} from "expo-router";
import * as SecureStore from "expo-secure-store";
import { listChatMessages, sendMessage, getChatParticipants, getUserById } from "@/services/api";
import Ionicons from '@expo/vector-icons/Ionicons';
import {useRouter} from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

interface Message {
    message_id: number;
    chat_id: number;
    sender_id: number;
    content: string;
    sent_at: string;
}

interface User {
    id: number;
    name: string;
    email?: string;
}

export default function ChatScreen() {
    const { id, name } = useLocalSearchParams();
    const chatId = Number(id);
    const chatName = typeof name === "string" ? name : "Chat";
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [messages, setMessages] = useState<Message[]>([]);
    const flatListRef = useRef<FlatList<Message>>(null);
    const [loading, setLoading] = useState(true);
    const [input, setInput] = useState("");
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [currentChatName , setCurrentChatName] = useState(chatName);

    useEffect(() => {
        const loadUserId = async () => {
            const storedId = await SecureStore.getItemAsync("userId");
            if (storedId) setCurrentUserId(Number(storedId));
        };
        loadUserId();
        getChatTitle();
    }, []);

    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const res = await listChatMessages(chatId);
                const arr: Message[] = Array.isArray(res) ? res : res.data ?? [];
                arr.sort((a, b) => Date.parse(a.sent_at) - Date.parse(b.sent_at));
                setMessages(arr);
            } catch (err) {
                console.log("Fehler beim Laden der Nachrichten:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMessages();
    }, [chatId]);

    const getParticipants = () => {
        return getChatParticipants(chatId).then((res) => {
            return res;
        }).catch(() => "Teilnehmer");
    }

    const handleSend = async () => {
        if (!input.trim() || currentUserId === null) return;
        try {
            const newMsg = await sendMessage(chatId, input);
            setMessages((prev) => [...prev, newMsg]);
            setInput("");
        } catch (err) {
            console.log("Fehler beim Senden:", err);
        }
    };

    const getChatTitle = async () => {
        let participants = await getParticipants();
        console.log("Teilnehmer im Chat:", participants);
        if(participants.length !== 2) setCurrentChatName(chatName);
        else {
            setCurrentChatName(participants.filter((p: User) => p.id !== currentUserId)[0]?.first_name || chatName);
        }
    }

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

    const chatHeader = () => {
        return (
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={28} color="black" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>{currentChatName}</Text>

                <TouchableOpacity onPress={() => router.navigate(`/chat/${chatId}/info?name=${encodeURIComponent(currentChatName)}`)}>
                    <Ionicons name="information-circle" size={28} color="black" />
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <>
        <Stack.Screen options={{ headerShown: false }} />
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        {chatHeader()}

        <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
            >
                {/* Schließt die Tastatur, wenn man außerhalb tippt */}
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={{ flex: 1 }}>
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            renderItem={renderItem}
                            keyExtractor={(item) => item.message_id.toString()}
                            contentContainerStyle={styles.messagesContent}
                            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
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
    safeArea: { flex: 1, backgroundColor: "#f8f9fa" },
    container: { flex: 1 },
    messagesContent: {
        flexGrow: 1,
        justifyContent: "flex-end",
        padding: 10,
    },
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
        paddingVertical: 10,
        marginRight: 10,
        fontSize: 16,
        minHeight: 44,
        textAlignVertical: "center",
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
        justifyContent: "space-between",
        paddingHorizontal: 15,
        paddingVertical: 25,
        backgroundColor: "#f8f9fa",
        borderBottomWidth: 1,
        borderBottomColor: "#ddd",
    },

    headerTitle: {
        fontSize: 22,
        fontWeight: "600",
        marginLeft: 10,
    },

});
