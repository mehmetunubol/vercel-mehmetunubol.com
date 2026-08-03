export type ItemIconName =
  | "flag"
  | "camera"
  | "refresh"
  | "receipt"
  | "bank"
  | "card"
  | "shield"
  | "briefcase"
  | "home"
  | "heart"
  | "building"
  | "plus-circle";

const paths: Record<ItemIconName, string> = {
  flag: "M5 3v14M5 4h9l-1.8 3L14 10H5",
  camera: "M4 7h2.5L8 5h4l1.5 2H16a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zM10 13a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  refresh: "M4 10a6 6 0 0 1 10.2-4.3M16 10a6 6 0 0 1-10.2 4.3M13.5 4v3h-3M6.5 16v-3h3",
  receipt: "M5 3h10v14l-2-1.3L11 17l-2-1.3L7 17l-2-1.3V3zM7.5 7h5M7.5 10h5",
  bank: "M3 8l7-4 7 4M4 8v7M8 8v7M12 8v7M16 8v7M3 15h14",
  card: "M3 6h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM2 9h16M5 12.5h3",
  shield: "M10 2.5 16 5v4.5c0 4-2.7 6.7-6 8-3.3-1.3-6-4-6-8V5l6-2.5z",
  briefcase: "M3 7h14a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zM7 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M2 11h16",
  home: "M4 9.5 10 4l6 5.5V16a1 1 0 0 1-1 1h-3v-4H8v4H5a1 1 0 0 1-1-1z",
  heart: "M10 16.5 4 11a3.5 3.5 0 0 1 5-5l1 1 1-1a3.5 3.5 0 0 1 5 5z",
  building: "M4 17V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v13M14 17v-6h3a1 1 0 0 1 1 1v5M3 17h14M6.5 6h2M6.5 9h2M6.5 12h2",
  "plus-circle": "M10 3.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM10 7v6M7 10h6",
};

export function ItemIcon({ name, className }: { name: ItemIconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className ?? "h-4.5 w-4.5"}
      aria-hidden="true"
    >
      <path
        d={paths[name]}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
