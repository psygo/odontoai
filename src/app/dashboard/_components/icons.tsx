interface IconProps {
  className?: string;
}

function Svg({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      {children}
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10" />
    </Svg>
  );
}

export function BillingIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 6h16v12H4z" />
      <path d="M4 10h16M8 15h3" />
    </Svg>
  );
}

export function PatientsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M16 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1" />
      <circle cx="9.5" cy="7.5" r="3.5" />
      <path d="M17 8a3 3 0 100-6" />
      <path d="M22 20v-1a4 4 0 00-3-3.87" />
    </Svg>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M21 12a8 8 0 01-11.5 7.2L3 21l1.8-6.5A8 8 0 1121 12z" />
    </Svg>
  );
}
