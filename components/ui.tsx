"use client";

/** Small shared kawaii controls reused across pre-join and the room. */

export function RoundToggle({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 ${
        active
          ? "bg-blush/25 text-petal-light ring-1 ring-blush/50"
          : "bg-night-2 text-petal/45 ring-1 ring-petal/10"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * A name field that commits on blur / Enter. Remounts (via key) when the external
 * value changes so a rename coming in over the wire updates the box too.
 */
export function NameInput({
  value,
  onSave,
  placeholder = "name",
  disabled = false,
  className = "",
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <input
      key={value}
      defaultValue={value}
      disabled={disabled}
      placeholder={placeholder}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      onBlur={(e) => {
        const v = e.target.value.trim();
        if (v && v !== value) onSave(v);
        else e.target.value = value;
      }}
      className={`rounded-full bg-night-2 px-3.5 py-1.5 text-petal-light outline-none ring-1 ring-petal/20 transition focus:ring-blush disabled:opacity-40 ${className}`}
    />
  );
}
