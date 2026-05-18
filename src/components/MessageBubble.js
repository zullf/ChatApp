import React from "react";
import { StyleSheet, Text, View } from "react-native";

function formatTime(timestamp) {
  const date = timestamp?.toDate ? timestamp.toDate() : null;
  if (!date) {
    return "";
  }

  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MessageBubble({ message, isMine }) {
  return (
    <View style={[styles.container, isMine ? styles.mineContainer : styles.otherContainer]}>
      <View style={[styles.bubble, isMine ? styles.mineBubble : styles.otherBubble]}>
        {!isMine && <Text style={styles.senderName}>{message.senderName}</Text>}
        <Text style={[styles.messageText, isMine && styles.mineText]}>{message.text}</Text>
        <Text style={[styles.timeText, isMine && styles.mineTime]}>{formatTime(message.timestamp)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  mineContainer: {
    alignItems: "flex-end",
  },
  otherContainer: {
    alignItems: "flex-start",
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mineBubble: {
    backgroundColor: "#2563eb",
    borderBottomRightRadius: 2,
  },
  otherBubble: {
    backgroundColor: "#ffffff",
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  senderName: {
    marginBottom: 3,
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
  },
  messageText: {
    color: "#0f172a",
    fontSize: 15,
    lineHeight: 20,
  },
  mineText: {
    color: "#ffffff",
  },
  timeText: {
    alignSelf: "flex-end",
    marginTop: 4,
    color: "#64748b",
    fontSize: 11,
  },
  mineTime: {
    color: "#dbeafe",
  },
});
