import LogoutModal from "@/components/LogoutModal";
import { useUser } from "@/components/UserContext";
import { clearStoredAuth, getDashboardSummary } from "@/services/api";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type DashboardSummary = Record<string, unknown>;

type StatItem = {
    key: string;
    label: string;
    value: number;
    icon: keyof typeof MaterialIcons.glyphMap;
    color: string;
};

const MAX_VISIBLE_STATS = 8;

const prettifyLabel = (rawKey: string) => {
    const germanLabels: Record<string, string> = {
        activity_created: "Aktivitäten Erstellt",
        activity_joined: "Aktivitäten Beigetreten",
        activity_left: "Aktivitäten Verlassen",
        activity_participant_removed: "Teilnehmer Entfernt",
        chat_created: "Chats Erstellt",
        chat_left: "Chats Verlassen",
        chat_message_sent: "Nachrichten Gesendet",
        chat_participant_added: "Chat-Teilnehmer Hinzugefügt",
        chat_participant_removed: "Teilnehmer Entfernt",
    };

    // Nutze deutsches Label wenn vorhanden, sonst fallback
    if (germanLabels[rawKey]) {
        return germanLabels[rawKey];
    }

    return rawKey
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

const mapStatVisual = (key: string) => {
    const normalized = key.toLowerCase();

    if (normalized.includes("chat_message") || normalized.includes("message_sent")) {
        return { icon: "chat" as const, color: "#4F9DFF" };
    }
    if (normalized.includes("chat_created") || normalized.includes("chat")) {
        return { icon: "forum" as const, color: "#1F6FFF" };
    }
    if (normalized.includes("activity_created") || normalized.includes("created")) {
        return { icon: "event-note" as const, color: "#50E3A4" };
    }
    if (normalized.includes("activity_joined") || normalized.includes("joined")) {
        return { icon: "person-add" as const, color: "#FFB74D" };
    }
    if (normalized.includes("activity_left") || normalized.includes("left")) {
        return { icon: "logout" as const, color: "#FF8A80" };
    }
    if (normalized.includes("participant")) {
        return { icon: "group" as const, color: "#BA68C8" };
    }
    if (normalized.includes("streak") || normalized.includes("day")) {
        return { icon: "local-fire-department" as const, color: "#FF6E6E" };
    }
    if (normalized.includes("minute") || normalized.includes("hour") || normalized.includes("time")) {
        return { icon: "schedule" as const, color: "#A78BFA" };
    }
    if (normalized.includes("distance") || normalized.includes("km")) {
        return { icon: "map" as const, color: "#2EC4B6" };
    }

    return { icon: "stars" as const, color: "#FF9D00" };
};

const toStatItems = (summary: DashboardSummary | null): StatItem[] => {
    if (!summary) return [];

    let statsData: Record<string, number> = {};

    // Prüfe ob es die verschachtelte Struktur ist (mit "counts")
    if (summary.counts && typeof summary.counts === "object") {
        const counts = summary.counts as Record<string, any>;
        // Bevorzuge "period" über "lifetime"
        const countData = counts.period || counts.lifetime || {};
        statsData = countData;
    } else {
        // Fallback: Flache Struktur
        statsData = summary as Record<string, number>;
    }

    // Felder die nicht angezeigt werden sollen
    const excludedKeys = ["activity_participant_removed", "chat_participant_removed", "chat_left"];

    return Object.entries(statsData)
        .filter(([key]) => !excludedKeys.includes(key))
        .filter(([, value]) => typeof value === "number" && Number.isFinite(value))
        .map(([key, value]) => {
            const visual = mapStatVisual(key);
            return {
                key,
                label: prettifyLabel(key),
                value: Number(value),
                icon: visual.icon,
                color: visual.color,
            };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, MAX_VISIBLE_STATS);
};

const Profile = () => {
    const { user, logout } = useUser();
    const router = useRouter();
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

    const statItems = useMemo(() => toStatItems(summary), [summary]);

    const totalPoints = useMemo(() => {
        if (!summary) return 0;

        const prioritizedKeys = ["score", "points", "xp", "experience"];
        for (const key of prioritizedKeys) {
            const value = summary[key];
            if (typeof value === "number" && Number.isFinite(value)) {
                return Math.max(0, Math.round(value));
            }
        }

        const sum = statItems.reduce((acc, item) => acc + Math.max(0, item.value), 0);
        return Math.round(sum);
    }, [summary, statItems]);

    const level = Math.max(1, Math.floor(totalPoints / 120) + 1);
    const pointsForLevel = 120;
    const progressInLevel = totalPoints % pointsForLevel;
    const levelProgress = progressInLevel / pointsForLevel;
    const initials = `${user?.first_name?.[0] ?? ""}${user?.last_name?.[0] ?? ""}`.toUpperCase();

    const loadDashboardSummary = async () => {
        try {
            console.log("[Profile] 🔄 Reload-Button gedrückt - Dashboard Summary wird geladen...");
            setIsLoading(true);
            setError(null);
            console.log("[Profile] 📡 API-Anfrage an /dashboard/summary mit days=30 gestartet");
            const data = await getDashboardSummary(30);
            console.log("[Profile] ✅ Dashboard Summary erfolgreich geladen:", data);
            
            // Extrahiere die inneren Stats für Logging
            if (data?.counts?.period) {
                const entries = Object.entries(data.counts.period);
                console.log(`[Profile] 📊 ${entries.length} numerische Felder gefunden in counts.period:`, data.counts.period);
            }
            
            setSummary(data ?? null);
        } catch (err) {
            console.error("[Profile] ❌ Fehler beim Laden der Dashboard Summary:", err);
            setError("Statistiken konnten nicht geladen werden.");
            setSummary(null);
        } finally {
            setIsLoading(false);
            console.log("[Profile] ⏹️ Loading-State beendet");
        }
    };

    useEffect(() => {
        console.log("[Profile] 🎮 Profile-Seite initialisiert - Dashboard Summary wird beim Mount geladen...");
        loadDashboardSummary();
    }, []);

    const handleLogout = () => {
        setIsLogoutModalVisible(true);
    };

    const confirmLogout = async () => {
        setIsLogoutModalVisible(false);
        await clearStoredAuth();
        logout();
        router.replace("/login");
    };

    if (!user) return <Text>Kein User angemeldet</Text>;

    return (
        <View style={styles.screen}>
            <View style={styles.backgroundOrbTop} />
            <View style={styles.backgroundOrbBottom} />

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.heroCard}>
                    <View style={styles.badgeRow}>
                        <Text style={styles.badgeText}>PROFIL</Text>
                        <Text style={styles.rankText}>LVL {level}</Text>
                    </View>

                    <View style={styles.profileRow}>
                        <View style={styles.avatarShell}>
                            <View style={styles.avatarInner}>
                                <Text style={styles.avatarText}>{initials || "LT"}</Text>
                            </View>
                        </View>

                        <View style={styles.identityColumn}>
                            <Text style={styles.name}>{user.first_name} {user.last_name}</Text>
                            <Text style={styles.email}>{user.email}</Text>
                        </View>
                    </View>

                    <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>Erfahrung</Text>
                        <Text style={styles.progressValue}>{progressInLevel}/{pointsForLevel} XP</Text>
                    </View>
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${Math.max(4, levelProgress * 100)}%` }]} />
                    </View>
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Deine Stats (30 Tage)</Text>
                    <TouchableOpacity onPress={loadDashboardSummary} style={styles.refreshButton}>
                        <MaterialIcons name="refresh" size={18} color="#101B37" />
                        <Text style={styles.refreshText}>Reload</Text>
                    </TouchableOpacity>
                </View>

                {isLoading ? (
                    <View style={styles.stateCard}>
                        <ActivityIndicator size="small" color="#4F9DFF" />
                        <Text style={styles.stateText}>Stats werden geladen...</Text>
                    </View>
                ) : null}

                {!isLoading && error ? (
                    <View style={styles.stateCard}>
                        <MaterialIcons name="error-outline" size={22} color="#FF6E6E" />
                        <Text style={styles.stateText}>{error}</Text>
                    </View>
                ) : null}

                {!isLoading && !error ? (
                    <View style={styles.statsGrid}>
                        {statItems.length > 0 ? (
                            statItems.map((item, index) => (
                                <View key={`${item.key}-${index}`} style={styles.statCard}>
                                    <View style={[styles.statIconWrap, { backgroundColor: `${item.color}22` }]}>
                                        <MaterialIcons name={item.icon} size={20} color={item.color} />
                                    </View>
                                    <Text numberOfLines={1} style={styles.statValue}>{item.value}</Text>
                                    <Text numberOfLines={2} style={styles.statLabel}>{item.label}</Text>
                                </View>
                            ))
                        ) : (
                            <View style={styles.emptyCard}>
                                <MaterialIcons name="insights" size={24} color="#9FB1D0" />
                                <Text style={styles.emptyText}>Noch keine auswertbaren Stats vorhanden.</Text>
                            </View>
                        )}
                    </View>
                ) : null}

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <MaterialIcons name="logout" size={22} color="#FFFFFF" style={styles.logoutIcon} />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </ScrollView>

            <LogoutModal
                visible={isLogoutModalVisible}
                onClose={() => setIsLogoutModalVisible(false)}
                onConfirm={confirmLogout}
            />
        </View>
    );
};

export default Profile;

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#F5F7FB",
    },
    backgroundOrbTop: {
        position: "absolute",
        top: -110,
        right: -80,
        width: 260,
        height: 260,
        borderRadius: 130,
        backgroundColor: "#5B9FFF",
        opacity: 0.12,
    },
    backgroundOrbBottom: {
        position: "absolute",
        bottom: -140,
        left: -110,
        width: 320,
        height: 320,
        borderRadius: 160,
        backgroundColor: "#50E3A4",
        opacity: 0.08,
    },
    content: {
        paddingHorizontal: 18,
        paddingTop: 24,
        paddingBottom: 30,
    },
    heroCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        padding: 18,
        marginTop: 26,
        borderWidth: 1,
        borderColor: "#E8EEFF",
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    badgeRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    badgeText: {
        color: "#1F6FFF",
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 1.2,
    },
    rankText: {
        color: "#FF9D00",
        fontSize: 13,
        fontWeight: "800",
    },
    profileRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 14,
        marginBottom: 20,
    },
    avatarShell: {
        width: 80,
        height: 80,
        borderRadius: 40,
        padding: 3,
        backgroundColor: "#1F6FFF",
    },
    avatarInner: {
        flex: 1,
        borderRadius: 37,
        backgroundColor: "#F0F6FF",
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        color: "#1F6FFF",
        fontWeight: "800",
        fontSize: 28,
    },
    identityColumn: {
        marginLeft: 14,
        flexShrink: 1,
    },
    name: {
        color: "#0D1B2A",
        fontSize: 26,
        fontWeight: "800",
    },
    email: {
        color: "#5A7A8F",
        marginTop: 4,
        fontSize: 15,
    },
    progressHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    progressLabel: {
        color: "#3D4F63",
        fontSize: 13,
        fontWeight: "600",
    },
    progressValue: {
        color: "#1F6FFF",
        fontSize: 13,
        fontWeight: "700",
    },
    progressTrack: {
        width: "100%",
        height: 10,
        borderRadius: 999,
        backgroundColor: "#E8EEFF",
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        borderRadius: 999,
        backgroundColor: "#4F9DFF",
    },
    sectionHeader: {
        marginTop: 20,
        marginBottom: 12,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    sectionTitle: {
        color: "#0D1B2A",
        fontSize: 18,
        fontWeight: "700",
    },
    refreshButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#E8EEFF",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
    },
    refreshText: {
        marginLeft: 4,
        color: "#1F6FFF",
        fontWeight: "700",
        fontSize: 12,
    },
    stateCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#E8EEFF",
        paddingVertical: 16,
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
    },
    stateText: {
        color: "#5A7A8F",
        marginLeft: 10,
        fontSize: 14,
        fontWeight: "500",
    },
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    statCard: {
        width: "48.5%",
        borderRadius: 16,
        padding: 14,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E8EEFF",
        minHeight: 120,
        justifyContent: "space-between",
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    statIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    statValue: {
        marginTop: 8,
        color: "#0D1B2A",
        fontSize: 27,
        fontWeight: "800",
    },
    statLabel: {
        color: "#5A7A8F",
        fontSize: 13,
        fontWeight: "600",
        marginTop: 2,
        lineHeight: 17,
    },
    emptyCard: {
        width: "100%",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#E8EEFF",
        backgroundColor: "#FFFFFF",
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
    },
    emptyText: {
        color: "#5A7A8F",
        marginLeft: 10,
        fontSize: 14,
        fontWeight: "500",
    },
    logoutButton: {
        marginTop: 22,
        backgroundColor: "#E63946",
        paddingVertical: 15,
        borderRadius: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    logoutIcon: {
        marginRight: 8,
    },
    logoutText: {
        color: "#FFFFFF",
        fontWeight: "700",
        fontSize: 18,
    },
});
