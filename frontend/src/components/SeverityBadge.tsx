interface Props {
  severity: string;
}

export default function SeverityBadge({ severity }: Props) {
  const styles: Record<string, string> = {
    High: "bg-red-500/20 text-red-400 border border-red-500/30",
    Medium: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
    Low: "bg-green-500/20 text-green-400 border border-green-500/30",
  };

  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${styles[severity] || styles.Low}`}
    >
      {severity}
    </span>
  );
}
