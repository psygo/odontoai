export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center font-semibold text-lg">Business Manager</div>
        {children}
      </div>
    </div>
  );
}
