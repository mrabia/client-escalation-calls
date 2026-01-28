/**
 * Interactive Chart Components
 * Charts with tooltips, zoom, and animations
 */

import { cn } from "@/lib/utils";
import { useState, useRef, useEffect, ReactNode } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Download } from "lucide-react";
import { Button } from "./button";

// Types
interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

interface ChartTooltipProps {
  x: number;
  y: number;
  content: ReactNode;
  visible: boolean;
}

// Tooltip Component
function ChartTooltip({ x, y, content, visible }: ChartTooltipProps) {
  if (!visible) return null;

  return (
    <div
      className="chart-tooltip"
      style={{
        left: x + 10,
        top: y - 10,
        transform: 'translateY(-100%)',
      }}
    >
      {content}
    </div>
  );
}

// Interactive Bar Chart
interface BarChartProps {
  data: DataPoint[];
  height?: number;
  showValues?: boolean;
  animated?: boolean;
  onBarClick?: (point: DataPoint, index: number) => void;
  className?: string;
  title?: string;
  showZoomControls?: boolean;
}

export function InteractiveBarChart({
  data,
  height = 300,
  showValues = true,
  animated = true,
  onBarClick,
  className,
  title,
  showZoomControls = true,
}: BarChartProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: ReactNode; visible: boolean }>({
    x: 0,
    y: 0,
    content: null,
    visible: false,
  });
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const maxValue = Math.max(...data.map(d => d.value));
  const defaultColors = ['#00ff9d', '#00b8ff', '#a855f7', '#fbbf24', '#ff3366'];

  const handleMouseEnter = (e: React.MouseEvent, point: DataPoint, index: number) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    
    setTooltip({
      x: rect.left - (containerRect?.left || 0) + rect.width / 2,
      y: rect.top - (containerRect?.top || 0),
      content: (
        <div className="text-center">
          <div className="font-medium text-foreground">{point.label}</div>
          <div className="text-lg font-bold" style={{ color: point.color || defaultColors[index % defaultColors.length] }}>
            {point.value.toLocaleString()}
          </div>
        </div>
      ),
      visible: true,
    });
  };

  const handleMouseLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleReset = () => setZoom(1);

  return (
    <div className={cn("chart-container", className)} ref={containerRef}>
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      
      {/* Zoom Controls */}
      {showZoomControls && (
        <div className="chart-zoom-controls">
          <Button variant="ghost" size="icon" onClick={handleZoomOut} className="h-8 w-8">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleReset} className="h-8 w-8">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleZoomIn} className="h-8 w-8">
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Chart */}
      <div 
        className="relative overflow-hidden"
        style={{ height, transform: `scale(${zoom})`, transformOrigin: 'center center' }}
      >
        <div className="flex items-end justify-around h-full gap-2 px-4">
          {data.map((point, index) => {
            const barHeight = (point.value / maxValue) * 100;
            const color = point.color || defaultColors[index % defaultColors.length];
            
            return (
              <div
                key={index}
                className="flex flex-col items-center flex-1 max-w-[80px]"
              >
                <div className="relative w-full flex-1 flex items-end">
                  <div
                    className={cn(
                      "w-full rounded-t-md cursor-pointer transition-all duration-200",
                      "hover:brightness-110",
                      animated && "chart-bar-animated"
                    )}
                    style={{
                      height: `${barHeight}%`,
                      backgroundColor: color,
                      animationDelay: `${index * 0.1}s`,
                    }}
                    onMouseEnter={(e) => handleMouseEnter(e, point, index)}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => onBarClick?.(point, index)}
                  />
                </div>
                {showValues && (
                  <span className="text-xs text-muted-foreground mt-2 truncate w-full text-center">
                    {point.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <ChartTooltip {...tooltip} />
    </div>
  );
}

// Interactive Line Chart
interface LineChartProps {
  data: DataPoint[];
  height?: number;
  showDots?: boolean;
  animated?: boolean;
  color?: string;
  fillArea?: boolean;
  className?: string;
  title?: string;
  smooth?: boolean;
  showZoomControls?: boolean;
}

export function InteractiveLineChart({
  data,
  height = 300,
  showDots = true,
  animated = true,
  color = '#00ff9d',
  fillArea = true,
  className,
  title,
  smooth = false,
  showZoomControls = true,
}: LineChartProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: ReactNode; visible: boolean }>({
    x: 0,
    y: 0,
    content: null,
    visible: false,
  });
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const padding = 40;
  const chartWidth = 600;
  const chartHeight = height - padding * 2;

  // Generate path
  const points = data.map((point, index) => {
    const x = padding + (index / (data.length - 1)) * (chartWidth - padding * 2);
    const y = padding + chartHeight - ((point.value - minValue) / (maxValue - minValue || 1)) * chartHeight;
    return { x, y, ...point };
  });

  // Generate smooth bezier curve path or straight line path
  const generatePath = () => {
    if (!smooth || points.length < 2) {
      return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    }
    
    // Smooth bezier curve
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      
      const tension = 0.3;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;
      
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return path;
  };

  const linePath = generatePath();
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding + chartHeight} L ${points[0].x} ${padding + chartHeight} Z`;

  const handleDotHover = (e: React.MouseEvent, point: typeof points[0], index: number) => {
    const containerRect = containerRef.current?.getBoundingClientRect();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    
    setTooltip({
      x: rect.left - (containerRect?.left || 0),
      y: rect.top - (containerRect?.top || 0),
      content: (
        <div className="text-center">
          <div className="font-medium text-foreground">{point.label}</div>
          <div className="text-lg font-bold" style={{ color }}>
            {point.value.toLocaleString()}
          </div>
        </div>
      ),
      visible: true,
    });
  };

  return (
    <div className={cn("chart-container", className)} ref={containerRef}>
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      
      {/* Zoom Controls */}
      {showZoomControls && (
        <div className="chart-zoom-controls">
          <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))} className="h-8 w-8">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setZoom(1)} className="h-8 w-8">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(z + 0.25, 2))} className="h-8 w-8">
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${chartWidth} ${height}`}
        className="w-full"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <line
            key={i}
            x1={padding}
            y1={padding + chartHeight * ratio}
            x2={chartWidth - padding}
            y2={padding + chartHeight * ratio}
            className="chart-grid"
          />
        ))}

        {/* Area fill */}
        {fillArea && (
          <path
            d={areaPath}
            fill={`${color}20`}
            className={animated ? "animate-fade-in-up" : ""}
          />
        )}

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2}
          className={animated ? "chart-line-animated" : ""}
        />

        {/* Dots */}
        {showDots && points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={6}
            fill={color}
            className="cursor-pointer transition-all duration-200 hover:r-8"
            onMouseEnter={(e) => handleDotHover(e as unknown as React.MouseEvent, point, index)}
            onMouseLeave={() => setTooltip(prev => ({ ...prev, visible: false }))}
          />
        ))}

        {/* X-axis labels */}
        {points.map((point, index) => (
          <text
            key={index}
            x={point.x}
            y={height - 10}
            textAnchor="middle"
            className="text-xs fill-muted-foreground"
          >
            {point.label}
          </text>
        ))}
      </svg>

      <ChartTooltip {...tooltip} />
    </div>
  );
}

