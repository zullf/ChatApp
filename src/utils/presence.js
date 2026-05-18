import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";

export function getPresenceText(user) {
  if (user?.isOnline) {
    return "Online";
  }

  const lastSeenDate = user?.lastSeen?.toDate?.();

  if (!lastSeenDate) {
    return "Offline";
  }

  return `Terakhir online ${lastSeenDate.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export async function updateUserPresence(user, isOnline) {
  if (!user) {
    return;
  }

  await setDoc(
    doc(db, "users", user.uid),
    {
      uid: user.uid,
      name: user.displayName || user.email,
      email: user.email,
      isOnline,
      lastSeen: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
