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
      {/* Gold seal — sits on the seam between panels, above both */}
      <div
        className="absolute hidden lg:flex items-center justify-center font-serif font-bold z-20"
        style={{
          top: 56,
          right: 442,
          width: 36,
          height: 36,
          background: "var(--gold)",
          borderRadius: "50%",
          boxShadow: "0 3px 10px rgba(0,0,0,0.2)",
          fontSize: 20,
          color: "var(--plum)",
          lineHeight: 1,
        }}
      >
        s<span className="text-terra">.</span>
      </div>
    </div>
  );
}
