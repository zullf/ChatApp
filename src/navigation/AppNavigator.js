import React, { useEffect, useState } from "react";
import { ActivityIndicator, AppState, View, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";
import { updateUserPresence } from "../utils/presence";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import UserListScreen from "../screens/UserListScreen";
import ChatScreen from "../screens/ChatScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!currentUser) {
      return undefined;
    }

    const setPresence = async (isOnline) => {
      try {
        await updateUserPresence(currentUser, isOnline);
      } catch {
      }
    };

    setPresence(AppState.currentState === "active");

    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      setPresence(nextState === "active");
    });

    return () => {
      appStateSubscription.remove();
      setPresence(false);
    };
  }, [currentUser]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {currentUser ? (
          <>
            <Stack.Screen
              name="UserList"
              component={UserListScreen}
              options={{ title: "Daftar Pengguna" }}
            />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={({ route }) => ({
                headerShown: false,
                title: route.params?.user?.name || "Chat",
              })}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
});
