// Chart.js Utility for Modular Chart Rendering
// Supports bar and pie charts, flexible data input, and color presets
import Chart from "chart.js/auto";

/**
 * Normalize input data to Chart.js format
 * @param {Object|Array} data - {labels:[], values:[]} or {label1: value1, ...}
 * @returns {{labels: string[], values: number[]}}
 */
export function normalizeChartData(data) {
  if (Array.isArray(data.labels) && Array.isArray(data.values)) {
    return { labels: data.labels, values: data.values };
  } else if (typeof data === "object" && data !== null) {
    return {
      labels: Object.keys(data),
      values: Object.values(data),
    };
  }
  throw new Error("Invalid chart data format");
}

/**
 * Generate color schemes
 */
export const ColorSchemes = {
  blues: (n) => interpolateColors("#0E21A0", "#ffffffff", n),
  reds: (n) => interpolateColors("#B71C1C", "#F375C2", n),
  custom: (n) => interpolateColors("#0E21A0", "#F375C2", n),
};

/**
 * Interpolate between two hex colors
 */
function interpolateColors(start, end, steps) {
  const s = hexToRgb(start);
  const e = hexToRgb(end);
  const arr = [];
  for (let i = 0; i < steps; i++) {
    const t = i / Math.max(steps - 1, 1);
    arr.push(
      rgbToHex(
        Math.round(s.r + (e.r - s.r) * t),
        Math.round(s.g + (e.g - s.g) * t),
        Math.round(s.b + (e.b - s.b) * t),
      ),
    );
  }
  return arr;
}
function hexToRgb(hex) {
  hex = hex.replace("#", "");
  if (hex.length === 3)
    hex = hex
      .split("")
      .map((x) => x + x)
      .join("");
  const num = parseInt(hex, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}
function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/**
 * Render a Chart.js chart
 * @param {HTMLCanvasElement} canvas
 * @param {Object} options - { type, data, colorScheme }
 * @returns {Chart}
 */
export function renderChart(
  canvas,
  { type = "bar", data, colorScheme = "blues", ...opts },
) {
  // Stat chart: display a single number and label, not using Chart.js
  if (type === "stat" || opts.type === "stat") {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "bold 48px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = opts.color || "#0E21A0";
    const value = opts.value ?? (opts.data && opts.data.value) ?? 0;
    ctx.fillText(value, canvas.width / 2, canvas.height / 2);
    if (opts.label) {
      ctx.font = "20px sans-serif";
      ctx.fillStyle = "#444";
      ctx.fillText(opts.label, canvas.width / 2, canvas.height / 2 + 40);
    }
    return null;
  }
  // Gauge chart: draw a semicircular gauge with value
  if (type === "gauge" || opts.type === "gauge") {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const value = opts.value ?? 0;
    const max = opts.max ?? 100;
    const percent = Math.max(0, Math.min(1, value / max));
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.7;
    const r = Math.min(canvas.width, canvas.height) * 0.35;
    // Draw background arc
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, 0, false);
    ctx.strokeStyle = "#eee";
    ctx.lineWidth = 18;
    ctx.stroke();
    // Draw value arc
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, Math.PI + Math.PI * percent, false);
    ctx.strokeStyle = opts.color || "#0E21A0";
    ctx.lineWidth = 18;
    ctx.stroke();
    // Draw value text
    ctx.font = "bold 40px sans-serif";
    ctx.fillStyle = opts.color || "#0E21A0";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(value, cx, cy);
    // Draw label
    if (opts.label) {
      ctx.font = "18px sans-serif";
      ctx.fillStyle = "#444";
      ctx.fillText(opts.label, cx, cy + r + 28);
    }
    return null;
  }
  // Standard Chart.js charts
  let { labels, values } = normalizeChartData(data);
  // Sort by value descending unless sort is false
  const sort = opts.sort !== false;
  if (sort) {
    const combined = labels.map((label, i) => ({ label, value: values[i] }));
    combined.sort((a, b) => b.value - a.value);
    labels = combined.map((item) => item.label);
    values = combined.map((item) => item.value);
  }
  const colors = ColorSchemes[colorScheme]
    ? ColorSchemes[colorScheme](values.length)
    : ColorSchemes.blues(values.length);
  const legendDisplay =
    typeof opts.legend === "boolean" ? opts.legend : type === "pie";
  const config = {
    type,
    data: {
      labels,
      datasets: [
        {
          label: opts.label || "",
          data: values,
          backgroundColor: colors, // Use full color array for both bar and pie
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: legendDisplay },
      },
      ...opts.options,
    },
  };
  return new Chart(canvas, config);
}
