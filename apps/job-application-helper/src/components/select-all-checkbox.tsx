"use client";

export function SelectAllCheckbox({ name }: { name: string }) {
  return (
    <input
      type="checkbox"
      aria-label="Select all jobs on this page"
      className="h-4 w-4 accent-accent"
      onChange={(event) => {
        const checked = event.currentTarget.checked;
        const form = event.currentTarget.closest("form");
        form?.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`).forEach((checkbox) => {
          checkbox.checked = checked;
        });
      }}
    />
  );
}
