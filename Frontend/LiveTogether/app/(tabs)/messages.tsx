import React from "react";
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

const chats = [
    {
        id: "1",
        name: "Anna Becker",
        message: "Hey, wie geht’s dir?",
        time: "10:45",
        image: "https://randomuser.me/api/portraits/women/44.jpg",
    },
    {
        id: "2",
        name: "Lukas Schmidt",
        message: "Kommst du morgen?",
        time: "Gestern",
        image: "https://randomuser.me/api/portraits/men/32.jpg",
    },
    {
        id: "3",
        name: "Sarah Nguyen",
        message: "Das war so lustig 😂",
        time: "Mo",
        image: "https://randomuser.me/api/portraits/women/65.jpg",
    },
];

const Messages = () => {
    const router = useRouter();

    const renderChatItem = ({ item }: { item: typeof chats[0] }) => (
        <TouchableOpacity
            style={styles.chatItem}
            onPress={() => router.push(`/chat/${item.id}`)}
            activeOpacity={0.8}
        >
            <Image source={{ uri: item.image }} style={styles.avatar} />
            <View style={styles.chatContent}>
                <View style={styles.chatHeader}>
                    <Text style={styles.chatName}>{item.name}</Text>
                    <Text style={styles.chatTime}>{item.time}</Text>
                </View>
                <Text style={styles.chatMessage} numberOfLines={1}>
                    {item.message}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Nachrichten</Text>
            <FlatList
                data={chats}
                renderItem={renderChatItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
            />
        </View>
    );
};

export default Messages;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8f9fa",
        paddingTop: 80,
        paddingHorizontal: 20,
    },
    header: {
        fontSize: 28,
        fontWeight: "700",
        marginBottom: 40,
        textAlign: "center",
    },
    chatItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 12,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 1,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 12,
    },
    chatContent: {
        flex: 1,
        borderBottomColor: "#eee",
    },
    chatHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    chatName: {
        fontSize: 18,
        fontWeight: "600",
    },
    chatTime: {
        fontSize: 14,
        color: "#666",
    },
    chatMessage: {
        fontSize: 15,
        color: "#888",
        marginTop: 2,
    },
});
