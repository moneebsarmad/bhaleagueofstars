type StatCardProps = {
  label: string;
  value: string;
  helper?: string;
};

export default function StatCard({ label, value, helper }: StatCardProps) {
  return (
    <div className="card p-5">
      <p className="text-xs uppercase tracking-[0.3em] text-[#1a1a2e]/40 font-semibold">{label}</p>
      <p className="text-2xl font-semibold text-[#1a1a2e] mt-2">{value}</p>
      {helper && <p className="text-sm text-[#1a1a2e]/50 mt-2">{helper}</p>}
    </div>
  );
}
