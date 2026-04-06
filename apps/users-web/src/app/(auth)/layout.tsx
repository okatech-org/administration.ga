export default function AuthGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Auth pages (sign-in, sign-up, register) render their own AuthLayout
  // This route group just ensures no Header/Footer from (public) is applied
  return <>{children}</>
}
