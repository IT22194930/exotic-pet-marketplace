export default function StepIndicator({ currentStep, totalSteps = 2 }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step, idx) => (
        <div key={step} className="flex items-center gap-2 flex-1">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${
              currentStep > step
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                : currentStep === step
                  ? "bg-emerald-500 border-emerald-400 text-white"
                  : "bg-white/4 border-white/10 text-slate-500"
            }`}
          >
            {step}
          </div>
          {idx < totalSteps - 1 && (
            <div
              className={`flex-1 h-px ${currentStep > step ? "bg-emerald-500/40" : "bg-white/10"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
