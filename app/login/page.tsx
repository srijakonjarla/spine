import { CoverPanel } from "@/components/login/CoverPanel";
import { LoginForm } from "@/components/login/LoginForm";

export default function LoginPage() {
  return (
    <div
      className="fixed inset-0 grid grid-cols-1 lg:grid-cols-[1fr_460px]"
      style={{ background: "#1c0e1f" }}
    >
      <CoverPanel />
      <LoginForm />
    </div>
  );
}
