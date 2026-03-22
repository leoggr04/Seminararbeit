import FeedbackModal from "@/components/FeedbackModal";
import { useUser } from "@/components/UserContext";
import { clearStoredAuth, getUserById, loginUser } from "@/services/api";
import Icon from "@expo/vector-icons/Ionicons";
import axios from "axios";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function LoginScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [feedbackVisible, setFeedbackVisible] = useState(false);
    const [feedbackTitle, setFeedbackTitle] = useState("Fehler");
    const [feedbackMessage, setFeedbackMessage] = useState("");
    const {login, logout} = useUser();
    const devmode = false;

    const showFeedback = (title: string, message: string) => {
        setFeedbackTitle(title);
        setFeedbackMessage(message);
        setFeedbackVisible(true);
    };

    useEffect(() => {
        const checkToken = async () => {
            try {
                setLoading(true);
                const accessToken = await SecureStore.getItemAsync("authToken");
                const refreshTokenLokal = await SecureStore.getItemAsync("refreshToken");
                const userId = await SecureStore.getItemAsync("userId");
                // Wenn Token existieren, ggf. Userdaten abrufen und einloggen
                if (devmode) {

                    router.replace("/(tabs)/feed");
                }

                if (accessToken && refreshTokenLokal && userId && !devmode) {
                    const response = await getUserById(userId);
                    const user = response.data.data;

                    login(user.first_name, user.last_name, user.email, user.image, user.user_id);

                    router.replace("/(tabs)/feed");
                }
            } catch (error) {
                console.error("Token-Check fehlgeschlagen:", error);
                await clearStoredAuth();
                logout();
            } finally {
                setLoading(false);
            }
        };

        checkToken();
    }, []);


    const handleLogin = async () => {
        // Prüfen, ob E-Mail und Passwort eingegeben wurden
        if (!email || !password) {
            showFeedback("Hinweis", "Bitte E-Mail und Passwort eingeben.");
            return;
        }

        try {
            setLoading(true); // Ladezustand aktivieren

            // API-Request für Login
            const response = await loginUser(email, password);

            // Response auspacken: Token(s) und Userdaten
            const {accessToken, refreshToken, user} = response.data;

            if (!accessToken || !refreshToken || !user) {
                throw new Error("Ungültige Login-Antwort vom Server.");
            }

            // Token(s) in SecureStore speichern (müssen Strings sein)
            await SecureStore.setItemAsync("authToken", String(accessToken));
            await SecureStore.setItemAsync("refreshToken", String(refreshToken));
            await SecureStore.setItemAsync("userId", String(user.user_id));

            // Nach Login vollständiges Profil laden (wichtig: Name sofort verfügbar)
            // Fallback auf Login-Response, falls Profil-Request fehlschlägt.
            try {
                const profileResponse = await getUserById(String(user.user_id));
                const fullUser = profileResponse?.data?.data;

                login(
                    fullUser?.first_name ?? user.first_name ?? "",
                    fullUser?.last_name ?? user.last_name ?? "",
                    fullUser?.email ?? user.email,
                    fullUser?.image,
                    fullUser?.user_id ?? user.user_id
                );
            } catch (profileError) {
                console.warn("Profil konnte nach Login nicht geladen werden:", profileError);
                login(user.first_name ?? "", user.last_name ?? "", user.email, user.image, user.user_id);
            }

            // Weiterleitung zum Feed
            router.replace("/(tabs)/feed");

        } catch (error: unknown) {
            console.error(error);

            if (axios.isAxiosError(error)) {
                if (!error.response || error.code === "ERR_NETWORK") {
                    showFeedback("Keine Verbindung", "Bitte Internetverbindung prüfen.");
                } else if ([400, 401, 403, 404].includes(error.response.status)) {
                    showFeedback("Login fehlgeschlagen", "E-Mail oder Passwort falsch.");
                } else {
                    showFeedback("Fehler", "Login fehlgeschlagen. Bitte später erneut versuchen.");
                }
            } else {
                showFeedback("Fehler", "Login fehlgeschlagen. Bitte später erneut versuchen.");
            }
        } finally {
            setLoading(false); // Ladezustand deaktivieren
        }
    };


    return (
        <View style={styles.container}>
            <FeedbackModal
                visible={feedbackVisible}
                title={feedbackTitle}
                message={feedbackMessage}
                onClose={() => setFeedbackVisible(false)}
            />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large"/>
                </View>
            ) : (
                <>
                    <Text style={styles.title}>Login</Text>

                    {/* E-Mail Input */}
                    <View style={styles.inputContainer}>
                        <Icon name="mail-outline" size={24} color="#888" style={styles.icon}/>
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
                        <Icon name="lock-closed-outline" size={24} color="#888" style={styles.icon}/>
                        <TextInput
                            style={styles.input}
                            placeholder="Passwort"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <View style={{paddingTop: 5, justifyContent: 'center'}}>
                        {/* Hinweis über dem Login */}
                        <Text style={{fontSize: 15, marginBottom: 30}}>
                            Noch kein Konto?{' '}
                            <Text
                                style={{color: 'blue', textDecorationLine: 'underline'}}
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
                </>
            )}
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
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
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
