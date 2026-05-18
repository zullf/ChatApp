import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { getPresenceText } from "../utils/presence";

export default function PresenceStatus({ user, isTyping = false, typingName, style }) {
  const isOnline = Boolean(user?.isOnline);
  const text = isTyping ? `${typingName || user?.name || "User"} sedang mengetik...` : getPresenceText(user);

  return (
    <View style={[styles.row, style]}>
      <View style={[styles.dot, isOnline && styles.dotOnline, isTyping && styles.dotTyping]} />
      <Text style={[styles.text, isOnline && styles.textOnline, isTyping && styles.textTyping]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#94a3b8",
  },
  dotOnline: {
    backgroundColor: "#16a34a",
  },
  dotTyping: {
    backgroundColor: "#22c55e",
  },
  text: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
  },
  textOnline: {
    color: "#16a34a",
  },
  textTyping: {
    color: "#16a34a",
  },
});
