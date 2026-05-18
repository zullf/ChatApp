import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

export default function UserAvatar({ name, photoURL, size = 48 }) {
  const [imageError, setImageError] = useState(false);
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  useEffect(() => {
    setImageError(false);
  }, [photoURL]);

  if (photoURL && !imageError) {
    return (
      <Image
        source={{ uri: photoURL }}
        style={[styles.image, avatarStyle]}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <View style={[styles.fallback, avatarStyle]}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: "#e2e8f0",
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
  },
  initial: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
