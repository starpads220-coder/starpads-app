"use client";

export default function StorageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
        <h2 className="text-lg font-semibold text-red-800 mb-2">Storage page error</h2>
        <p className="text-sm text-red-600 mb-4">{error.message || "An unexpected error occurred."}</p>
        <button onClick={reset} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition">Try again</button>
      </div>
    </div>
  );
}
