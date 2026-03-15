import React, { useEffect, useRef } from 'react';
import { SkinViewer as Skinview3dViewer, WalkingAnimation } from 'skinview3d';

interface SkinViewerProps {
  skinUrl: string;
  width?: number;
  height?: number;
  className?: string;
  autoRotate?: boolean;
  walking?: boolean;
  controls?: boolean;
  minHeight?: string;
}

const SkinViewer: React.FC<SkinViewerProps> = ({ 
  skinUrl, 
  className, 
  autoRotate = true, 
  walking = true,
  controls = true,
  minHeight = '300px'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<Skinview3dViewer | null>(null);

  useEffect(() => {
    if (canvasRef.current && containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      
      const viewer = new Skinview3dViewer({
        canvas: canvasRef.current,
        width: clientWidth || 300,
        height: clientHeight || 400,
        skin: skinUrl,
        enableControls: controls,
      });

      viewer.autoRotate = autoRotate;
      viewer.autoRotateSpeed = 0.5;
      
      if (walking) {
        viewer.animation = new WalkingAnimation();
      }

      if (controls && viewer.controls) {
        viewer.controls.enableRotate = true;
        viewer.controls.enableZoom = true;
        viewer.controls.enablePan = false;
      }
      
      viewerRef.current = viewer;

      const handleResize = () => {
        if (containerRef.current) {
          viewer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        viewer.dispose();
      };
    }
  }, [skinUrl, autoRotate, walking, controls]);

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className}`} style={{ minHeight }}>
      <canvas ref={canvasRef} className="pixel-border bg-[#333] w-full h-full" />
    </div>
  );
};

export default SkinViewer;

