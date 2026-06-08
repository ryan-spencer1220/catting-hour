import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LAST_UPDATED = "June 2025";

export default function TermsScreen() {
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
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.updated, { color: textMuted }]}>Last updated: {LAST_UPDATED}</Text>

        <Section title="Acceptance of Terms" heading={headingColor} divider={divider}>
          <Body color={textBody}>
            By downloading or using The Catting Hour (&ldquo;the app&rdquo;), you agree to be bound by
            these Terms of Service. If you do not agree, please do not use the app.
          </Body>
        </Section>

        <Section title="Description of Service" heading={headingColor} divider={divider}>
          <Body color={textBody}>
            The Catting Hour is a social platform that lets users discover, share, and
            discuss cats in their local area. Core features include a cat map, photo
            uploads, check-ins, likes, and user profiles.
          </Body>
        </Section>

        <Section title="Account Registration" heading={headingColor} divider={divider}>
          <Body color={textBody}>
            You must be at least 13 years old to create an account. You agree to provide
            accurate information and to keep your account credentials secure. You are
            responsible for all activity that occurs under your account.
          </Body>
        </Section>

        <Section title="User Content" heading={headingColor} divider={divider}>
          <Body color={textBody}>
            You retain ownership of content you submit (photos, cat profiles, check-in
            notes). By posting content, you grant us a non-exclusive, royalty-free licence
            to display and distribute it within the app. You are solely responsible for
            ensuring your content:
          </Body>
          <Bullet color={textBody}>Does not infringe any third-party intellectual property rights.</Bullet>
          <Bullet color={textBody}>Does not contain illegal, harmful, or offensive material.</Bullet>
          <Bullet color={textBody}>Does not contain personal data of others without their consent.</Bullet>
          <Bullet color={textBody}>Is not misleading or fraudulent.</Bullet>
          <Body color={textBody}>
            We reserve the right to remove content that violates these terms or that we
            deem inappropriate, at our sole discretion.
          </Body>
        </Section>

        <Section title="Prohibited Conduct" heading={headingColor} divider={divider}>
          <Body color={textBody}>You agree not to:</Body>
          <Bullet color={textBody}>Use the app for any unlawful purpose.</Bullet>
          <Bullet color={textBody}>Harass, threaten, or harm other users.</Bullet>
          <Bullet color={textBody}>Post spam or unsolicited commercial content.</Bullet>
          <Bullet color={textBody}>Attempt to gain unauthorised access to other accounts or our systems.</Bullet>
          <Bullet color={textBody}>Scrape, copy, or redistribute app content without our permission.</Bullet>
          <Bullet color={textBody}>Impersonate another person or entity.</Bullet>
        </Section>

        <Section title="Intellectual Property" heading={headingColor} divider={divider}>
          <Body color={textBody}>
            The Catting Hour name, logo, and app design are our intellectual property.
            Nothing in these Terms grants you a right to use our trademarks or branding.
          </Body>
        </Section>

        <Section title="Disclaimer of Warranties" heading={headingColor} divider={divider}>
          <Body color={textBody}>
            The app is provided "as is" without warranties of any kind, express or implied.
            We do not warrant that the app will be uninterrupted, error-free, or free of
            viruses. Use of the app is at your own risk.
          </Body>
        </Section>

        <Section title="Limitation of Liability" heading={headingColor} divider={divider}>
          <Body color={textBody}>
            To the fullest extent permitted by law, we shall not be liable for any indirect,
            incidental, special, or consequential damages arising from your use of the app,
            even if we have been advised of the possibility of such damages.
          </Body>
        </Section>

        <Section title="Termination" heading={headingColor} divider={divider}>
          <Body color={textBody}>
            We may suspend or terminate your account at any time if you violate these Terms
            or for any other reason at our discretion. You may delete your account at any
            time by contacting us.
          </Body>
        </Section>

        <Section title="Changes to Terms" heading={headingColor} divider={divider}>
          <Body color={textBody}>
            We may update these Terms from time to time. We will notify you of significant
            changes by updating the "Last updated" date. Continued use of the app after
            changes constitutes acceptance of the updated Terms.
          </Body>
        </Section>

        <Section title="Governing Law" heading={headingColor} divider={divider}>
          <Body color={textBody}>
            These Terms are governed by the laws of the jurisdiction in which the developer
            is based, without regard to conflict of law principles.
          </Body>
        </Section>

        <Section title="Contact Us" heading={headingColor} divider={divider}>
          <Body color={textBody}>
            Questions about these Terms? Contact us at:
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
