import bundledCats from "@/data/cats.json";
import { fetchCatById } from "@/lib/cats";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";

export default function CatDetail() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id ?? "";
  const [cat, setCat] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

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
});
