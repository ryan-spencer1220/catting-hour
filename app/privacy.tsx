import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LAST_UPDATED = "June 2025";

export default function PrivacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dark = useColorScheme() === "dark";

  const bg = dark ? "#0f1720" : "#fff";
  const textPrimary = dark ? "#fff" : "#111827";
  const textBody = dark ? "#d1d5db" : "#374151";
  const textMuted = dark ? "#6b7280" : "#9ca3af";
  const headingColor = dark ? "#fff" : "#111827";
  const divider = dark ? "#1e2d3d" : "#f3f4f6";

  return (
    <View style={[styles.screen, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: bg }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.updated, { color: textMuted }]}>Last updated: {LAST_UPDATED}</Text>

        <Section title="Overview" heading={headingColor} divider={divider}>
          <Body color={textBody}>
            The Catting Hour ("we", "our", or "us") is committed to protecting your privacy.
            This policy explains what information we collect when you use our app, how we use
            it, and the choices you have.
          </Body>
        </Section>

        <Section title="Information We Collect" heading={headingColor} divider={divider}>
          <Body color={textBody}>We collect the following information when you use The Catting Hour:</Body>
          <Bullet color={textBody}>
            <Text style={{ fontWeight: "600" }}>Account information</Text>
            {" — "}your email address and chosen username when you register.
          </Bullet>
          <Bullet color={textBody}>
            <Text style={{ fontWeight: "600" }}>Profile data</Text>
            {" — "}an optional profile photo and city you choose to display.
          </Bullet>
          <Bullet color={textBody}>
            <Text style={{ fontWeight: "600" }}>Cat posts</Text>
            {" — "}cat names, descriptions, photos, and the location you pin on the map when
            you add a cat.
          </Bullet>
          <Bullet color={textBody}>
            <Text style={{ fontWeight: "600" }}>Check-ins and likes</Text>
            {" — "}notes you write and likes you leave on cat profiles.
          </Bullet>
          <Bullet color={textBody}>
            <Text style={{ fontWeight: "600" }}>Device location</Text>
            {" — "}only when you explicitly grant permission, and only to show nearby cats or
            pre-fill a map pin. We do not track your location in the background.
          </Bullet>
          <Bullet color={textBody}>
            <Text style={{ fontWeight: "600" }}>Push notification token</Text>
            {" — "}if you enable notifications, a device token is stored to deliver them.
          </Bullet>
        </Section>

        <Section title="How We Use Your Information" heading={headingColor} divider={divider}>
          <Body color={textBody}>Your information is used to:</Body>
          <Bullet color={textBody}>Create and manage your account.</Bullet>
          <Bullet color={textBody}>Display cat posts, check-ins, and profiles to other users.</Bullet>
          <Bullet color={textBody}>Send push notifications you have opted into.</Bullet>
          <Bullet color={textBody}>Improve and maintain the app.</Bullet>
          <Body color={textBody}>We do not sell your personal information to third parties.</Body>
        </Section>

        <Section title="Third-Party Services" heading={headingColor} divider={divider}>
          <Body color={textBody}>
            We use the following third-party services that may process your data:
          </Body>
          <Bullet color={textBody}>
            <Text style={{ fontWeight: "600" }}>Supabase</Text>
            {" — "}our backend provider (database, authentication, and file storage). Your
            data is stored on Supabase-managed infrastructure. See supabase.com/privacy.
          </Bullet>
          <Bullet color={textBody}>
            <Text style={{ fontWeight: "600" }}>Mapbox</Text>
            {" — "}used to render the cat map. Mapbox may receive your approximate location
            when you view the map. See mapbox.com/legal/privacy.
          </Bullet>
          <Bullet color={textBody}>
            <Text style={{ fontWeight: "600" }}>Expo / React Native</Text>
            {" — "}the framework used to build the app. Expo may collect anonymous crash and
            usage diagnostics. See expo.dev/privacy.
          </Bullet>
        </Section>

        <Section title="Data Retention" heading={headingColor} divider={divider}>
          <Body color={textBody}>
            Your account data is retained for as long as your account is active. Cat posts,
            photos, and check-ins you create remain visible until you delete them or your
            account. You may request deletion of your account and associated data at any
            time by contacting us (see below).
          </Body>
        </Section>

        <Section title="Your Rights" heading={headingColor} divider={divider}>
          <Body color={textBody}>You have the right to:</Body>
          <Bullet color={textBody}>Access the personal data we hold about you.</Bullet>
          <Bullet color={textBody}>Correct inaccurate data in your profile.</Bullet>
          <Bullet color={textBody}>Request deletion of your account and data.</Bullet>
          <Bullet color={textBody}>Withdraw consent to location access at any time via your device settings.</Bullet>
          <Bullet color={textBody}>Opt out of push notifications at any time in the app or device settings.</Bullet>
        </Section>

        <Section title="Children's Privacy" heading={headingColor} divider={divider}>
          <Body color={textBody}>
            The Catting Hour is not directed at children under 13. We do not knowingly
            collect personal information from children under 13. If you believe a child
            has provided us with personal information, please contact us and we will
            delete it promptly.
          </Body>
        </Section>

        <Section title="Changes to This Policy" heading={headingColor} divider={divider}>
          <Body color={textBody}>
            We may update this Privacy Policy from time to time. We will notify you of
            significant changes by updating the "Last updated" date above. Continued use
            of the app after changes constitutes acceptance of the updated policy.
          </Body>
        </Section>

        <Section title="Contact Us" heading={headingColor} divider={divider}>
          <Body color={textBody}>
            If you have questions about this Privacy Policy or want to exercise your rights,
            please contact us at:
          </Body>
          <Body color={textBody} style={{ fontWeight: "600" }}>ryan.spencer1220@gmail.com</Body>
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children, heading, divider }: {
  title: string;
  children: React.ReactNode;
  heading: string;
  divider: string;
}) {
  return (
    <View style={[styles.section, { borderTopColor: divider }]}>
      <Text style={[styles.sectionTitle, { color: heading }]}>{title}</Text>
      {children}
    </View>
  );
}

function Body({ color, children, style }: { color: string; children: React.ReactNode; style?: object }) {
  return <Text style={[styles.body, { color }, style]}>{children}</Text>;
}

function Bullet({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={[styles.bulletDot, { color }]}>•</Text>
      <Text style={[styles.body, { color, flex: 1 }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  updated: { fontSize: 13, marginBottom: 4 },
  section: { marginTop: 28, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  body: { fontSize: 14, lineHeight: 22, marginBottom: 8 },
  bulletRow: { flexDirection: "row", gap: 8, marginBottom: 6 },
  bulletDot: { fontSize: 14, lineHeight: 22 },
});
