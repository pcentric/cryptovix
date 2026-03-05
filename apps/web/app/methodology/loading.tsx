export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="skeleton h-10 w-48 mb-2" />
          <div className="skeleton h-6 w-72" />
        </div>

        {/* Content sections */}
        <div className="space-y-8">
          {/* Section 1 */}
          <div>
            <div className="skeleton h-8 w-48 mb-4" />
            <div className="space-y-3">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-3/4" />
            </div>
          </div>

          {/* Section 2 */}
          <div>
            <div className="skeleton h-8 w-56 mb-4" />
            <div className="space-y-3">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-5/6" />
            </div>
          </div>

          {/* Section 3 */}
          <div>
            <div className="skeleton h-8 w-40 mb-4" />
            <div className="space-y-3">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-4/5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
