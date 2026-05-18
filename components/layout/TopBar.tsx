interface TopBarProps {
  title: string;
  subtitle?: string;
}

export default function TopBar({ title, subtitle }: TopBarProps) {
  return (
    <header className="h-16 flex items-center px-8 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-30">
      <div>
        <h1 className="text-lg font-semibold text-white">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </header>
  );
}
