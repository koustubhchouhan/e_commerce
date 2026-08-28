export default function GlassCard({ children, className = '', hover = true }) {
  return (
    <div className={`glass-panel ${hover ? 'glass-panel-hover' : ''} rounded-2xl ${className}`}>
      {children}
    </div>
  );
}
