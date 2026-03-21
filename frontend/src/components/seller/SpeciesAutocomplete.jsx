import { useState } from "react";

export default function SpeciesAutocomplete({
  name = "species",
  value,
  onChange,
  restrictedSpecies = [],
  required = true,
  placeholder = "e.g. Ara ararauna",
  className = "",
  labelClassName = "",
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filterSuggestions = (input) => {
    if (!input.trim()) return [];
    const lower = input.toLowerCase();
    return restrictedSpecies.filter((s) => s.includes(lower)).slice(0, 5);
  };

  const handleChange = (e) => {
    onChange(e);
    const newSuggestions = filterSuggestions(e.target.value);
    setSuggestions(newSuggestions);
    setShowSuggestions(newSuggestions.length > 0);
  };

  const handleFocus = () => {
    const newSuggestions = filterSuggestions(value);
    setSuggestions(newSuggestions);
    setShowSuggestions(newSuggestions.length > 0);
  };

  const handleBlur = () => {
    setTimeout(() => setShowSuggestions(false), 150);
  };

  const handleSelectSuggestion = (suggestion) => {
    const syntheticEvent = {
      target: { name, value: suggestion },
    };
    onChange(syntheticEvent);
    setShowSuggestions(false);
  };

  const inputClass =
    className ||
    "w-full px-3.5 py-2.5 rounded-lg bg-white/[0.04] border border-white/10 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-emerald-500 focus:bg-emerald-500/[0.05] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] transition-all";

  const labelClass =
    labelClassName ||
    "block text-[0.72rem] font-semibold text-slate-400 uppercase tracking-widest mb-1.5";

  return (
    <div>
      <label className={labelClass}>Species</label>
      <div className="relative">
        <input
          name={name}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          required={required}
          placeholder={placeholder}
          className={inputClass}
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a2f45] border border-white/10 rounded-lg shadow-lg z-10 overflow-hidden">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSuggestion(suggestion)}
                className="w-full text-left px-3.5 py-2.5 text-sm text-slate-200 hover:bg-emerald-500/15 hover:text-emerald-300 transition-colors border-b border-white/5 last:border-b-0"
              >
                🔒 {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
