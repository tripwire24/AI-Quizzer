'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error(error);

  return (
    <html lang="en">
      <body>
        <main className="min-h-screen bg-gray-900 flex items-center justify-center p-6 text-white">
          <section className="w-full max-w-md rounded-3xl bg-gray-800 p-8 text-center shadow-2xl ring-1 ring-white/10">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 text-3xl text-red-200">
              !
            </div>
            <h1 className="mb-3 text-3xl font-black">Something went wrong</h1>
            <p className="mb-6 text-sm leading-relaxed text-gray-400">
              The live lab hit a browser issue. Reload the current screen, or go back to the home screen and create a fresh game.
            </p>
            <div className="grid gap-3">
              <button
                onClick={reset}
                className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white transition-colors hover:bg-indigo-500"
              >
                Try again
              </button>
              <button
                onClick={() => {
                  window.location.href = '/';
                }}
                className="rounded-xl bg-white/10 px-5 py-3 font-bold text-white transition-colors hover:bg-white/15"
              >
                Back to home
              </button>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
