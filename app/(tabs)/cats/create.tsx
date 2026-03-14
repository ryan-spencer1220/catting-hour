// Hide from tab bar and immediately redirect to the non-tabbed create screen under /cats/create
export const unstable_settings = { tabBarButton: () => null };

import { useRouter } from "expo-router";
import { useEffect } from "react";

export default function CatsCreateRedirect() {
  const router = useRouter();
  useEffect(() => {
    // replace so user can't go back to this placeholder
    router.replace("/cats/create");
  }, [router]);
  return null;
}