// Interactive Donut Chart
interface DonutChartProps {
  data: DataPoint[];
  size?: number;
  thickness?: number;
  animated?: boolean;
  showLegend?: boolean;
  className?: string;
  title?: string;
}

export function InteractiveDonutChart({
  data,
  size = 200,
  thickness = 30,
  animated = true,
  showLegend = true,
  className,
  title,
}: DonutChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: ReactNode; visible: boolean }>({
    x: 0,
    y: 0,
    content: null,
    visible: false,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const defaultColors = ['#00ff9d', '#00b8ff', '#a855f7', '#fbbf24', '#ff3366'];
  const radius = size / 2;
  const innerRadius = radius - thickness;

  let currentAngle = -90;

  const segments = data.map((point, index) => {
    const angle = (point.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = radius + radius * Math.cos(startRad);
    const y1 = radius + radius * Math.sin(startRad);
    const x2 = radius + radius * Math.cos(endRad);
    const y2 = radius + radius * Math.sin(endRad);

    const x3 = radius + innerRadius * Math.cos(endRad);
    const y3 = radius + innerRadius * Math.sin(endRad);
    const x4 = radius + innerRadius * Math.cos(startRad);
    const y4 = radius + innerRadius * Math.sin(startRad);

    const largeArc = angle > 180 ? 1 : 0;

    const path = `
      M ${x1} ${y1}
      A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}
      Z
    `;

    return {
      path,
      color: point.color || defaultColors[index % defaultColors.length],
      ...point,
      percentage: ((point.value / total) * 100).toFixed(1),
    };
  });

  const handleSegmentHover = (e: React.MouseEvent, segment: typeof segments[0], index: number) => {
    setActiveIndex(index);
    const containerRect = containerRef.current?.getBoundingClientRect();
    
    setTooltip({
      x: e.clientX - (containerRect?.left || 0),
      y: e.clientY - (containerRect?.top || 0),
      content: (
        <div className="text-center">
          <div className="font-medium text-foreground">{segment.label}</div>
          <div className="text-lg font-bold" style={{ color: segment.color }}>
            {segment.value.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground">{segment.percentage}%</div>
        </div>
      ),
      visible: true,
    });
  };

  return (
    <div className={cn("chart-container", className)} ref={containerRef}>
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      
      <div className="flex items-center gap-8">
        <svg width={size} height={size} className="flex-shrink-0">
          {segments.map((segment, index) => (
            <path
              key={index}
              d={segment.path}
              fill={segment.color}
              className={cn(
                "cursor-pointer transition-all duration-200",
                activeIndex === index && "brightness-110",
                animated && "animate-scale-in"
              )}
              style={{ 
                animationDelay: `${index * 0.1}s`,
                transform: activeIndex === index ? 'scale(1.05)' : 'scale(1)',
                transformOrigin: 'center',
              }}
              onMouseEnter={(e) => handleSegmentHover(e, segment, index)}
              onMouseLeave={() => {
                setActiveIndex(null);
                setTooltip(prev => ({ ...prev, visible: false }));
              }}
            />
          ))}
          
          {/* Center text */}
          <text
            x={radius}
            y={radius - 10}
            textAnchor="middle"
            className="text-2xl font-bold fill-foreground"
          >
            {total.toLocaleString()}
          </text>
          <text
            x={radius}
            y={radius + 15}
            textAnchor="middle"
            className="text-sm fill-muted-foreground"
          >
            Total
          </text>
        </svg>

        {/* Legend */}
        {showLegend && (
          <div className="chart-legend flex-col items-start">
            {segments.map((segment, index) => (
              <div
                key={index}
                className={cn(
                  "chart-legend-item cursor-pointer transition-opacity",
                  activeIndex !== null && activeIndex !== index && "opacity-50"
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                <div
                  className="chart-legend-dot"
                  style={{ backgroundColor: segment.color }}
                />
                <span>{segment.label}</span>
                <span className="text-foreground font-medium ml-2">
                  {segment.percentage}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <ChartTooltip {...tooltip} />
    </div>
  );
}

// Export chart as SVG
export function useChartExport(chartRef: React.RefObject<HTMLDivElement>) {
  const exportAsImage = async (filename: string = 'chart') => {
    if (!chartRef.current) return;

    try {
      const svg = chartRef.current.querySelector('svg');
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${filename}.svg`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export chart:', error);
    }
  };

  return { exportAsImage };
}
