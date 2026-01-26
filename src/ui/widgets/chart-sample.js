// Temporary floating chart sample for govs data
import { renderChart } from "./chart.js";

/**
 * Render a floating chart div with sample data from govsData
 * @param {Object} govsData - GeoJSON-like object with features array
 */
export function showSampleCharts(govsData) {
  // Extract labels and values. If the provided geojson contains point features (e.g. 3km points),
  // group by `region` property and sum `population`. Otherwise fall back to governorate `population_sum`.
  const features = govsData.features || [];
  let labels = [];
  let values = [];
  if (
    features.length &&
    features[0].geometry &&
    features[0].geometry.type === "Point"
  ) {
    const group = new Map();
    features.forEach((f) => {
      const props = f.properties || {};
      const key =
        props.region ||
        props.region_name ||
        props.h3 ||
        props.id ||
        props.fid ||
        "point";
      const val = Number(props.population) || 0;
      group.set(key, (group.get(key) || 0) + val);
    });
    const arr = Array.from(group.entries())
      .map(([k, v]) => ({ k, v }))
      .sort((a, b) => b.v - a.v);
    labels = arr.map((d) => d.k);
    values = arr.map((d) => d.v);
  } else {
    labels = features.map((f) => f.properties.name);
    values = features.map((f) => f.properties.population_sum);
  }

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
  const barWrap = document.createElement("div");
  barWrap.style.width = "100%";
  // Make the bar chart taller when there are many categories to avoid overlap.
  const perItem = 28; // px per category (adjustable)
  const maxHeight = 900; // cap height to avoid runaway sizes
  const computedHeight = Math.min(
    maxHeight,
    Math.max(220, labels.length * perItem),
  );
  barWrap.style.height = computedHeight + "px";
  barWrap.style.boxSizing = "border-box";
  div.appendChild(barWrap);
  const barCanvas = document.createElement("canvas");
  barCanvas.style.width = "100%";
  barCanvas.style.height = "100%";
  barCanvas.style.display = "block";
  barWrap.appendChild(barCanvas);
  try {
    renderChart(barCanvas, {
      type: "bar",
      data: { labels, values },
      colorScheme: "blues",
      label: "Population by Governorate",
      showAllTicks: true,
      horizontal: true,
    });
  } catch (e) {
    console.warn("Error rendering bar chart:", e);
  }

  // Pie chart
  const pieWrap = document.createElement("div");
  pieWrap.style.width = "100%";
  pieWrap.style.height = "220px";
  pieWrap.style.boxSizing = "border-box";
  div.appendChild(pieWrap);
  const pieCanvas = document.createElement("canvas");
  pieCanvas.style.width = "100%";
  pieCanvas.style.height = "100%";
  pieCanvas.style.display = "block";
  pieWrap.appendChild(pieCanvas);
  try {
    renderChart(pieCanvas, {
      type: "pie",
      data: { labels, values },
      colorScheme: "custom",
      label: "Population Share",
      legend: false,
    });
  } catch (e) {
    console.warn("Error rendering pie chart:", e);
  }

  // Close button
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close";
  closeBtn.style.marginTop = "12px";
  closeBtn.onclick = () => div.remove();
  div.appendChild(closeBtn);
}
