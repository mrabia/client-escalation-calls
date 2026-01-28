/**
 * Customizable Dashboard Component
 * Drag-and-drop widgets with persistence
 */

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { 
  GripVertical, 
  X, 
  Plus, 
  Settings, 
  Eye, 
  EyeOff,
  RotateCcw,
  Save,
  Layout
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

// Types
interface Widget {
  id: string;
  title: string;
  component: ReactNode;
  size: 'small' | 'medium' | 'large' | 'full';
  visible: boolean;
  order: number;
}

interface DashboardConfig {
  widgets: Widget[];
  layout: 'grid' | 'list';
}

interface DashboardContextType {
  config: DashboardConfig;
  updateWidget: (id: string, updates: Partial<Widget>) => void;
  reorderWidgets: (fromIndex: number, toIndex: number) => void;
  toggleWidget: (id: string) => void;
  resetToDefault: () => void;
  isEditMode: boolean;
  setIsEditMode: (value: boolean) => void;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export function useDashboardCustomization() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboardCustomization must be used within DashboardCustomizationProvider');
  }
  return context;
}

// Storage key
const STORAGE_KEY = 'mojavox_dashboard_config';

// Provider
interface DashboardCustomizationProviderProps {
  children: ReactNode;
  defaultWidgets: Omit<Widget, 'order' | 'visible'>[];
}

export function DashboardCustomizationProvider({ 
  children, 
  defaultWidgets 
}: DashboardCustomizationProviderProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [config, setConfig] = useState<DashboardConfig>(() => {
    // Try to load from localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge saved config with default widgets (in case new widgets were added)
        const savedWidgetIds = new Set(parsed.widgets.map((w: Widget) => w.id));
        const mergedWidgets = [
          ...parsed.widgets,
          ...defaultWidgets
            .filter(w => !savedWidgetIds.has(w.id))
            .map((w, i) => ({ ...w, visible: true, order: parsed.widgets.length + i }))
        ];
        return { ...parsed, widgets: mergedWidgets };
      } catch {
        // Invalid saved config, use default
      }
    }
    
    return {
      widgets: defaultWidgets.map((w, i) => ({ ...w, visible: true, order: i })),
      layout: 'grid' as const,
    };
  });

  // Save to localStorage whenever config changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      widgets: config.widgets.map(({ id, size, visible, order }) => ({ id, size, visible, order })),
      layout: config.layout,
    }));
  }, [config]);

  const updateWidget = useCallback((id: string, updates: Partial<Widget>) => {
    setConfig(prev => ({
      ...prev,
      widgets: prev.widgets.map(w => w.id === id ? { ...w, ...updates } : w),
    }));
  }, []);

  const reorderWidgets = useCallback((fromIndex: number, toIndex: number) => {
    setConfig(prev => {
      const widgets = [...prev.widgets];
      const [removed] = widgets.splice(fromIndex, 1);
      widgets.splice(toIndex, 0, removed);
      return {
        ...prev,
        widgets: widgets.map((w, i) => ({ ...w, order: i })),
      };
    });
  }, []);

  const toggleWidget = useCallback((id: string) => {
    setConfig(prev => ({
      ...prev,
      widgets: prev.widgets.map(w => 
        w.id === id ? { ...w, visible: !w.visible } : w
      ),
    }));
  }, []);

  const resetToDefault = useCallback(() => {
    setConfig({
      widgets: defaultWidgets.map((w, i) => ({ ...w, visible: true, order: i })),
      layout: 'grid',
    });
    toast.success('Dashboard reset to default');
  }, [defaultWidgets]);

  return (
    <DashboardContext.Provider value={{
      config,
      updateWidget,
      reorderWidgets,
      toggleWidget,
      resetToDefault,
      isEditMode,
      setIsEditMode,
    }}>
      {children}
    </DashboardContext.Provider>
  );
}

// Draggable Widget Wrapper
interface DraggableWidgetProps {
  widget: Widget;
  index: number;
  children: ReactNode;
}

export function DraggableWidget({ widget, index, children }: DraggableWidgetProps) {
  const { isEditMode, updateWidget, reorderWidgets, toggleWidget } = useDashboardCustomization();
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', index.toString());
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (fromIndex !== index) {
      reorderWidgets(fromIndex, index);
    }
    setDragOverIndex(null);
  };

  const sizeClasses = {
    small: 'col-span-1',
    medium: 'col-span-1 md:col-span-2',
    large: 'col-span-1 md:col-span-2 lg:col-span-3',
    full: 'col-span-full',
  };

  if (!widget.visible && !isEditMode) return null;

  return (
    <div
      className={cn(
        sizeClasses[widget.size],
        'relative transition-all duration-200',
        isDragging && 'opacity-50 scale-95',
        dragOverIndex === index && 'ring-2 ring-neon-cyan ring-offset-2 ring-offset-background',
        !widget.visible && 'opacity-40',
        isEditMode && 'cursor-move'
      )}
      draggable={isEditMode}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Edit Mode Overlay */}
      {isEditMode && (
        <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-sm rounded-lg border-2 border-dashed border-border flex items-center justify-center">
          <div className="flex items-center gap-2">
            <GripVertical className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm font-medium">{widget.title}</span>
          </div>
          
          {/* Widget Controls */}
          <div className="absolute top-2 right-2 flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => toggleWidget(widget.id)}
            >
              {widget.visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            
            {/* Size selector */}
            <select
              value={widget.size}
              onChange={(e) => updateWidget(widget.id, { size: e.target.value as Widget['size'] })}
              className="h-8 px-2 text-xs bg-background border rounded"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="full">Full</option>
            </select>
          </div>
        </div>
      )}
      
      {children}
    </div>
  );
}

// Dashboard Grid
interface DashboardGridProps {
  children: ReactNode;
  className?: string;
}

export function DashboardGrid({ children, className }: DashboardGridProps) {
  const { isEditMode, setIsEditMode, resetToDefault, config } = useDashboardCustomization();

  return (
    <div className={cn('space-y-4', className)}>
      {/* Customization Controls */}
      <div className="flex items-center justify-end gap-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Layout className="w-4 h-4" />
              Manage Widgets
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Dashboard Widgets</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {config.widgets.map((widget) => (
                <div 
                  key={widget.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{widget.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={widget.size}
                      onChange={(e) => {
                        const { updateWidget } = useDashboardCustomization();
                        updateWidget(widget.id, { size: e.target.value as Widget['size'] });
                      }}
                      className="h-8 px-2 text-xs bg-background border rounded"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                      <option value="full">Full</option>
                    </select>
                    <Button
                      variant={widget.visible ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const { toggleWidget } = useDashboardCustomization();
                        toggleWidget(widget.id);
                      }}
                    >
                      {widget.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <Button
          variant={isEditMode ? "default" : "outline"}
          size="sm"
          onClick={() => setIsEditMode(!isEditMode)}
          className="gap-2"
        >
          <Settings className={cn("w-4 h-4", isEditMode && "animate-spin")} />
          {isEditMode ? 'Done' : 'Edit Layout'}
        </Button>

        {isEditMode && (
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefault}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {children}
      </div>
    </div>
  );
}

// Widget Card Component
interface WidgetCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export function WidgetCard({ title, children, className, actions }: WidgetCardProps) {
  return (
    <div className={cn(
      'rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-4',
      'hover:border-border transition-colors duration-200',
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">{title}</h3>
        {actions}
      </div>
      {children}
    </div>
  );
}
