import React, { useEffect, useRef } from 'react';
import { fabric } from 'fabric';

const Canvas = () => {
    const canvasRef = useRef(null);
    const [canvas, setCanvas] = React.useState(null);

    useEffect(() => {
        const initCanvas = () => {
            const initCanvas = new fabric.Canvas(canvasRef.current, {
                backgroundColor: 'white',
                selection: true,
                preserveObjectStacking: true,
            });
            setCanvas(initCanvas);

            // Enable grid-based snapping
            const gridSize = 20;
            initCanvas.on('object:moving', function (e) {
                const target = e.target;
                target.set({
                    left: Math.round(target.left / gridSize) * gridSize,
                    top: Math.round(target.top / gridSize) * gridSize,
                });
            });

            // Enable pan and zoom controls
            let isPanning = false;
            let lastPosX;
            let lastPosY;

            initCanvas.on('mouse:down', (options) => {
                if (options.e.altKey) {
                    isPanning = true;
                    lastPosX = options.e.clientX;
                    lastPosY = options.e.clientY;
                }
            });

            initCanvas.on('mouse:move', (options) => {
                if (isPanning) {
                    const deltaX = options.e.clientX - lastPosX;
                    const deltaY = options.e.clientY - lastPosY;
                    lastPosX = options.e.clientX;
                    lastPosY = options.e.clientY;
                    initCanvas.relativePan({ x: deltaX, y: deltaY });
                }
            });

            initCanvas.on('mouse:up', () => {
                isPanning = false;
            });

            // Add key event listeners for zooming
            window.addEventListener('wheel', (e) => {
                e.preventDefault();
                const zoomFactor = 0.1;
                let newZoom = initCanvas.getZoom() * (e.deltaY < 0 ? 1 + zoomFactor : 1 - zoomFactor);
                newZoom = Math.max(newZoom, 0.1);
                initCanvas.setZoom(newZoom);
            });
        };

        initCanvas();
        return () => {
            canvas && canvas.dispose();
        };
    }, []);

    return <canvas ref={canvasRef} width='800' height='600' />;
};

export default Canvas;