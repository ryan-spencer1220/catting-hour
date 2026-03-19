export const unstable_settings = { tabBarButton: () => null };

export default function CatsIndex() {
  // This index file intentionally renders nothing — the actual create/view/edit
  // screens live outside the tab group. Having a default export prevents router warnings.
  return null;
}
