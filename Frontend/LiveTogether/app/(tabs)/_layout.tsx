import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from "expo-router";
import { View } from "react-native";

function TabIcon({ focused, name }: any) {
    return (
        <View
            style={{
                justifyContent: "center",
                alignItems: "center",
                flex: 1, // <-- nimmt volle Höhe ein
            }}
        >
            <MaterialIcons
                name={name}
                size={24}
                color={focused ? "#007bff" : "#A8B5DB"}
            />
        </View>
    );
}

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarShowLabel: false,
                tabBarItemStyle: {
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100%", // <-- wichtig für vertikale Zentrierung
                },
                tabBarStyle: {
                    backgroundColor: "#FFFFFF",
                    borderRadius: 30,
                    marginHorizontal: 16,
                    marginBottom: 32,
                    height: 45,
                    position: "absolute",
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    shadowColor: "#000",
                    shadowOpacity: 0.05,
                    shadowOffset: { width: 0, height: 2 },
                    shadowRadius: 4,
                    elevation: 5,
                    paddingVertical: 8, // <-- sorgt für gleichen Abstand oben/unten
                },
            }}
        >
            <Tabs.Screen
                name="feed"
                options={{
                    title: "Feed",
                    headerShown: false,
                    tabBarIcon: ({ focused }) => (
                        <TabIcon focused={focused} name="home" />
                    ),
                }}
            />
            <Tabs.Screen
                name="map"
                options={{
                    title: "Map",
                    headerShown: false,
                    tabBarIcon: ({ focused }) => (
                        <TabIcon focused={focused} name="map" />
                    ),
                }}
            />
            <Tabs.Screen
                name="messages"
                options={{
                    title: "Messages",
                    headerShown: false,
                    tabBarIcon: ({ focused }) => (
                        <TabIcon focused={focused} name="message" />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    headerShown: false,
                    tabBarIcon: ({ focused }) => (
                        <TabIcon focused={focused} name="person" />
                    ),
                }}
            />
        </Tabs>
    );
}