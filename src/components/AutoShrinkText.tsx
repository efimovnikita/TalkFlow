import React, { useLayoutEffect, useRef, useState, useEffect } from 'react';

interface AutoShrinkTextProps {
  text: string;
  suffix?: React.ReactNode;
  className?: string;
  maxFontSizeRem?: number; 
  minFontSizeRem?: number;
  color?: string;
  fontWeight?: string;
}

const AutoShrinkText: React.FC<AutoShrinkTextProps> = ({
  text,
  suffix,
  className = '',
  maxFontSizeRem = 1.5, // Default for text-2xl
  minFontSizeRem = 0.875, // Default for text-sm
  color = 'text-gray-800',
  fontWeight = 'normal'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textWrapperRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(maxFontSizeRem);

  // Reset font size when text changes
  useLayoutEffect(() => {
    setFontSize(maxFontSizeRem);
  }, [text, maxFontSizeRem]);

  // Handle container resizing
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      setFontSize(maxFontSizeRem);
    });

    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, [maxFontSizeRem]);

  // Adjust font size if overflowing
  useLayoutEffect(() => {
    const checkOverflow = () => {
      if (!containerRef.current || !textWrapperRef.current) return;
      
      const containerHeight = containerRef.current.clientHeight;
      const textHeight = textWrapperRef.current.scrollHeight;

      // If text height > container height, reduce font size
      if (textHeight > containerHeight + 1 && fontSize > minFontSizeRem) {
        setFontSize(prev => Math.max(minFontSizeRem, prev - 0.05));
      }
    };

    const frame = requestAnimationFrame(checkOverflow);
    return () => cancelAnimationFrame(frame);
  }, [fontSize, text, minFontSizeRem, suffix]);

  return (
    <div ref={containerRef} className="flex-1 w-full min-h-0 overflow-hidden relative">
      <div className="absolute inset-0 overflow-y-auto px-1">
        <div
          ref={textWrapperRef}
          className={`${className} ${color} ${fontWeight} w-full pb-8`}
          style={{ 
            fontSize: `${fontSize}rem`, 
            lineHeight: '1.4',
            wordBreak: 'break-word',
          }}
        >
          <span>{text}</span>
          {suffix && <span className="ml-2 inline-block align-middle">{suffix}</span>}
        </div>
      </div>
    </div>
  );
};

export default AutoShrinkText;
