import React, { useState } from "react";
import {StyleSheet, Text, View, TouchableOpacity, Image, StatusBar, Alert} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useUser } from "@/components/UserContext";
import { useRouter } from "expo-router";
import {MaterialIcons} from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";

const Profile = () => {
    const { user, logout } = useUser();
    const router = useRouter();
    const [image, setImage] = useState<string | null>(null);

    const handleLogout = () => {
        Alert.alert(
            "Abmelden",
            "Möchtest du dich wirklich abmelden?",
            [
                { text: "Abbrechen", style: "cancel" },
                {
                    text: "Ja",
                    style: "destructive",
                    onPress: async () => {
                        await SecureStore.deleteItemAsync("authToken");
                        await SecureStore.deleteItemAsync("refreshToken");
                        await SecureStore.deleteItemAsync("userId");
                        logout();
                        router.replace("/login");
                    },
                },
            ]
        );
    };


    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
            alert("Erlaubnis erforderlich, um Bilder auszuwählen!");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    if (!user) return <Text>Kein User angemeldet</Text>;

    return (
        <View style={styles.container}>
            {/* Profilbild */}
            <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
                {image || user.image ? (
                    <Image source={{ uri: image ?? user.image! }} style={styles.profileImage} />
                ) : (
                    <View style={styles.placeholder}>
                        <Text style={styles.placeholderText}>+</Text>
                    </View>
                )}
            </TouchableOpacity>


            {/* Name & Email */}
            <Text style={styles.name}>{user.first_name} {user.last_name}</Text>
            <Text style={styles.email}>{user.email}</Text>

            {/* Logout Button */}
            <TouchableOpacity style={styles.button} onPress={handleLogout}>
                <MaterialIcons name="logout" size={24} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Logout</Text>
            </TouchableOpacity>
        </View>
    );
};

export default Profile;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        paddingTop: 100,
        backgroundColor: "#f8f9fa",
    },
    imageContainer: {
        marginBottom: 20,
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    placeholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: "#ddd",
        justifyContent: "center",
        alignItems: "center",
    },
    placeholderText: {
        fontSize: 36,
        color: "#888",
    },
    name: {
        fontSize: 28,
        fontWeight: "700",
    },
    email: {
        fontSize: 16,
        color: "#666",
        marginBottom: 30,
    },
    button: {
        backgroundColor: "#FF0800",
        paddingVertical: 14,
        paddingHorizontal: 40,
        borderRadius: 12,
        flexDirection: "row", // Elemente nebeneinander
        alignItems: "center", // vertikal zentrieren
        justifyContent: "center", // optional: horizontal zentrieren
    },
    buttonText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 18,
    },
});
