// Chart.js Utility for Modular Chart Rendering
// Supports bar and pie charts, flexible data input, and color presets
import Chart from "chart.js/auto";
import chroma from "chroma-js";

/**
 * Normalize input data to Chart.js format
 * @param {Object|Array} data - {labels:[], values:[]} or {label1: value1, ...}
 * @returns {{labels: string[], values: number[]}}
 */
export function normalizeChartData(data) {
  if (Array.isArray(data && data.labels) && Array.isArray(data.values)) {
    // Coerce values to numbers and filter invalid entries while keeping labels in sync
    const labels = data.labels.slice();
    const values = data.values.map((v) =>
      v === null || v === undefined ? NaN : Number(v),
    );
    const filtered = labels
      .map((label, i) => ({ label, value: values[i] }))
      .filter((item) => Number.isFinite(item.value));
    return {
      labels: filtered.map((d) => d.label),
      values: filtered.map((d) => d.value),
    };
  } else if (typeof data === "object" && data !== null) {
    const labels = Object.keys(data);
    const rawValues = Object.values(data).map((v) =>
      v === null || v === undefined ? NaN : Number(v),
    );
    const filtered = labels
      .map((label, i) => ({ label, value: rawValues[i] }))
      .filter((item) => Number.isFinite(item.value));
    return {
      labels: filtered.map((d) => d.label),
      values: filtered.map((d) => d.value),
    };
  }
  throw new Error("Invalid chart data format");
}

/**
 * Create or update a Chart.js instance on a canvas.
 * If `existingChart` is provided it will be destroyed before creating a new one.
 * Returns the created chart or null on failure.
 */
export function createOrUpdateChart(canvas, config, existingChart) {
  if (existingChart && typeof existingChart.destroy === "function") {
    try {
      existingChart.destroy();
    } catch (e) {
      console.warn("Error destroying existing chart:", e);
    }
  }
  try {
    return new Chart(canvas, config);
  } catch (err) {
    console.warn("Failed to create/update Chart.js chart:", err);
    return null;
  }
}

/**
 * Generate color schemes
 */
export const ColorSchemes = {
  blues: (n) => generatePalette(["#0E21A0", "#ffffff"], n),
  reds: (n) => generatePalette(["#B71C1C", "#F375C2"], n),
  custom: (n) => generatePalette(["#0E21A0", "#F375C2"], n),
};

function generatePalette(stops, n) {
  if (!n || n <= 0) return [];
  try {
    // Use a perceptually-uniform LAB interpolation for nicer palettes
    return chroma.scale(stops).mode("lab").colors(n);
  } catch (e) {
    // Fallback to simple interpolation
    return interpolateColors(stops[0], stops[stops.length - 1], n);
  }
}

/**
 * Interpolate between two hex colors
 */
