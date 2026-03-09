export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="skeleton h-10 w-32 mb-2" />
          <div className="skeleton h-6 w-64" />
        </div>

        {/* Diagnostics sections */}
        <div className="space-y-6">
          {/* Metrics card */}
          <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
            <div className="skeleton h-6 w-32 mb-4" />
            <div className="space-y-3">
              <div className="skeleton h-4 w-48" />
              <div className="skeleton h-4 w-40" />
              <div className="skeleton h-4 w-56" />
            </div>
          </div>

          {/* Latest reading card */}
          <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
            <div className="skeleton h-6 w-48 mb-4" />
            <div className="space-y-3">
              <div className="skeleton h-4 w-52" />
              <div className="skeleton h-4 w-44" />
              <div className="skeleton h-4 w-48" />
            </div>
          </div>

          {/* Health status card */}
          <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
            <div className="skeleton h-6 w-28 mb-4" />
            <div className="space-y-3">
              <div className="skeleton h-4 w-40" />
              <div className="skeleton h-4 w-36" />
              <div className="skeleton h-4 w-48" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
