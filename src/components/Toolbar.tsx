import React, { useState } from 'react';
import { FaArrowUp, FaWall, FaPlug, FaLightbulb, FaWire } from 'react-icons/fa';
import './Toolbar.css';

const Toolbar = () => {
    const [activeTool, setActiveTool] = useState('Select');

    const tools = [
        { name: 'Select', icon: <FaArrowUp /> },
        { name: 'Wall', icon: <FaWall /> },
        { name: 'Socket/Outlet', icon: <FaPlug /> },
        { name: 'Switch', icon: <FaArrowUp /> },
        { name: 'Lamp', icon: <FaLightbulb /> },
        { name: 'Wire', icon: <FaWire /> },
    ];

    return (
        <div className='toolbar'>
            {tools.map((tool) => (
                <button
                    key={tool.name}
                    className={`tool-button ${activeTool === tool.name ? 'active' : ''}`}
                    onClick={() => setActiveTool(tool.name)}
                >
                    {tool.icon}
                    {tool.name}
                </button>
            ))}
        </div>
    );
};

export default Toolbar;