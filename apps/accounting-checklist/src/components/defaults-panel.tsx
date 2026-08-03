"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { DEFAULT_CREDIT_CARDS, type ChecklistDef, type ChecklistDefaults } from "@/lib/checklist";

export function DefaultsPanel({
  def,
  defaults,
  onFieldDefaultChange,
  onCreditCardDefaultChange,
}: {
  def: ChecklistDef;
  defaults: ChecklistDefaults;
  onFieldDefaultChange: (key: string, value: string) => void;
  onCreditCardDefaultChange: (cardId: string, patch: { amount?: string; dueDate?: string }) => void;
}) {
  const itemsWithFields = def.items.filter((item) => item.fields.length > 0);
  const hasCreditCards = def.items.some((item) => item.repeatableKey === "creditCards");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Default values for upcoming months</CardTitle>
        <p className="text-sm text-muted">
          Pre-fills these values for any month that doesn&apos;t have its own yet. Editing a month
          always overrides the default.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {itemsWithFields.map((item) => (
          <div key={item.index} className="space-y-2">
            <div className="text-xs font-medium text-muted">{item.title}</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {item.fields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-xs font-medium text-muted">
                    {field.label}
                    {field.type === "date" ? " (day of month)" : ""}
                  </label>
                  <input
                    type={field.type === "date" ? "number" : field.type}
                    min={field.type === "date" ? 1 : undefined}
                    max={field.type === "date" ? 31 : undefined}
                    placeholder={field.type === "date" ? "e.g. 15" : undefined}
                    value={defaults.fields[field.key] ?? ""}
                    onChange={(e) => onFieldDefaultChange(field.key, e.target.value)}
                    className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm transition-colors duration-150 focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
        {hasCreditCards ? (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted">Credit cards</div>
            <div className="space-y-2">
              {DEFAULT_CREDIT_CARDS.map((card) => (
                <div key={card.id} className="flex flex-wrap items-center gap-2">
                  <span className="w-full shrink-0 text-sm sm:w-28">{card.label}</span>
                  <input
                    type="number"
                    placeholder="Amount"
                    value={defaults.creditCards[card.id]?.amount ?? ""}
                    onChange={(e) => onCreditCardDefaultChange(card.id, { amount: e.target.value })}
                    className="w-24 shrink-0 rounded-md border border-border bg-transparent px-3 py-2 text-sm transition-colors duration-150 focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:w-28"
                  />
                  <input
                    type="number"
                    min={1}
                    max={31}
                    placeholder="Due day, e.g. 15"
                    aria-label="Due date (day of month)"
                    value={defaults.creditCards[card.id]?.dueDate ?? ""}
                    onChange={(e) => onCreditCardDefaultChange(card.id, { dueDate: e.target.value })}
                    className="w-32 shrink-0 rounded-md border border-border bg-transparent px-3 py-2 text-sm transition-colors duration-150 focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:w-36"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
