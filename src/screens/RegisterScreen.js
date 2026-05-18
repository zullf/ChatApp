import React, { useState } from "react";
import { Alert, Image, KeyboardAvoidingView, ScrollView, Platform, Pressable, StyleSheet, Text, TextInput, View,} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, storage } from "../firebase/config";
import UserAvatar from "../components/UserAvatar";

function getErrorMessage(error) {
  return error?.message || "Terjadi kesalahan yang tidak diketahui.";
}

async function uploadAvatar(uid, imageUri) {
  if (!imageUri) {
    return null;
  }

  const response = await fetch(imageUri);
  const blob = await response.blob();
  const avatarRef = ref(storage, `profileImages/${uid}/avatar.jpg`);
  await uploadBytes(avatarRef, blob, { contentType: "image/jpeg" });
  return getDownloadURL(avatarRef);
}

async function saveUserDocument(user, name, photoURL = null) {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const profileData = {
    name: name.trim(),
    email: user.email,
    photoURL,
    isTyping: false,
    typingChatId: null,
    updatedAt: serverTimestamp(),
  };

  if (userSnap.exists()) {
    await updateDoc(userRef, profileData);
    return;
  }

  await setDoc(userRef, {
      uid: user.uid,
      ...profileData,
      createdAt: serverTimestamp(),
    });
}

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [photoUri, setPhotoUri] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Izin dibutuhkan", "Aplikasi perlu izin galeri untuk memilih foto profil.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleRegister = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail || !password) {
      Alert.alert("Register gagal", "Nama, email, dan password wajib diisi.");
      return;
    }

    let createdUser = null;

    try {
      setLoading(true);
      const credential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      createdUser = credential.user;

      try {
        await createdUser.getIdToken(true);

        await updateProfile(createdUser, {
          displayName: trimmedName,
        });
        await saveUserDocument(createdUser, trimmedName);
      } catch (setupError) {
        Alert.alert(
          "Setup akun gagal",
          `Akun login berhasil dibuat, tapi data profil gagal disiapkan: ${getErrorMessage(setupError)}\n\nCek Firestore Rules untuk koleksi users, lalu coba logout dan login lagi.`
        );
        return;
      }

      if (photoUri) {
        try {
          const photoURL = await uploadAvatar(createdUser.uid, photoUri);
          await updateProfile(createdUser, { photoURL });
          await updateDoc(doc(db, "users", createdUser.uid), {
            photoURL,
            updatedAt: serverTimestamp(),
          });
        } catch (uploadError) {
          Alert.alert(
            "Foto profil belum tersimpan",
            `Akun berhasil dibuat, tetapi upload foto gagal: ${getErrorMessage(uploadError)}`
          );
        }
      }
    } catch (error) {
      Alert.alert("Register gagal", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <Text style={styles.title}>Buat Akun</Text>
          <Pressable style={styles.avatarButton} onPress={pickImage}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatarPreview} />
            ) : (
              <UserAvatar name={name || "U"} size={84} />
            )}
            <Text style={styles.avatarText}>Pilih foto profil</Text>
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder="Nama"
            value={name}
            onChangeText={setName}
            returnKeyType="next"
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleRegister}
          />
          <Pressable style={styles.primaryButton} onPress={handleRegister} disabled={loading}>
            <Text style={styles.primaryText}>{loading ? "Membuat akun..." : "Register"}</Text>
          </Pressable>
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.linkText}>Sudah punya akun? Login</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    paddingBottom: 32,
  },
  form: {
    gap: 12,
  },
  title: {
    marginBottom: 8,
    color: "#0f172a",
    fontSize: 24,
    fontWeight: "800",
  },
  avatarButton: {
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  avatarPreview: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#e2e8f0",
  },
  avatarText: {
    color: "#2563eb",
    fontWeight: "700",
  },
  input: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    fontSize: 15,
  },
  primaryButton: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#2563eb",
  },
  primaryText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  linkText: {
    marginTop: 8,
    color: "#2563eb",
    textAlign: "center",
    fontWeight: "700",
  },
});
