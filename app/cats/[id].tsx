import bundledCats from "@/data/cats.json";
import { deleteCat, fetchCatById } from "@/lib/cats";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function CatDetail() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id ?? "";
  const router = useRouter();
  const [cat, setCat] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Try to load user cats from AsyncStorage
        const raw = await AsyncStorage.getItem("myCats");
        let myCats = [];
        if (raw) {
          myCats = JSON.parse(raw);
        }

        // find in myCats first
        const foundLocal = (myCats as any[]).find((c) => String(c.id) === String(id));
        if (foundLocal) {
          if (mounted) setCat(foundLocal);
          return;
        }

        // fallback to backend
        try {
          const backend = await fetchCatById(id);
          if (backend) {
            if (mounted) setCat(backend);
            return;
          }
        } catch (e) {
          // ignore backend error
        }

        // fallback to bundled cats
        const foundBundled = (bundledCats as any[]).find((c) => String(c.id) === String(id));
        if (foundBundled) {
          if (mounted) setCat(foundBundled);
          return;
        }

        if (mounted) setCat(null);
      } catch (err) {
        if (mounted) setCat(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!cat) {
    return (
      <View style={styles.center}>
        <Text>Cat not found</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {cat.image ? <Image source={{ uri: cat.image }} style={styles.image} /> : null}
      <Text style={styles.name}>{cat.name}</Text>
      <Text style={styles.meta}>
        {cat.type} • {cat.temperament} • {cat.indoor ? "Indoor" : "Outdoor"}
      </Text>
      <Text style={styles.notes}>{cat.notes}</Text>

      <View style={styles.actionRow}>
        <Pressable
          style={[styles.editButton]}
          onPress={() => {
            // placeholder edit action for now
            // eslint-disable-next-line no-console
            console.log("Edit cat", id);
          }}
        >
          <Text style={styles.editText}>Edit</Text>
        </Pressable>

        <Pressable
          style={[styles.deleteButton]}
          onPress={() => {
            Alert.alert("Delete cat", "Are you sure you want to delete this cat? This action cannot be undone.", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                  setDeleting(true);
                  try {
                    await deleteCat(id);
                    // remove from local storage if present
                    try {
                      const raw = await AsyncStorage.getItem("myCats");
                      if (raw) {
                        const myCats = JSON.parse(raw) as any[];
                        const filtered = myCats.filter((c) => String(c.id) !== String(id));
                        await AsyncStorage.setItem("myCats", JSON.stringify(filtered));
                      }
                    } catch (e) {
                      // ignore local removal errors
                      console.warn("Failed to update local storage after delete", e);
                    }

                    Alert.alert("Deleted", "Cat removed successfully.");
                    router.back();
                  } catch (e: any) {
                    Alert.alert("Delete failed", e?.message || String(e));
                  } finally {
                    setDeleting(false);
                  }
                },
              },
            ]);
          }}
          disabled={deleting}
        >
          <Text style={styles.deleteText}>{deleting ? "Deleting..." : "Delete cat"}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  image: { width: 300, height: 200, borderRadius: 8, marginBottom: 12 },
  name: { fontSize: 22, fontWeight: "700" },
  meta: { color: "#6b7280", marginTop: 6 },
  notes: { marginTop: 12, textAlign: "center" },
  actionRow: { flexDirection: "row", marginTop: 20, width: "100%", justifyContent: "center", gap: 12 },
  editButton: { flex: 1, marginRight: 6, padding: 12, borderRadius: 8, backgroundColor: "#0a7ea4", alignItems: "center" },
  editText: { color: "#fff", fontWeight: "700" },
  deleteButton: { flex: 1, marginLeft: 6, padding: 12, borderRadius: 8, backgroundColor: "#dc2626", alignItems: "center" },
  deleteText: { color: "#fff", fontWeight: "700" },
});
