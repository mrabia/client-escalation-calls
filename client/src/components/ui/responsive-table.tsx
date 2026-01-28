/**
 * Responsive Table Component
 * Automatically converts tables to card view on mobile devices
 */

import { cn } from "@/lib/utils";
import { ReactNode, useState } from "react";

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => ReactNode;
  hideOnMobile?: boolean;
  priority?: number; // Lower number = higher priority (shown first on mobile)
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  className?: string;
  emptyMessage?: string;
  mobileCardRender?: (item: T, columns: Column[]) => ReactNode;
}

export function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  className,
  emptyMessage = "No data available",
  mobileCardRender,
}: ResponsiveTableProps<T>) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (key: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  // Sort columns by priority for mobile view
  const sortedColumns = [...columns].sort((a, b) => (a.priority || 99) - (b.priority || 99));
  const visibleMobileColumns = sortedColumns.filter(col => !col.hideOnMobile).slice(0, 3);
  const hiddenMobileColumns = sortedColumns.filter(col => !visibleMobileColumns.includes(col));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-sm font-medium text-muted-foreground"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr
                key={keyExtractor(item)}
                className={cn(
                  "border-b border-border/50 transition-colors",
                  onRowClick && "cursor-pointer hover:bg-muted/50"
                )}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-sm">
                    {col.render ? col.render(item[col.key], item) : item[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {data.map((item) => {
          const key = keyExtractor(item);
          const isExpanded = expandedRows.has(key);

          if (mobileCardRender) {
            return (
              <div key={key} onClick={() => onRowClick?.(item)}>
                {mobileCardRender(item, columns)}
              </div>
            );
          }

          return (
            <div
              key={key}
              className={cn(
                "bg-card border border-border rounded-lg overflow-hidden",
                "animate-fade-in-up"
              )}
            >
              {/* Main visible content */}
              <div
                className={cn(
                  "p-4",
                  onRowClick && "cursor-pointer"
                )}
                onClick={() => onRowClick?.(item)}
              >
                <div className="space-y-2">
                  {visibleMobileColumns.map((col) => (
                    <div key={col.key} className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{col.label}</span>
                      <span className="text-sm font-medium">
                        {col.render ? col.render(item[col.key], item) : item[col.key]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expandable section */}
              {hiddenMobileColumns.length > 0 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRow(key);
                    }}
                    className="w-full px-4 py-2 text-xs text-muted-foreground bg-muted/30 hover:bg-muted/50 transition-colors flex items-center justify-center gap-1"
                  >
                    {isExpanded ? "Show less" : `Show ${hiddenMobileColumns.length} more fields`}
                    <svg
                      className={cn(
                        "w-4 h-4 transition-transform",
                        isExpanded && "rotate-180"
                      )}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="p-4 pt-2 border-t border-border/50 space-y-2 animate-fade-in-down">
                      {hiddenMobileColumns.map((col) => (
                        <div key={col.key} className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">{col.label}</span>
                          <span className="text-sm">
                            {col.render ? col.render(item[col.key], item) : item[col.key]}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Mobile-friendly action buttons
export function MobileActions({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn(
      "flex flex-wrap gap-2",
      "md:flex-nowrap",
      className
    )}>
      {children}
    </div>
  );
}

// Mobile bottom navigation bar
interface MobileNavItem {
  icon: ReactNode;
  label: string;
  href: string;
  active?: boolean;
}

export function MobileBottomNav({ items }: { items: MobileNavItem[] }) {
  return (
    <nav className="mobile-nav safe-area-bottom">
      {items.map((item, index) => (
        <a
          key={index}
          href={item.href}
          className={cn(
            "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors",
            item.active
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {item.icon}
          <span className="text-xs">{item.label}</span>
        </a>
      ))}
    </nav>
  );
}

// Swipeable card component
interface SwipeableCardProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: ReactNode;
  rightAction?: ReactNode;
  className?: string;
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  className,
}: SwipeableCardProps) {
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [swiping, setSwiping] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping) return;
    const diff = e.touches[0].clientX - startX;
    setCurrentX(Math.max(-100, Math.min(100, diff)));
  };

  const handleTouchEnd = () => {
    if (currentX < -50 && onSwipeLeft) {
      onSwipeLeft();
    } else if (currentX > 50 && onSwipeRight) {
      onSwipeRight();
    }
    setCurrentX(0);
    setSwiping(false);
  };

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Left action background */}
      {leftAction && (
        <div className="absolute inset-y-0 left-0 w-20 bg-neon-green/20 flex items-center justify-center">
          {leftAction}
        </div>
      )}
      
      {/* Right action background */}
      {rightAction && (
        <div className="absolute inset-y-0 right-0 w-20 bg-destructive/20 flex items-center justify-center">
          {rightAction}
        </div>
      )}

      {/* Main content */}
      <div
        className="relative bg-card transition-transform"
        style={{ transform: `translateX(${currentX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
