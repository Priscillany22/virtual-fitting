import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    // Stack Navigator is used for simple screen-to-screen navigation
    <Stack screenOptions={{ headerShown: false }}>
      {/* CRITICAL FIX: Explicitly register the index and scan routes.
        This ensures 'useRouter()' and 'router.back()' are defined.
      */}
      <Stack.Screen name="index" /> 
      <Stack.Screen name="scan" />
    </Stack>
  );
}