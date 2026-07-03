export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-2 text-muted-foreground">
        The page you were looking for doesn't exist or has been moved.
      </p>
      <a
        href="/"
        className="mt-6 inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
      >
        Back to home
      </a>
    </div>
  );
}