function interpolateColors(start, end, steps) {
  const s = hexToRgb(start);
  const e = hexToRgb(end);
  const arr = [];
  for (let i = 0; i < Math.max(steps, 1); i++) {
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
  if (!hex) return { r: 0, g: 0, b: 0 };
  hex = String(hex).replace("#", "").trim();
  // Strip alpha if present (8-char hex)
  if (hex.length === 8) hex = hex.slice(0, 6);
  if (hex.length === 3)
    hex = hex
      .split("")
      .map((x) => x + x)
      .join("");
  const num = parseInt(hex, 16) || 0;
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
    // Prepare canvas for high-DPI displays to avoid pixelation
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const cssW = Math.max(
      1,
      Math.round(rect.width || canvas.clientWidth || 300),
    );
    const cssH = Math.max(
      1,
      Math.round(rect.height || canvas.clientHeight || 80),
    );
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    // Compute font sizes relative to canvas height to avoid clipping
    const valueFontSize =
      typeof opts.statFontSize === "number"
        ? opts.statFontSize
        : Math.max(16, Math.round(cssH * 0.45));
    const labelFontSize =
      typeof opts.statLabelFontSize === "number"
        ? opts.statLabelFontSize
        : Math.max(12, Math.round(cssH * 0.18));
    const valueFont =
      (opts.statFontWeight ? opts.statFontWeight + " " : "") +
      valueFontSize +
      "px " +
      (opts.statFontFamily || "sans-serif");
    const labelFont =
      (opts.statLabelFontWeight ? opts.statLabelFontWeight + " " : "") +
      labelFontSize +
      "px " +
      (opts.statLabelFontFamily || "sans-serif");
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = opts.color || "#0E21A0";
    const value = opts.value ?? (opts.data && opts.data.value) ?? 0;
    ctx.font = valueFont;
    // Value positioned slightly above center
    const valueY = Math.round(cssH * 0.44);
    ctx.fillText(value, cssW / 2, valueY);
    if (opts.label) {
      ctx.font = labelFont;
      ctx.fillStyle = opts.statLabelColor || "#444";
      const labelY = Math.round(cssH * 0.78);
      ctx.fillText(opts.label, cssW / 2, labelY);
    }
    return null;
  }
  // Gauge chart: draw a semicircular gauge with value
  if (type === "gauge" || opts.type === "gauge") {
    // High-DPI aware gauge rendering
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const cssW = Math.max(
      1,
      Math.round(rect.width || canvas.clientWidth || 400),
    );
    const cssH = Math.max(
      1,
      Math.round(rect.height || canvas.clientHeight || 160),
    );
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    const value = opts.value ?? 0;
    const max = opts.max ?? 100;
    const percent = Math.max(0, Math.min(1, value / max));
    const cx = cssW / 2;
    const cy = cssH * 0.7;
    const r = Math.min(cssW, cssH) * 0.35;
    // Draw background arc
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, 0, false);
    ctx.strokeStyle = "#eee";
    ctx.lineWidth = opts.gaugeLineWidth ?? 18;
    ctx.stroke();
    // Draw value arc
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, Math.PI + Math.PI * percent, false);
    ctx.strokeStyle = opts.color || "#0E21A0";
    ctx.lineWidth = opts.gaugeLineWidth ?? 18;
    ctx.stroke();
    // Draw value text
    ctx.font = opts.gaugeFont || "bold 40px sans-serif";
    ctx.fillStyle = opts.color || "#0E21A0";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(value, cx, cy);
    // Draw label
    if (opts.label) {
      ctx.font = opts.gaugeLabelFont || "18px sans-serif";
      ctx.fillStyle = opts.gaugeLabelColor || "#444";
      ctx.fillText(opts.label, cx, cy + r + 28);
    }
    return null;
  }
  // Standard Chart.js charts
  let { labels, values } = normalizeChartData(data || {});
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
  // If palette returned a single color but multiple datapoints exist, expand it
  const legendDisplay =
    typeof opts.legend === "boolean" ? opts.legend : type === "pie";
  const backgroundColor =
    colors.length === 1 && values.length > 1
      ? Array(values.length).fill(colors[0])
      : colors;
  // Default chart options: allow filling container in sidebar
  opts.options = opts.options || {};
  opts.options.maintainAspectRatio = opts.options.maintainAspectRatio ?? false;
  // Improve readability: set borderColor and partial opacity for background
  const borderColor = opts.borderColor || "rgba(255,255,255,0.6)";
  // Label angle: prefer explicit `labelAngle`, then `angle`, then `maxRotation`, default 90
  let labelAngle =
    typeof opts.labelAngle === "number"
      ? opts.labelAngle
      : typeof opts.angle === "number"
        ? opts.angle
        : typeof opts.maxRotation === "number"
          ? opts.maxRotation
          : 90;
  // Support horizontal bar charts via opts.horizontal (indexAxis = 'y')
  const indexAxis = opts.horizontal ? "y" : opts.indexAxis || "x";
  // Bar width in pixels: allow `barWidth` or `barThickness`, default 24
  const barWidth = Number.isFinite(opts.barWidth)
    ? opts.barWidth
    : Number.isFinite(opts.barThickness)
      ? opts.barThickness
      : 24;
  // Auto-fit bar width based on container size and number of categories
  const autoFit = opts.autoFitBarWidth !== false;
  let effectiveBarWidth = barWidth;
  if (autoFit && (type === "bar" || indexAxis === "y")) {
    try {
      const parent = canvas.parentElement || canvas.parentNode;
      const rect =
        parent &&
        parent.getBoundingClientRect &&
        parent.getBoundingClientRect();
      if (rect) {
        const containerSize = indexAxis === "y" ? rect.height : rect.width;
        const count = Math.max(1, labels.length);
        const categoryPct =
          typeof opts.categoryPercentage === "number"
            ? opts.categoryPercentage
            : 0.8;
        const barPct =
          typeof opts.barPercentage === "number" ? opts.barPercentage : 0.9;
        const slot = containerSize / count;
        const maxAllowed = Math.max(4, Math.floor(slot * categoryPct * barPct));
        effectiveBarWidth = Math.min(barWidth, maxAllowed);
      }
    } catch (e) {
      // ignore measurement errors and fallback to provided barWidth
    }
  }
  // Chart title: use `label` as chart title if provided; keep datasetLabel separate
  const datasetLabel =
    opts.datasetLabel ??
    (opts.label && opts.showDatasetLabel ? opts.label : "");
  const chartTitle = opts.label || opts.title || null;
  // If user didn't explicitly set rotation and chart is horizontal, default to 0° for readability
  if (
    opts.labelAngle === undefined &&
    opts.angle === undefined &&
    opts.maxRotation === undefined &&
    indexAxis === "y"
  ) {
    labelAngle = 0;
  }
  // Build tick config and apply it to the index axis (categories)
  const tickConfig = {
    maxRotation: labelAngle,
    minRotation: labelAngle,
    autoSkip: opts.showAllTicks ? false : true,
    maxTicksLimit: opts.showAllTicks
      ? labels.length
      : (opts.maxTicksLimit ?? 8),
  };
  const config = {
    type,
    data: {
      labels,
      datasets: [
        {
          label: datasetLabel || "",
          data: values,
          backgroundColor,
          borderColor,
          borderWidth: opts.borderWidth ?? 1,
          // Apply bar width settings for bar charts (use adaptive `effectiveBarWidth`)
          ...(type === "bar" || indexAxis === "y"
            ? {
                barThickness: effectiveBarWidth,
                maxBarThickness:
                  opts.maxBarThickness ??
                  Math.max(12, Math.round(effectiveBarWidth * 1.5)),
              }
            : {}),
        },
      ],
    },
    options: {
      responsive: true,
      indexAxis: indexAxis,
      animation: opts.animation ?? { duration: 400 },
      interaction: { mode: "nearest", intersect: false },
      plugins: {
        legend: { display: legendDisplay },
        title: {
          display: !!chartTitle,
          text: chartTitle || "",
          font: {
            size: opts.titleFontSize ?? 14,
            weight: opts.titleFontWeight ?? "600",
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              // Robustly extract the numeric value from Chart.js tooltip context.
              // Try multiple fallbacks: context.parsed, context.raw, dataset.data[index].
              const ds = context.dataset || {};
              const dataIndex = context.dataIndex;
              const tryNumber = (v) => {
                const n = Number(v);
                return Number.isFinite(n) ? n : undefined;
              };

              let value;

              // 1) context.parsed (preferred)
              const parsed = context.parsed;
              if (typeof parsed === "number") value = parsed;
              else if (parsed && typeof parsed === "object") {
                value = tryNumber(parsed.y);
                if (value === undefined) value = tryNumber(parsed.x);
              }

              // 2) context.raw
              if (value === undefined) {
                const raw = context.raw;
                if (typeof raw === "number") value = raw;
                else if (raw && typeof raw === "object") {
                  value = tryNumber(raw.y);
                  if (value === undefined) value = tryNumber(raw.x);
                  if (value === undefined && raw.hasOwnProperty("value"))
                    value = tryNumber(raw.value);
                }
              }

              // 3) dataset data at index
              if (
                value === undefined &&
                ds.data &&
                typeof ds.data[dataIndex] !== "undefined"
              ) {
                const maybe = ds.data[dataIndex];
                if (typeof maybe === "number") value = maybe;
                else if (maybe && typeof maybe === "object") {
                  value =
                    tryNumber(maybe.y) ??
                    tryNumber(maybe.x) ??
                    tryNumber(maybe.value);
                }
              }

              // Final fallback: show raw as string
              const formatted =
                value !== undefined
                  ? new Intl.NumberFormat().format(value)
                  : String(
                      context.raw !== undefined && context.raw !== null
                        ? context.raw
                        : "",
                    );

              const prefix = ds.label ? ds.label + ": " : "";
              return prefix + formatted;
            },
          },
        },
      },
      // sensible defaults for axes when not a pie/donut
      scales:
        type === "pie"
          ? {}
          : (function () {
              if (indexAxis === "x") {
                return {
                  x: { ticks: tickConfig },
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: function (v) {
                        return new Intl.NumberFormat().format(v);
                      },
                    },
                  },
                };
              }
              // indexAxis === 'y'
              return {
                x: {
                  beginAtZero: true,
                  ticks: {
                    callback: function (v) {
                      return new Intl.NumberFormat().format(v);
                    },
                  },
                },
                y: { ticks: tickConfig },
              };
            })(),
      ...opts.options,
    },
  };
  try {
    // Destroy or reuse any existing Chart instance attached to this canvas
    const existing = Chart.getChart && Chart.getChart(canvas);
    return createOrUpdateChart(canvas, config, existing);
  } catch (err) {
    console.warn("Failed to create Chart.js chart:", err);
    return null;
  }
}
