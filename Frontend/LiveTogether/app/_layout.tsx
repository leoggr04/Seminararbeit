import { Stack } from "expo-router";
import './globals.css';
import { StatusBar } from "react-native";
import { UserProvider} from "@/components/UserContext";

export default function RootLayout() {
  return (
      <UserProvider>
        <StatusBar hidden={true} />

        <Stack>
          {/* Login first without navbar */}
          <Stack.Screen
              name="login"
              options={{
                  headerShown: false,
                  statusBarStyle: 'dark'
              }}
          />
          {/* Tabs after Login */}
          <Stack.Screen
              name="(tabs)"
              options={{
                  headerShown: false,
                  statusBarStyle: 'dark'

              }}
          />
          <Stack.Screen
              name="signup"
              options={{
                  headerShown: false,
                  statusBarStyle: 'dark'
              }}
          />

        </Stack>
      </UserProvider>
  );
}
