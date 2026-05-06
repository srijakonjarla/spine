"use client";

import { TabId } from "@/lib/books";

export function TabBar({
  tabs,
  activeTab,
  setActiveTab,
}: {
  tabs: { id: TabId; label: string }[];
  activeTab: TabId;
  setActiveTab: (t: TabId) => void;
}) {
  return (
    <div className="sticky top-0 z-20 bg-cream border-b border-line shadow-[0_2px_8px_var(--border-light)] flex gap-1 px-4 sm:px-10 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`tab-btn${activeTab === tab.id ? " active" : ""}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
