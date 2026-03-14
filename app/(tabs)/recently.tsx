import bundledCats from "@/data/cats.json";
import { fetchAllCats } from "@/lib/cats";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";

export default function RecentlyScreen() {
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
        // fallback to bundled
        setCats((bundledCats as any[]) || []);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const sorted = useMemo(() => {
    try {
      return (cats || []).slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (e) {
      return [];
    }
  }, [cats]);

  function renderItem({ item }: { item: any }) {
    return (
      <Pressable style={styles.card} onPress={() => router.push(`/cats/${item.id}`)}>
        {item.image ? <Image source={{ uri: item.image }} style={styles.image} /> : <View style={styles.imagePlaceholder} />}
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.meta}>
            {item.type} · {item.temperament}
          </Text>
          <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      {cats === null ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(i) => String(i.id)}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={{ padding: 12 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  card: { flexDirection: "row", alignItems: "center", padding: 12, backgroundColor: "#f9fafb", borderRadius: 8 },
  image: { width: 72, height: 72, borderRadius: 8, marginRight: 12 },
  imagePlaceholder: { width: 72, height: 72, borderRadius: 8, marginRight: 12, backgroundColor: "#e5e7eb" },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "700" },
  meta: { color: "#6b7280", marginTop: 4 },
  time: { color: "#9ca3af", marginTop: 6, fontSize: 12 },
  sep: { height: 12 },
});
