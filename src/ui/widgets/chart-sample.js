// Temporary floating chart sample for govs data
import { renderChart } from "./chart.js";

/**
 * Render a floating chart div with sample data from govsData
 * @param {Object} govsData - GeoJSON-like object with features array
 */
export function showSampleCharts(govsData) {
  // Extract labels and values
  const features = govsData.features || [];
  const labels = features.map((f) => f.properties.name);
  const values = features.map((f) => f.properties.population_sum);

  // Create floating div
  let div = document.getElementById("floating-chart-demo");
  if (!div) {
    div = document.createElement("div");
    div.id = "floating-chart-demo";
    div.style.position = "fixed";
    div.style.top = "40px";
    div.style.right = "40px";
    div.style.zIndex = 2000;
    div.style.background = "#fff";
    div.style.border = "1px solid #ccc";
    div.style.boxShadow = "0 2px 12px rgba(0,0,0,0.15)";
    div.style.padding = "16px";
    div.style.borderRadius = "8px";
    div.style.maxWidth = "420px";
    div.style.overflow = "auto";
    div.innerHTML = "<h4>Sample Charts</h4>";
    document.body.appendChild(div);
  } else {
    div.innerHTML = "<h4>Sample Charts</h4>";
  }

  // Stat chart: total governorates
  const statCanvas = document.createElement("canvas");
  statCanvas.width = 400;
  statCanvas.height = 120;
  div.appendChild(statCanvas);
  renderChart(statCanvas, {
    type: "stat",
    value: features.length,
    label: "Total Governorates",
    color: "#0E21A0",
  });

  // Stat chart: total area
  const totalArea = features.reduce(
    (sum, f) => sum + (f.properties.area || 0),
    0,
  );
  const areaCanvas = document.createElement("canvas");
  areaCanvas.width = 400;
  areaCanvas.height = 120;
  div.appendChild(areaCanvas);
  renderChart(areaCanvas, {
    type: "stat",
    value: totalArea.toLocaleString(),
    label: "Total Area",
    color: "#F375C2",
  });

  // Gauge chart: example (e.g., 80/100)
  const gaugeCanvas = document.createElement("canvas");
  gaugeCanvas.width = 400;
  gaugeCanvas.height = 160;
  div.appendChild(gaugeCanvas);
  renderChart(gaugeCanvas, {
    type: "gauge",
    value: 80,
    max: 100,
    label: "Sample Gauge",
    color: "#0E21A0",
  });

  // Bar chart
  const barCanvas = document.createElement("canvas");
  barCanvas.width = 400;
  barCanvas.height = 220;
  div.appendChild(barCanvas);
  renderChart(barCanvas, {
    type: "bar",
    data: { labels, values },
    colorScheme: "blues",
    label: "Population by Governorate",
  });

  // Pie chart
  const pieCanvas = document.createElement("canvas");
  pieCanvas.width = 400;
  pieCanvas.height = 220;
  div.appendChild(pieCanvas);
  renderChart(pieCanvas, {
    type: "pie",
    data: { labels, values },
    colorScheme: "custom",
    label: "Population Share",
    legend: false,
  });

  // Close button
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close";
  closeBtn.style.marginTop = "12px";
  closeBtn.onclick = () => div.remove();
  div.appendChild(closeBtn);
}
