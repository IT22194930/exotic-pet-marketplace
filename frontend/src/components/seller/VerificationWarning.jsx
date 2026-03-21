export default function VerificationWarning({ isVerified }) {
  if (isVerified !== false) return null;

  return (
    <div className="max-w-6xl mx-auto mb-6 flex items-start gap-2.5 px-4 py-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-sm">
      🔒 Your seller account is{" "}
      <strong className="mx-1">pending verification</strong> by an admin.
      You won't be able to create new listings until it's approved.
    </div>
  );
}
