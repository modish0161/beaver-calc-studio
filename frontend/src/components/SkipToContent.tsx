
export default function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-6 focus:py-3 focus:bg-blue-600 focus:text-white focus:rounded-xl focus:font-bold focus:shadow-2xl focus:outline-none"
    >
      Skip to main content
    </a>
  );
}
