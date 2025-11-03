import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard } from "react-native";
import { useRouter } from "expo-router";
import Icon from "@expo/vector-icons/Ionicons";
import { useUser } from "@/components/UserContext";
import * as ImagePicker from "expo-image-picker";
import {registerUser, loginUser} from "@/services/api";
import * as SecureStore from "expo-secure-store";

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
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);


    const handleLogin = () => {
        router.replace("/(tabs)/feed");
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
            // 1️⃣ Registrierung bei API
            const registerResponse = await registerUser(
                firstname.trim(),
                lastname.trim(),
                email.trim(),
                password.trim()
            );

            const { user: registeredUser } = registerResponse.data;

            const loginResponse = await loginUser(email.trim(), password.trim());
            const { accessToken, refreshToken } = loginResponse.data;

            await SecureStore.setItemAsync("authToken", accessToken);
            await SecureStore.setItemAsync("refreshToken", refreshToken);
            await SecureStore.setItemAsync("userId", String(registeredUser.user_id));

            login(
                registeredUser.first_name,
                registeredUser.last_name,
                registeredUser.email,
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

                        <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
                            {image ? (
                                <Image source={{ uri: image }} style={styles.profileImage} />
                            ) : (
                                <View style={styles.placeholder}>
                                    <Text style={styles.placeholderText}>+</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <View style={[styles.inputContainer, submitted && firstNameError ? styles.inputError : null]}>
                            <Icon name="person-outline" size={24} color="#888" style={styles.icon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Vorname"
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
    imageContainer: {
        marginBottom: 20,
        alignSelf: "center",
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
