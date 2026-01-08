"use client";

export default function AnnouncementsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[#1a1a2e]/40">Announcements</p>
        <h1 className="text-2xl font-semibold text-[#1a1a2e]">House Announcements</h1>
      </div>

      <div className="card p-6">
        <p className="text-sm text-[#1a1a2e]/60">
          Announcement posting will be enabled once all house members have access to this app.
        </p>
      </div>
    </div>
  );
}
