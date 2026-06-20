interface Props {
  icon: string;
  label: string;
  value: number | string;
  color: "blue" | "red" | "yellow" | "green";
}

const colorMap: Record<string, string> = {
  blue: "bg-blue-600/20 text-blue-400",
  red: "bg-red-600/20 text-red-400",
  yellow: "bg-yellow-600/20 text-yellow-400",
  green: "bg-green-600/20 text-green-400",
};

const valueColorMap: Record<string, string> = {
  blue: "text-white",
  red: "text-red-400",
  yellow: "text-yellow-400",
  green: "text-green-400",
};

export default function StatCard({ icon, label, value, color }: Props) {
  return (
    <div
      className="stat-card rounded-2xl p-5 hover:-translate-y-1 transition-all duration-300"
      style={{
        background: "rgba(30,41,59,0.8)",
        border: "1px solid rgba(71,85,105,0.4)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}
        >
          <i className={`fas ${icon}`}></i>
        </div>
      </div>
      <p className={`text-3xl font-bold ${valueColorMap[color]}`}>{value}</p>
      <p className="text-slate-400 text-sm mt-1">{label}</p>
    </div>
  );
}
