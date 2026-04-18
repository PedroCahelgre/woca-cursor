import React, { useState } from 'react';

const Sidebar = () => {
    const [power, setPower] = useState(0);
    const [voltage, setVoltage] = useState(0);
    const [results, setResults] = useState(null);

    const calculate = () => {
        const currentAmperes = Math.round(power / voltage);
        const wireGaugeMm2 = currentAmperes * 1.5; // Simplified calculation
        const breakerRating = Math.round(currentAmperes * 1.25);
        const voltageDropPercentage = (currentAmperes / voltage) * 100;
        const materials = ['Copper Wire', 'Wire Connectors'];

        setResults({
            currentAmperes,
            wireGaugeMm2,
            breakerRating,
            voltageDropPercentage,
            materials
        });
    };

    const exportToPDF = () => {
        // PDF generation logic here
        alert('Exporting to PDF...');
    };

    const exportToJSON = () => {
        const json = JSON.stringify(results);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'results.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div>
            <h1>Electrical Calculations</h1>
            <input type='number' value={power} onChange={(e) => setPower(e.target.value)} placeholder='Power (W)' />
            <input type='number' value={voltage} onChange={(e) => setVoltage(e.target.value)} placeholder='Voltage (V)' />
            <button onClick={calculate}>Calculate</button>
            {results && (
                <div>
                    <h2>Results</h2>
                    <p>Current: {results.currentAmperes} A</p>
                    <p>Wire Gauge: {results.wireGaugeMm2} mm²</p>
                    <p>Breaker Rating: {results.breakerRating} A</p>
                    <p>Voltage Drop: {results.voltageDropPercentage.toFixed(2)} %</p>
                    <h3>Materials</h3>
                    <ul>
                        {results.materials.map((material, idx) => <li key={idx}>{material}</li>)}
                    </ul>
                    <button onClick={exportToPDF}>Export to PDF</button>
                    <button onClick={exportToJSON}>Export to JSON</button>
                </div>
            )}
        </div>
    );
};

export default Sidebar;