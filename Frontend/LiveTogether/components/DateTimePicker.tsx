import { AntDesign } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";

interface Props {
    startDate: Date;
    endDate: Date;
    onChange: (start: Date, end: Date) => void;
}

const DateRangePicker: React.FC<Props> = ({ startDate, endDate, onChange }) => {
    const [pickerMode, setPickerMode] = useState<"start" | "end" | null>(null);
    const MIN_LEAD_MINUTES = 15;
    const MIN_DURATION_MINUTES = 15;

    const normalizeToMinute = (date: Date) => {
        const normalized = new Date(date);
        normalized.setSeconds(0, 0);
        return normalized;
    };

    const addMinutes = (date: Date, minutes: number) => {
        const result = new Date(date);
        result.setMinutes(result.getMinutes() + minutes);
        return result;
    };

    const getMinAllowedStart = () => addMinutes(normalizeToMinute(new Date()), MIN_LEAD_MINUTES);

    useEffect(() => {
        const normalizedStart = normalizeToMinute(startDate);
        const normalizedEnd = normalizeToMinute(endDate);

        const minStart = getMinAllowedStart();
        const validStart = normalizedStart < minStart ? minStart : normalizedStart;
        const minEnd = addMinutes(validStart, MIN_DURATION_MINUTES);
        const validEnd = normalizedEnd < minEnd ? minEnd : normalizedEnd;

        if (
            validStart.getTime() !== normalizedStart.getTime() ||
            validEnd.getTime() !== normalizedEnd.getTime()
        ) {
            onChange(validStart, validEnd);
        }
        // Nur initiale Korrektur beim Mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const formatDateTime = (date: Date) => {
        const weekday = new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(date);
        const formattedDate = new Intl.DateTimeFormat("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }).format(date);
        const formattedTime = new Intl.DateTimeFormat("de-DE", {
            hour: "2-digit",
            minute: "2-digit"
        }).format(date);

        return `${weekday} ${formattedDate} um ${formattedTime}`;
    };

    const handleConfirm = (date: Date) => {
        const normalizedPicked = normalizeToMinute(date);
        const normalizedStart = normalizeToMinute(startDate);
        const normalizedEnd = normalizeToMinute(endDate);
        const minStart = getMinAllowedStart();

        if (pickerMode === "start") {
            const newStart = normalizedPicked < minStart ? minStart : normalizedPicked;
            const minEndForStart = addMinutes(newStart, MIN_DURATION_MINUTES);
            const newEnd = normalizedEnd < minEndForStart ? minEndForStart : normalizedEnd;
            onChange(newStart, newEnd);
        } else if (pickerMode === "end") {
            const validStart = normalizedStart < minStart ? minStart : normalizedStart;
            const minEndForStart = addMinutes(validStart, MIN_DURATION_MINUTES);
            const newEnd = normalizedPicked < minEndForStart ? minEndForStart : normalizedPicked;
            const newStart = validStart;
            onChange(newStart, newEnd);
        }
        setPickerMode(null);
    };

    const formatDuration = (start: Date, end: Date) => {
        const diffMs = Math.max(0, end.getTime() - start.getTime());
        const totalMinutes = Math.floor(diffMs / (1000 * 60));

        const days = Math.floor(totalMinutes / (24 * 60));
        const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
        const minutes = totalMinutes % 60;

        const parts: string[] = [];
        if (days > 0) parts.push(`${days}D`);
        if (hours > 0) parts.push(`${hours}H`);
        if (minutes > 0) parts.push(`${minutes}M`);

        if (parts.length === 0) return "0M";

        return parts.join(" ");
    };

    return (
        <View style={styles.wrapper}>
            <Text style={styles.sectionLabel}>Dauer der Aktivität</Text>

            <View style={styles.card}>
                <TouchableOpacity style={styles.pickerButton} onPress={() => setPickerMode("start")}>
                    <Text style={styles.pickerLabel}>Start</Text>
                    <Text style={styles.pickerValue}>{formatDateTime(startDate)}</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity style={styles.pickerButton} onPress={() => setPickerMode("end")}>
                    <Text style={styles.pickerLabel}>Ende</Text>
                    <Text style={styles.pickerValue}>{formatDateTime(endDate)}</Text>
                </TouchableOpacity>

                <View style={styles.durationRow}>
                    <Text style={styles.durationLabel}>Gesamtdauer der Aktivität</Text>
                    <Text style={styles.durationValue}>{formatDuration(startDate, endDate)}</Text>
                </View>

                <View style={styles.hintRow}>
                    <AntDesign name="exclamation-circle" size={13} color="#64748b" />
                    <Text style={styles.hintText}>
                        Hinweis: Start mindestens 15 Min. in der Zukunft, Gesamtdauer mindestens 15 Min.
                    </Text>
                </View>
            </View>

            <DateTimePickerModal
                isVisible={pickerMode !== null}
                mode="datetime" // Datum + Uhrzeit
                onConfirm={handleConfirm}
                onCancel={() => setPickerMode(null)}
                date={pickerMode === "start" ? startDate : endDate}
                minimumDate={
                    pickerMode === "start"
                        ? getMinAllowedStart()
                        : addMinutes(
                            normalizeToMinute(startDate) < getMinAllowedStart()
                                ? getMinAllowedStart()
                                : normalizeToMinute(startDate),
                            MIN_DURATION_MINUTES
                        )
                }
                confirmTextIOS="Fertig"
                cancelTextIOS="Abbrechen"
                locale="de-DE"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        marginVertical: 12,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: "700",
        color: "#334155",
        marginBottom: 8,
    },
    card: {
        backgroundColor: "#f8fafc",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 12,
        padding: 8,
    },
    pickerButton: {
        backgroundColor: "#ffffff",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    pickerLabel: {
        fontSize: 12,
        fontWeight: "700",
        color: "#64748b",
        marginBottom: 2,
    },
    pickerValue: {
        fontSize: 14,
        fontWeight: "600",
        color: "#0f172a",
    },
    divider: {
        height: 8,
    },
    durationRow: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: "#e2e8f0",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    durationLabel: {
        fontSize: 12,
        fontWeight: "700",
        color: "#64748b",
    },
    durationValue: {
        fontSize: 13,
        fontWeight: "700",
        color: "#0f172a",
    },
    hintRow: {
        marginTop: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    hintText: {
        fontSize: 12,
        lineHeight: 17,
        color: "#64748b",
        flex: 1,
    },
});

export default DateRangePicker;
