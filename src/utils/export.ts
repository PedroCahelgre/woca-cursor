import jsPDF from 'jspdf';

/**
 * Export the electrical plan as a PDF file.
 * @param {HTMLCanvasElement} canvas - The canvas element to export.
 */
export function exportToPDF(canvas) {
    const pdf = new jsPDF();
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 10, 10);
    pdf.save('electrical_plan.pdf');
}

/**
 * Export project data as a JSON file.
 * @param {Object} projectData - The project data to export.
 */
export function exportToJSON(projectData) {
    const json = JSON.stringify(projectData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project_data.json';
    a.click();
    URL.revokeObjectURL(url);
}