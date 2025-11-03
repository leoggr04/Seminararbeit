import {StyleSheet, Text, View} from 'react-native'
import React from 'react'

const Feed = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.header}>Feed</Text>
        </View>
    )
}
export default Feed
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
    }
    }
)
