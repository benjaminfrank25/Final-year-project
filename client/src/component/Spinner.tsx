type SpinnerProps = {
  size?: number;
  className?: string;
};

export default function Spinner({ size = 24, className = "" }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      style={{ width: size, height: size }}
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}
