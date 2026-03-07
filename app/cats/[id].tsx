import cats from "@/data/cats.json";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";

export default function CatDetail() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id ?? "";

  const cat = (cats as any[]).find((c) => String(c.id) === String(id));

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
