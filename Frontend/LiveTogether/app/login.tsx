import React, {useEffect, useState} from "react";
import {View, Text, TextInput, TouchableOpacity, StyleSheet, Alert} from "react-native";
import {useNavigation, useRouter} from "expo-router";
import Icon from "@expo/vector-icons/Ionicons";
import {getUserById, loginUser, refreshAccessToken} from "@/services/api"; // 👈 importiere deinen Service
import {useUser} from "@/components/UserContext";
import * as SecureStore from "expo-secure-store";
import {User} from "@/types/types";

export default function LoginScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const router = useRouter();
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const {login} = useUser();
    const devmode = false;

    useEffect(() => {
        const checkToken = async () => {
            try {
                const accessToken = await SecureStore.getItemAsync("authToken");
                const refreshTokenLokal = await SecureStore.getItemAsync("refreshToken");
                const userId = await SecureStore.getItemAsync("userId");
                // Wenn Token existieren, ggf. Userdaten abrufen und einloggen
                if (accessToken && refreshTokenLokal && userId && !devmode) {
                    // Beispiel: User-Daten von API holen (optional)
                    // const response = await getUserById(userId, accessToken);
                    // const user = response.data.user;

                    // Einfachheitshalber Token nutzen, wenn du bereits User im Token hast:
                    // login(user.name, user.email, user.image, user.id);
                    console.log("Alter Token:", accessToken);
                    // Weiterleitung
                    const response = await getUserById(userId);
                    console.log("Test:");
                    const newToken = await refreshAccessToken(refreshTokenLokal);

                    const accesTokenNew = newToken.data.accessToken;
                    const refreshTokenNew = newToken.data.refreshToken;

                    // neue Tokens speichern
                    await SecureStore.setItemAsync("authToken", String(accesTokenNew));
                    await SecureStore.setItemAsync("refreshToken", String(refreshTokenNew));
                    console.log("Neuer Token:", accesTokenNew);

                    const user = response.data.data;

                    login(user.first_name, user.last_name, user.email, user.image, user.user_id);

                    router.replace("/(tabs)/feed");
                }
            } catch (error) {
                console.error("Token-Check fehlgeschlagen:", error);
            } finally {
                setLoading(false);
            }
        };

        checkToken();
    }, []);



    const handleLogin = async () => {
        // Prüfen, ob E-Mail und Passwort eingegeben wurden
        if (!email || !password) {
            Alert.alert("Fehler", "Bitte E-Mail und Passwort eingeben.");
            return;
        }

        try {
            setLoading(true); // Ladezustand aktivieren

            // API-Request für Login
            const response = await loginUser(email, password);

            // Response auspacken: Token(s) und Userdaten
            const { accessToken, refreshToken, user } = response.data;

            if (!accessToken || !refreshToken || !user) {
                throw new Error("Ungültige Login-Antwort vom Server.");
            }

            // Token(s) in SecureStore speichern (müssen Strings sein)
            await SecureStore.setItemAsync("authToken", String(accessToken));
            await SecureStore.setItemAsync("refreshToken", String(refreshToken));
            await SecureStore.setItemAsync("userId", String(user.user_id));


            // User in Context speichern
            login(user.first_name, user.last_name, user.email, undefined, user.user_id);

            // Optional: Willkommen-Alert
            Alert.alert("Erfolg", `Willkommen zurück, ${user.first_name || email}!`);

            // Weiterleitung zum Feed
            router.replace("/(tabs)/feed");

        } catch (error: any) {
            console.error(error);
            // Fehlernachricht aus der API oder generisch
            const message =
                error.response?.data?.message ||
                error.message ||
                "Login fehlgeschlagen. Bitte überprüfe deine Eingaben.";
            Alert.alert("Fehler", message);
        } finally {
            setLoading(false); // Ladezustand deaktivieren
        }
    };


    return (
        <View style={styles.container}>
            <Text style={styles.title}>Login</Text>

            {/* E-Mail Input */}
            <View style={styles.inputContainer}>
                <Icon name="mail-outline" size={24} color="#888" style={styles.icon} />
                <TextInput
                    style={styles.input}
                    placeholder="E-Mail"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
            </View>

            {/* Passwort Input */}
            <View style={styles.inputContainerPswd}>
                <Icon name="lock-closed-outline" size={24} color="#888" style={styles.icon} />
                <TextInput
                    style={styles.input}
                    placeholder="Passwort"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />
            </View>

            <View style={{ paddingTop: 5, justifyContent: 'center' }}>

                {/* Hinweis über dem Login */}
                <Text style={{ fontSize: 15, marginBottom: 30 }}>
                    Noch kein Konto?{' '}
                    <Text
                        style={{ color: 'blue', textDecorationLine: 'underline' }}
                        onPress={() => router.push("/signup")}
                    >
                        Hier
                    </Text>{' '}
                    klicken zum Registrieren.
                </Text>
                </View>

            <TouchableOpacity style={styles.button} onPress={handleLogin}>
                <Text style={styles.buttonText}>Einloggen</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        padding: 24,
        backgroundColor: "#f8f9fa",
    },
    title: {
        fontSize: 28,
        fontWeight: "700",
        marginBottom: 40,
        textAlign: "center",
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#ddd",
        marginBottom: 16,
        paddingHorizontal: 12,
        height: 50,
    },
    inputContainerPswd: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#ddd",
        marginBottom: 5,
        paddingHorizontal: 12,
        height: 50,
    },
    icon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
    },
    button: {
        backgroundColor: "#007bff",
        paddingVertical: 14,
        borderRadius: 12,
        marginTop: 10,
    },
    buttonText: {
        color: "#fff",
        fontWeight: "600",
        textAlign: "center",
        fontSize: 18,
    },
});
