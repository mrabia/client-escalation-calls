/**
 * DateRangePicker Component
 * A calendar-based date range selector with preset options
 */

import * as React from "react";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  className?: string;
  presets?: "days" | "months";
  align?: "start" | "center" | "end";
}

const dayPresets = [
  { label: "7 jours", days: 7 },
  { label: "14 jours", days: 14 },
  { label: "30 jours", days: 30 },
  { label: "90 jours", days: 90 },
];

const monthPresets = [
  { label: "1 mois", months: 1 },
  { label: "3 mois", months: 3 },
  { label: "6 mois", months: 6 },
  { label: "12 mois", months: 12 },
];

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  className,
  presets = "days",
  align = "start",
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const handlePresetClick = (value: number, type: "days" | "months") => {
    const today = new Date();
    let from: Date;
    
    if (type === "days") {
      from = subDays(today, value);
    } else {
      from = subMonths(today, value);
    }
    
    onDateRangeChange({ from, to: today });
    setOpen(false);
  };

  const formatDateRange = () => {
    if (!dateRange?.from) {
      return "Sélectionner une période";
    }
    
    if (dateRange.to) {
      return `${format(dateRange.from, "dd MMM yyyy", { locale: fr })} - ${format(dateRange.to, "dd MMM yyyy", { locale: fr })}`;
    }
    
    return format(dateRange.from, "dd MMM yyyy", { locale: fr });
  };

  const currentPresets = presets === "days" ? dayPresets : monthPresets;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal h-9 px-3 border-border/50 bg-background/50 hover:bg-background/80",
            !dateRange && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-neon-cyan" />
          <span className="text-sm">{formatDateRange()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-card border-border" align={align}>
        <div className="flex">
          {/* Presets */}
          <div className="border-r border-border p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-2 px-2">
              Raccourcis
            </p>
            {currentPresets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm h-8 hover:bg-neon-cyan/10 hover:text-neon-cyan"
                onClick={() => 
                  handlePresetClick(
                    presets === "days" ? (preset as typeof dayPresets[0]).days : (preset as typeof monthPresets[0]).months,
                    presets
                  )
                }
              >
                {preset.label}
              </Button>
            ))}
          </div>
          
          {/* Calendar */}
          <div className="p-3">
            <Calendar
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={onDateRangeChange}
              numberOfMonths={2}
              disabled={{ after: new Date() }}
            />
          </div>
        </div>
        
        {/* Footer */}
        <div className="border-t border-border p-3 flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onDateRangeChange(undefined);
              setOpen(false);
            }}
          >
            Réinitialiser
          </Button>
          <Button
            size="sm"
            className="bg-neon-cyan text-background hover:bg-neon-cyan/90"
            onClick={() => setOpen(false)}
          >
            Appliquer
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { type DateRange };
