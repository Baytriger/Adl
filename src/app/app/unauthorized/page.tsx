import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/button-styles";

export const metadata: Metadata = { title: "No permission" };

export default function Unauthorized() {
  return (
    <div className="max-w-md">
      <h1 className="text-xl font-semibold tracking-tight">You don&apos;t have permission for that</h1>
      <p className="mt-2 text-sm text-muted">
        Your role doesn&apos;t allow this page or action. If you think it should, ask an ADL admin to change your role.
      </p>
      <Link href="/app" className={`${buttonClass("primary")} mt-6`}>Back to overview</Link>
    </div>
  );
}
