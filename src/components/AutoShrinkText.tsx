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
  const [resizeTrigger, setResizeTrigger] = useState(0);
  const lastDimensions = useRef({ width: 0, height: 0 });

  // Handle container resizing with a threshold to avoid minor layout loops
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const diffW = Math.abs(width - lastDimensions.current.width);
        const diffH = Math.abs(height - lastDimensions.current.height);

        // Only trigger recalculation if dimensions change by more than 2px
        if (diffW > 2 || diffH > 2) {
          lastDimensions.current = { width, height };
          setResizeTrigger(prev => prev + 1);
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // Synchronously adjust font size to avoid layout flickering (paint flashes)
  useLayoutEffect(() => {
    if (!containerRef.current || !textWrapperRef.current) return;

    const container = containerRef.current;
    const wrapper = textWrapperRef.current;

    // Start with maximum font size and shrink down until it fits
    let currentSize = maxFontSizeRem;
    wrapper.style.fontSize = `${currentSize}rem`;

    let textHeight = wrapper.scrollHeight;
    let containerHeight = container.clientHeight;

    // Fast synchronous loop to find the best font size before paint
    while (textHeight > containerHeight + 1 && currentSize > minFontSizeRem) {
      currentSize = Math.round((currentSize - 0.05) * 100) / 100;
      wrapper.style.fontSize = `${currentSize}rem`;
      textHeight = wrapper.scrollHeight;
      containerHeight = container.clientHeight;
    }

    setFontSize(currentSize);
  }, [text, maxFontSizeRem, minFontSizeRem, suffix, resizeTrigger]);

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

