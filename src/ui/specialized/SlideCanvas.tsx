import React from 'react';

interface Shape {
    type: 'text' | 'image' | 'shape';
    xfrm: { x: number; y: number; cx: number; cy: number };
    paras?: Array<{ html: string; align: string }>;
    imgDataUrl?: string;
    fillColor?: string;
}

interface SlideCanvasProps {
    shapes: Shape[];
    width: number;
    height: number;
    emuToPx: (emu: number) => number;
}

export const SlideCanvas: React.FC<SlideCanvasProps> = ({ 
    shapes, 
    width, 
    height, 
    emuToPx 
}) => {
    return (
        <div
            className="relative border theme-border rounded 
                shadow-lg bg-white"
            style={{ width: `${width}px`, height: `${height}px` }}
        >
            {shapes.map((shape, i) => {
                const style = {
                    position: 'absolute' as const,
                    left: `${emuToPx(shape.xfrm.x)}px`,
                    top: `${emuToPx(shape.xfrm.y)}px`,
                    width: `${emuToPx(shape.xfrm.cx)}px`,
                    height: `${emuToPx(shape.xfrm.cy)}px`,
                    backgroundColor: shape.fillColor || 'transparent',
                    zIndex: shape.type === 'shape' ? 0 : 
                        (shape.type === 'image' ? 1 : 2),
                };

                return (
                    <div key={i} style={style}>
                        {shape.type === 'text' && (
                            <div className="w-full h-full">
                                {shape.paras?.map((p, pi) => (
                                    <div
                                        key={pi}
                                        style={{
                                            textAlign: p.align === 'ctr' 
                                                ? 'center' 
                                                : p.align === 'r' 
                                                    ? 'right' 
                                                    : 'left',
                                        }}
                                        dangerouslySetInnerHTML={{ 
                                            __html: p.html 
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                        {shape.type === 'image' && 
                            shape.imgDataUrl && (
                            <img 
                                src={shape.imgDataUrl} 
                                style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    objectFit: 'contain' 
                                }} 
                                alt=""
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
};
