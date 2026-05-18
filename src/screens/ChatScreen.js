import React, { useEffect, useRef, useState } from "react";
import { Alert, FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View, } from "react-native";
import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import MessageBubble from "../components/MessageBubble";
import PresenceStatus from "../components/PresenceStatus";
import UserAvatar from "../components/UserAvatar";

function getChatId(uidA, uidB) {
  return [uidA, uidB].sort().join("_");
}

function getParticipants(uidA, uidB) {
  return [uidA, uidB].sort();
}

export default function ChatScreen({ navigation, route }) {
  const selectedUser = route.params?.user;
  const currentUser = auth.currentUser;
  const chatId = selectedUser && currentUser ? getChatId(currentUser.uid, selectedUser.uid) : null;
  const participants =
    selectedUser && currentUser ? getParticipants(currentUser.uid, selectedUser.uid) : [];
  const [chatUser, setChatUser] = useState(selectedUser);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isFriendTyping, setIsFriendTyping] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    setChatUser(selectedUser);
  }, [selectedUser?.uid]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
      setIsKeyboardVisible(true);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const updateTyping = async (isTyping) => {
    if (!currentUser || !chatId) {
      return;
    }

    await setDoc(
      doc(db, "users", currentUser.uid),
      {
        isTyping,
        typingChatId: isTyping ? chatId : null,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  useEffect(() => {
    if (!selectedUser || !currentUser || !chatId) {
      return undefined;
    }

    const selectedUserRef = doc(db, "users", selectedUser.uid);
    const chatRef = doc(db, "chats", chatId);
    const messagesRef = collection(db, "chats", chatId, "messages");
    const messagesQuery = query(messagesRef, orderBy("timestamp", "asc"));
    let unsubscribeMessages = () => {};
    let unsubscribeTyping = () => {};
    let isMounted = true;

    async function openChat() {
      try {
        await setDoc(
          chatRef,
          {
            participants,
            participantNames: {
              [currentUser.uid]: currentUser.displayName || currentUser.email,
              [selectedUser.uid]: selectedUser.name || selectedUser.email,
            },
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        if (!isMounted) {
          return;
        }

        unsubscribeMessages = onSnapshot(
          messagesQuery,
          (snapshot) => {
            const data = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
            setMessages(data);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
          },
          (error) => Alert.alert("Gagal memuat pesan", error.message)
        );

        unsubscribeTyping = onSnapshot(selectedUserRef, (snapshot) => {
          const userData = snapshot.data();
          if (userData) {
            setChatUser({ id: snapshot.id, ...userData });
          }
          setIsFriendTyping(Boolean(userData?.isTyping && userData?.typingChatId === chatId));
        });
      } catch (error) {
        if (isMounted) {
          Alert.alert("Gagal membuka chat", error.message);
        }
      }
    }

    openChat();

    return () => {
      isMounted = false;
      unsubscribeMessages();
      unsubscribeTyping();
      clearTimeout(typingTimeoutRef.current);
      updateTyping(false).catch(() => {});
    };
  }, [chatId, currentUser?.uid, selectedUser?.uid]);

  const handleChangeText = (text) => {
    setInputText(text);
    clearTimeout(typingTimeoutRef.current);

    if (text.trim()) {
      updateTyping(true).catch(() => {});
      typingTimeoutRef.current = setTimeout(() => {
        updateTyping(false).catch(() => {});
      }, 1200);
    } else {
      updateTyping(false).catch(() => {});
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !currentUser || !selectedUser || !chatId) {
      return;
    }

    const text = inputText.trim();
    setInputText("");
    clearTimeout(typingTimeoutRef.current);
    await updateTyping(false);

    try {
      await setDoc(
        doc(db, "chats", chatId),
        {
          participants,
          participantNames: {
            [currentUser.uid]: currentUser.displayName || currentUser.email,
            [selectedUser.uid]: chatUser?.name || selectedUser.name || selectedUser.email,
          },
          lastMessage: text,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await addDoc(collection(db, "chats", chatId, "messages"), {
        text,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email,
        receiverId: selectedUser.uid,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      Alert.alert("Pesan gagal dikirim", error.message);
    }
  };

  if (!selectedUser) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>Pilih pengguna terlebih dahulu.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <View style={styles.chatHeader}>
        <Pressable
          accessibilityLabel="Kembali"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
        >
          <Text style={styles.backButtonText}>{"‹"}</Text>
        </Pressable>
        <UserAvatar name={chatUser?.name} photoURL={chatUser?.photoURL} size={40} />
        <View style={styles.headerText}>
          <Text style={styles.headerName}>{chatUser?.name || selectedUser.name}</Text>
          <PresenceStatus
            user={chatUser || selectedUser}
            isTyping={isFriendTyping}
            typingName={chatUser?.name || selectedUser.name}
            style={styles.presenceStatus}
          />
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageBubble message={item} isMine={item.senderId === currentUser?.uid} />
        )}
        contentContainerStyle={[
          styles.messagesList,
          isKeyboardVisible && styles.messagesListKeyboardOpen,
        ]}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      />

      <View style={[styles.inputRow, isKeyboardVisible && styles.inputRowKeyboardOpen]}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={handleChangeText}
          placeholder="Ketik pesan..."
          multiline
        />
        <Pressable style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendText}>Kirim</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    paddingHorizontal: 8,
    paddingVertical: 10,
    marginTop: 40,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  backButtonPressed: {
    backgroundColor: "#e2e8f0",
  },
  backButtonText: {
    color: "#0f172a",
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 28,
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "800",
  },
  presenceStatus: {
    marginTop: 2,
  },
  messagesList: {
    flexGrow: 1,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 12 : 48,
  },
  messagesListKeyboardOpen: {
    paddingBottom: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    padding: 10,
    paddingBottom: Platform.OS === "ios" ? 14 : 42,
  },
  inputRowKeyboardOpen: {
    paddingBottom: 10,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  sendButton: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
  },
  sendText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  emptyText: {
    color: "#64748b",
  },
});
