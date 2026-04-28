import { DarkAppHeader } from "@/components/DarkAppHeader";
import { ResetPasswordClient } from "./ResetPasswordClient";

export const metadata = {
  title: "Nova senha · Miragem Fantasia",
  description: "Redefinir senha da conta",
};

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-black pt-[104px] text-zinc-100">
      <DarkAppHeader />
      <ResetPasswordClient />
    </div>
  );
}
