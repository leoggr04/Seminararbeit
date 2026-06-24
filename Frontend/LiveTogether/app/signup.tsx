import { useUser } from "@/components/UserContext";
import { loginUser, registerUser } from "@/services/api";
import Icon from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";

export default function Signup() {
    const [firstname, setFirstname] = useState("");
    const [lastname, setLastname] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const router = useRouter();
    const [error, setError] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [firstNameError, setFirstNameError] = useState(false);
    const [lastNameError, setLastNameError] = useState(false);
    const [emailError, setEmailError] = useState(false);
    const [passwordError, setPasswordError] = useState(false);
    const { login } = useUser();
    const [loading, setLoading] = useState(false);


    const handleLogin = () => {
        router.replace("/(tabs)/feed");
    };

    const validateEmail = (value: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value) {
            setEmailError(true);
            return "Bitte gib eine E-Mail-Adresse ein.";
        }
        if (!emailRegex.test(value)) {
            setEmailError(true);
            return "Bitte gib eine gültige E-Mail-Adresse ein.";
        }
        setEmailError(false);
        return "";
    };

    const validateName = (value: string, fieldName: string) => {
        const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ'’-]+(?: [A-Za-zÀ-ÖØ-öø-ÿ'’-]+)*$/;
        const setErrorState = fieldName === "Vorname" ? setFirstNameError : setLastNameError;

        if (!value) {
            setErrorState(true);
            return `Bitte gib deinen ${fieldName} ein.`;
        }
        if (value.length < 2) {
            setErrorState(true);
            return `${fieldName} muss mindestens 2 Zeichen lang sein.`;
        }
        if (value.length > 50) {
            setErrorState(true);
            return `${fieldName} darf höchstens 50 Zeichen lang sein.`;
        }
        if (!nameRegex.test(value)) {
            setErrorState(true);
            return `${fieldName} darf nur Buchstaben, Bindestriche, Apostrophe und einfache Leerzeichen enthalten.`;
        }
        setErrorState(false);
        return "";
    };

    const validatePassword = (value: string) => {
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!value) {
            setPasswordError(true);
            return "Bitte gib ein Passwort ein.";
        }
        if (!passwordRegex.test(value)) {
            setPasswordError(true);
            return "Das Passwort muss:\n• mindestens 8 Zeichen lang sein\n• einen Großbuchstaben enthalten\n• eine Zahl enthalten.";
        }
        setPasswordError(false);
        return "";
    };

    const handleSubmit = async () => {
        Keyboard.dismiss();
        setSubmitted(true);

        // Validierungen
        const firstNameErrorMsg = validateName(firstname.trim(), "Vorname");
        const lastNameErrorMsg = validateName(lastname.trim(), "Nachname");
        const emailErrorMsg = validateEmail(email.trim());
        const passwordErrorMsg = validatePassword(password.trim());

        if (firstNameErrorMsg || lastNameErrorMsg || emailErrorMsg || passwordErrorMsg) {
            setError(firstNameErrorMsg || lastNameErrorMsg || emailErrorMsg || passwordErrorMsg);
            return;
        }

        setError("");
        setLoading(true);

        try {
            const normalizedEmail = email.trim().toLowerCase();
            // 1️⃣ Registrierung bei API
            const registerResponse = await registerUser(
                firstname.trim(),
                lastname.trim(),
                normalizedEmail,
                password.trim()
            );

            console.log("Registrierungsantwort:", registerResponse.data);

            const { user: registeredUser } = registerResponse.data;

            const loginResponse = await loginUser(normalizedEmail, password.trim());
            const { accessToken, refreshToken } = loginResponse.data;

            await SecureStore.setItemAsync("authToken", accessToken);
            await SecureStore.setItemAsync("refreshToken", refreshToken);
            await SecureStore.setItemAsync("userId", String(registeredUser.user_id));
            await SecureStore.setItemAsync("userEmail", normalizedEmail);

            login(
                registeredUser.first_name,
                registeredUser.last_name,
                normalizedEmail,
                registeredUser.image,
                registeredUser.user_id
            );

            router.replace("/(tabs)/feed");


        } catch (err: any) {
            console.error("Signup/Login Fehler:", err.response?.data || err.message);
            setError(err.response?.data?.message || "Registrierung fehlgeschlagen. Bitte versuche es erneut.");
        } finally {
            setLoading(false);
        }
    };



    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.push("/login")}>
                    <Icon name="arrow-back" size={32} color="#333" />
                </TouchableOpacity>
            </View>
            <ScrollView
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View>

                        <Text style={styles.title}>Konto erstellen</Text>

                        <View style={[styles.inputContainer, submitted && firstNameError ? styles.inputError : null]}>
                            <Icon name="person-outline" size={24} color="#888" style={styles.icon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Vorname"
                                placeholderTextColor="#7a7a7a"
                                value={firstname}
                                onChangeText={setFirstname}
                                keyboardType="default"
                                autoCapitalize="words"
                            />
                        </View>

                        <View style={[styles.inputContainer, submitted && lastNameError ? styles.inputError : null]}>
                            <Icon name="person" size={24} color="#888" style={styles.icon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Nachname"
                                placeholderTextColor="#7a7a7a"
                                value={lastname}
                                onChangeText={setLastname}
                                keyboardType="default"
                                autoCapitalize="words"
                            />
                        </View>

                        <View style={[styles.inputContainer, submitted && emailError ? styles.inputError : null]}>
                            <Icon name="mail-outline" size={24} color="#888" style={styles.icon} />
                            <TextInput
                                style={styles.input}
                                placeholder="E-Mail"
                                placeholderTextColor="#7a7a7a"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={[styles.inputContainer, submitted && passwordError ? styles.inputError : null]}>
                            <Icon name="lock-closed-outline" size={24} color="#888" style={styles.icon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Passwort"
                                placeholderTextColor="#7a7a7a"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>

                        {submitted && error ? <Text style={styles.errorText}>{error}</Text> : null}

                        <TouchableOpacity
                            style={[styles.button, loading && { opacity: 0.6 }]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            <Text style={styles.buttonText}>
                                {loading ? "Registriere..." : "Registrieren"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </TouchableWithoutFeedback>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        padding: 24,
        backgroundColor: "#f8f9fa",
    },
    header: {
        position: "absolute",
        top: 75, // leicht unterhalb der Statusleiste
        left: 30,
        zIndex: 10,
    },

    title: {
        fontSize: 28,
        fontWeight: "700",
        marginBottom: 30,
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
    inputError: {
        borderColor: 'red',
    },
    icon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: "#111",
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
    errorText: {
        color: 'red',
        marginBottom: 10,
    },
});
