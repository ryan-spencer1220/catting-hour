import { fetchAllCats } from "@/lib/cats";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function MyCatsScreen() {
  const router = useRouter();
  const [cats, setCats] = useState<any[] | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const rows = await fetchAllCats();
        if (!mounted) return;
        setCats(rows);
      } catch (e) {
        console.warn("Failed to load cats from Supabase", e);
        if (mounted) setCats([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (cats === null)
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );

  if (!cats.length) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>No cats logged yet.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={cats}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/cats/${item.id}`)}>
            {item.image ? <Image source={{ uri: item.image }} style={styles.image} /> : <View style={styles.imagePlaceholder} />}
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.type} · {item.temperament}
              </Text>
            </View>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={{ padding: 12 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: { flexDirection: "row", alignItems: "center", padding: 12, backgroundColor: "#f9fafb", borderRadius: 8 },
  image: { width: 72, height: 72, borderRadius: 8, marginRight: 12 },
  imagePlaceholder: { width: 72, height: 72, borderRadius: 8, marginRight: 12, backgroundColor: "#e5e7eb" },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "700" },
  meta: { color: "#6b7280", marginTop: 4 },
});
