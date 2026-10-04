import { AuthGate } from "@/components/auth-gate";

export default function Home() {
  return <AuthGate supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL} supabaseKey={process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY} />;
}
