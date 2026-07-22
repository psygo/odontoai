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

export function CalendarIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </Svg>
  );
}

export function AppointmentsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h6" />
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

export function RxIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10.5 20.5L3.5 13.5a4 4 0 015.66-5.66l7 7a4 4 0 01-5.66 5.66z" />
      <path d="M14.5 5.5l4 4" />
      <path d="M7 13l4 4" />
    </Svg>
  );
}
