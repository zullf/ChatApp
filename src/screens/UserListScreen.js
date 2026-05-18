import React, { useEffect, useLayoutEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View, } from "react-native";
import { signOut } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import PresenceStatus from "../components/PresenceStatus";
import UserAvatar from "../components/UserAvatar";
import { updateUserPresence } from "../utils/presence";

export default function UserListScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = auth.currentUser;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    if (!currentUser) {
      return undefined;
    }

    const usersQuery = query(collection(db, "users"), orderBy("name", "asc"));
    let unsubscribe = () => {};
    let isMounted = true;

    async function ensureCurrentUserDocument() {
      const currentUserRef = doc(db, "users", currentUser.uid);
      const currentUserSnap = await getDoc(currentUserRef);

      if (!currentUserSnap.exists()) {
        await setDoc(currentUserRef, {
          uid: currentUser.uid,
          name: currentUser.displayName || currentUser.email,
          email: currentUser.email,
          photoURL: currentUser.photoURL || null,
          isTyping: false,
          typingChatId: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    async function loadUsers() {
      try {
        await ensureCurrentUserDocument();

        if (!isMounted) {
          return;
        }

        unsubscribe = onSnapshot(
          usersQuery,
          (snapshot) => {
            const data = snapshot.docs
              .map((item) => ({ id: item.id, ...item.data() }))
              .filter((user) => user.uid !== currentUser.uid);

            setUsers(data);
            setLoading(false);
          },
          (error) => {
            Alert.alert("Gagal memuat user", error.message);
            setLoading(false);
          }
        );
      } catch (error) {
        Alert.alert("Gagal menyiapkan data user", error.message);
        setLoading(false);
      }
    }

    loadUsers();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      if (currentUser) {
        await updateUserPresence(currentUser, false);
      }

      await signOut(auth);
    } catch (error) {
      Alert.alert("Logout gagal", error.message);
    }
  };

  const renderUser = ({ item }) => (
    <Pressable
      style={styles.userRow}
      onPress={() => navigation.navigate("Chat", { user: item })}
    >
      <UserAvatar name={item.name} photoURL={item.photoURL} />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        <PresenceStatus user={item} style={styles.presenceStatus} />
      </View>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={(item) => item.uid}
        renderItem={renderUser}
        contentContainerStyle={users.length === 0 && styles.emptyList}
        ListEmptyComponent={<Text style={styles.emptyText}>Belum ada pengguna lain.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  logoutButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  logoutText: {
    color: "#dc2626",
    fontWeight: "700",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 14,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    padding: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "800",
  },
  userEmail: {
    marginTop: 2,
    color: "#64748b",
    fontSize: 13,
  },
  presenceStatus: {
    marginTop: 6,
  },
  emptyList: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyText: {
    color: "#64748b",
    textAlign: "center",
  },
});
