interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return <p className="text-xs text-[var(--fg-faint)]">{message}</p>;
}
