import "./style.css";
import "cesium/Build/Cesium/Widgets/widgets.css";
import "./cesium-styles.css";
import { initLayout } from "./ui/layout.js";
import { initMap, registerBaseMap } from "./map/core.js";
import { BaseMapFactory, DataLayerFactory } from "./map/generators.js";
import { DynamicHeatmap } from "./map/dynamic-layer.js";
import { Fetchers } from "./api/fetchers.js";
import { LayerSwitcher } from "./ui/widgets/layer-switch.js";
import { ToolsPanel } from "./ui/widgets/tools-panel.js";
import { AnalysisBox } from "./ui/widgets/analysis-box.js";
import { NavTools } from "./ui/widgets/nav-tools.js";
import { MeasureTools } from "./ui/widgets/measure-tools.js";
import { DrawingTool, SelectionTool } from "./map/interactions.js";
import { SidebarPrimary } from "./ui/sidebar-primary.js";
import { Drawer } from "./ui/drawer.js";
import "./ui/sidebar-primary.css";
import { Dashboard } from "./ui/dashboard.js";
import "./ui/dashboard.css";
import { showSampleCharts } from "./ui/widgets/chart-sample.js";
import { renderChart } from "./ui/widgets/chart.js";
import { SpatialAnalysis } from "./spatial/analysis.js";
import * as turf from "@turf/turf";

// Expose AnalysisBox for quick console testing
if (typeof window !== "undefined") {
  window.AnalysisBox = AnalysisBox;
}
// 1. Setup Map
const { mapSlot } = initLayout();
const map = initMap(mapSlot);

// 2. Add Base Map
const osm = BaseMapFactory.createOSM();
registerBaseMap(map, "OSM", osm, true);

// 3. The Simple Test
// src/index.js

// ... imports ...

async function start() {
  // Mount the primary sidebar (iconic vertical bar)
  const sidebarIcons = [
    {
      key: "layers",
      label: "Layers",
      svg: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`,
    },
    {
      key: "measure",
      label: "Measure",
      svg: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="7" rx="2"/><path d="M6 7v7M10 7v7M14 7v7M18 7v7"/></svg>`,
    },
    {
      key: "draw",
      label: "Draw",
      svg: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21l3-1 11-11 3-3a2.5 2.5 0 0 0-3.5-3.5l-3 3L4 18l-1 3z"></path></svg>`,
    },
  ];
  const sidebarPrimary = new SidebarPrimary({
    icons: sidebarIcons,
    position: "left",
  });
  sidebarPrimary.mount();

  // Prepare iconEl for later use
  const iconEl = sidebarPrimary.element.querySelector(
    '.sidebar-icon[data-key="layers"]',
  );
  // Mount the dashboard sidebar
  const dashboard = new Dashboard({ position: "right" });
  dashboard.mount();
  try {
    // Prepare iconEls for drawers
    const iconLayers = sidebarPrimary.element.querySelector(
      '.sidebar-icon[data-key="layers"]',
    );
    const iconMeasure = sidebarPrimary.element.querySelector(
      '.sidebar-icon[data-key="measure"]',
    );
    const data = await Fetchers.fetchWFS(
      "/geoserver/wfs",
      "OSM:Egypt_Population",
    );
    // Load the 3km points GeoJSON (client-side file) which contains `region` property
    // (previously named OSM_Egypt_Population_Points3km.geojson)
    let pointsData = null;
    try {
      const ptsResp = await fetch(
        "/data/OSM_Egypt_Population_Points3km.geojson",
      );
      pointsData = await ptsResp.json();
    } catch (e) {
      console.warn(
        "Failed to load OSM_Egypt_Population_Points3km.geojson, falling back to fetched WFS data:",
        e,
      );
      // fallback to `data` if points file not available
      pointsData = data;
    }
    // Fetch the governorate GeoJSON from public folder
    const govesResponse = await fetch("/data/gov_with_pop.geojson");
    const govesData = await govesResponse.json();
    console.log(govesData);
    // Show sample charts in a floating div
    // showSampleCharts(govesData);

    // 1. Initialize Logic (Phase 2) - Use Dynamic Heatmap
    const dynamicManager = new DynamicHeatmap(map, pointsData, "population");

    // Create a vector layer for governorates
    const govesLayer = DataLayerFactory.createVector(govesData);
    map.addLayer(govesLayer.instance);

    map.getView().setCenter([3473147.67, 3115456.46]);
    map.getView().setZoom(6);

    // Initialize static charts in the dashboard (returns controller with updateCharts)
    const chartsController = initializeCharts(
      dashboard.element,
      govesData,
      dynamicManager,
      pointsData,
    );

    // 2. Initialize UI (Phase 3)
    const layerUI = new LayerSwitcher(map);
    layerUI.addLayer("Egypt Population (WFS)", dynamicManager.currentLayer);
    layerUI.addLayer("Governorates", govesLayer.instance);
    new Drawer({
      id: "sidebar-flyout-layers",
      header: "Layers",
      content: layerUI.element,
      triggerEl: iconLayers,
      position: "left",
      sticky: true,
    });

    // Measure Tools in Drawer
    const measureTools = new MeasureTools(map);
    new Drawer({
      id: "sidebar-flyout-measure",
      header: "Measure Tools",
      content: measureTools.element,
      triggerEl: iconMeasure,
      position: "left",
      sticky: true,
    });

    // Nav toolbar without 3D button (no v3dEngine)
    const navTools = new NavTools(map);
    // create or reuse a container and apply a temporary `centered` modifier
    let navContainer = document.getElementById("gis-nav-tools");
    if (!navContainer) {
      navContainer = document.createElement("div");
      navContainer.id = "gis-nav-tools";
      navContainer.className = "nav-tools-slot bottom-center";
      document.body.appendChild(navContainer);
    } else {
      navContainer.classList.add("bottom-center");
    }
    navTools.mount(navContainer);

    // 3. Initialize Tools Panel (Phase 4)
    const toolsPanel = new ToolsPanel();
    const drawingTool = new DrawingTool(map);
    const selectionTool = new SelectionTool(map);
    const analysisBox = new AnalysisBox();

    // Register measure tools with the tools panel so they can be mutually exclusive
    if (typeof toolsPanel._tools !== "undefined") {
      toolsPanel._tools.push({
        name: "measure",
        tool: measureTools,
        toggle: null,
      });
    }

    // When a measurement mode is activated, deactivate other tools
    try {
      const mBtns = measureTools.element.querySelectorAll(".measure-btn");
      mBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          const mode = btn.dataset.mode;
          if (mode === "line" || mode === "area") {
            // deactivate other tools
            if (toolsPanel._tools) {
              toolsPanel._tools.forEach((entry) => {
                if (
                  entry.tool &&
                  entry.tool !== measureTools &&
                  typeof entry.tool.deactivate === "function"
                ) {
                  try {
                    entry.tool.deactivate();
                  } catch (e) {}
                }
              });
              // sync toggle visuals
              if (typeof toolsPanel._updateToggleStates === "function") {
                try {
                  toolsPanel._updateToggleStates();
                } catch (e) {}
              }
            }
          }
        });
      });
    } catch (e) {
      // ignore if measure UI not present
    }

    // Helper to update charts with union of all selections + drawings
    const updateChartsWithUnion = () => {
      try {
        const selectedFeatures = selectionTool.getSelectedFeatures();
        const drawnFeatures = drawingTool.getDrawnShapes();
        const allFeatures = [...selectedFeatures, ...drawnFeatures];

        if (allFeatures.length === 0) {
          // No selection or drawn shapes - show global
          chartsController.updateCharts(null);
        } else if (allFeatures.length === 1) {
          // Ensure single feature is GeoJSON (handles OL Feature -> GeoJSON conversion)
          const single = SpatialAnalysis._toGeoJSON(allFeatures[0]);
          chartsController.updateCharts(single);
        } else {
          // Union all features
          const merged = SpatialAnalysis.unionPolygons(allFeatures);
          if (merged) {
            chartsController.updateCharts(merged);
          }
        }
      } catch (e) {
        console.error("updateChartsWithUnion failed:", e);
      }
    };

    // Configure selection tool
    try {
      selectionTool.setSearchCollection(govesData);
      selectionTool.onSelect(() => {
        updateChartsWithUnion();
      });
    } catch (e) {
      console.warn("Failed to initialize selection tool:", e);
    }

    // Add clear selection callback to also update charts
    const originalClearSelection =
      selectionTool.clearSelection.bind(selectionTool);
    selectionTool.clearSelection = function () {
      originalClearSelection();
      updateChartsWithUnion();
    };

    toolsPanel.addTool("Select Region", selectionTool);
    toolsPanel.addTool("Draw Mode", drawingTool);
    toolsPanel.addClearButton(drawingTool);

    // Don't mount toolsPanel as a separate floating panel here — we'll reuse its element inside the Draw drawer.
    analysisBox.mount();

    // Drawing Drawer in sidebar (triggered from primary icons) reusing ToolsPanel
    const iconDraw = sidebarPrimary.element.querySelector(
      '.sidebar-icon[data-key="draw"]',
    );
    if (iconDraw) {
      new Drawer({
        id: "sidebar-flyout-draw",
        header: "Draw",
        content: toolsPanel.element,
        triggerEl: iconDraw,
        position: "left",
        sticky: true,
      });
    }

    // Wire drawing callbacks to update dashboard charts (with union of selections + drawings)
    if (typeof drawingTool.onDraw === "function" && chartsController) {
      drawingTool.onDraw(() => {
        updateChartsWithUnion();
      });
    }

    // Update charts when clear button is clicked
    const originalClearShapes = drawingTool.clearShapes.bind(drawingTool);
    drawingTool.clearShapes = function () {
      originalClearShapes();
      updateChartsWithUnion();
    };

    console.log("System Online: Logic + UI + Tools + Analysis connected.");
  } catch (e) {
    console.error("Error:", e);
  }
} // Phase 3: UI Setup

start();

/**
 * Initialize static charts placed in the dashboard sidebar.
 * @param {HTMLElement} dashboardEl - the dashboard root element
 * @param {Object} govesData - GeoJSON-like governorates data
 * @param {DynamicHeatmap} dynamicManager - dynamic heatmap manager (optional)
 */
export function initializeCharts(
  dashboardEl,
  govesData,
  dynamicManager,
  pointsGeoJSON,
) {
  try {
    const content = dashboardEl.querySelector(".dashboard-content");
    if (!content) return;

    // Clear any previous chart area
    const chartsSection = document.createElement("div");
    chartsSection.className = "dashboard-charts-section";
    chartsSection.style.padding = "8px 12px";

    // Summary stat: total population (use pointsData if available)
    const totalPop =
      pointsGeoJSON && pointsGeoJSON.features
        ? (pointsGeoJSON.features || []).reduce(
            (sum, f) => sum + (Number(f.properties?.population) || 0),
            0,
          )
        : (govesData.features || []).reduce(
            (sum, f) => sum + (Number(f.properties.population_sum) || 0),
            0,
          );
    const statCanvas = document.createElement("canvas");
    statCanvas.style.width = "100%";
    statCanvas.style.height = "80px";
    chartsSection.appendChild(statCanvas);
    // initial stat render
    renderChart(statCanvas, {
      type: "stat",
      value: new Intl.NumberFormat().format(totalPop),
      label: "Total Population",
      color: "#0E21A0",
    });

    // Bar chart: population by governorate (vertical by default)
    // Initial grouping for bar/pie: prefer points grouped by `region`, otherwise fall back to governorates
    let labels = [];
    let values = [];
    if (
      pointsGeoJSON &&
      Array.isArray(pointsGeoJSON.features) &&
      pointsGeoJSON.features.length
    ) {
      const groupMap = new Map();
      (pointsGeoJSON.features || []).forEach((pt) => {
        const props = pt.properties || {};
        const key =
          props.region ||
          props.region_name ||
          props.h3 ||
          props.id ||
          props.fid ||
          "point";
        const val = Number(props.population) || 0;
        if (groupMap.has(key)) groupMap.set(key, groupMap.get(key) + val);
        else groupMap.set(key, val);
      });
      const grouped = Array.from(groupMap.entries())
        .map(([k, v]) => ({ k, v }))
        .sort((a, b) => b.v - a.v);
      labels = grouped.map((d) => d.k);
      values = grouped.map((d) => d.v);
    } else {
      const out = SpatialAnalysis.extractLabelsAndValues(
        govesData,
        "name",
        "population_sum",
      );
      labels = out.labels;
      values = out.values;
    }

    const barWrap = document.createElement("div");
    barWrap.style.width = "100%";
    barWrap.style.height = "260px";
    barWrap.style.boxSizing = "border-box";
    const barCanvas = document.createElement("canvas");
    barCanvas.style.width = "100%";
    barCanvas.style.height = "100%";
    barCanvas.style.display = "block";
    barWrap.appendChild(barCanvas);
    chartsSection.appendChild(barWrap);
    // create bar chart and keep reference
    const barChartInstance = renderChart(barCanvas, {
      type: "bar",
      data: { labels, values },
      colorScheme: "blues",
      label: "Population by Governorate",
      showAllTicks: false,
      barWidth: 25,
    });

    // Pie chart: population share
    const pieWrap = document.createElement("div");
    pieWrap.style.width = "100%";
    pieWrap.style.height = "220px";
    pieWrap.style.boxSizing = "border-box";
    const pieCanvas = document.createElement("canvas");
    pieCanvas.style.width = "100%";
    pieCanvas.style.height = "100%";
    pieCanvas.style.display = "block";
    pieWrap.appendChild(pieCanvas);
    chartsSection.appendChild(pieWrap);
    const pieChartInstance = renderChart(pieCanvas, {
      type: "pie",
      data: { labels, values },
      colorScheme: "custom",
      label: "Population Share",
      legend: false,
    });

    content.appendChild(chartsSection);

    // Helper to update charts given an optional polygon (mergedShape).
    // When a polygon is provided, aggregate point data inside it; otherwise use all points.
    function updateCharts(mergedShape) {
      try {
        console.log("updateCharts called", { hasShape: !!mergedShape });

        // Determine which points to use
        let pointsForCharts = pointsGeoJSON;
        if (mergedShape) {
          try {
            const pts = SpatialAnalysis.filterPointsInShape(
              pointsGeoJSON,
              mergedShape,
            );
            console.log("updateCharts - points inside selection:", pts.length);
            pointsForCharts = { type: "FeatureCollection", features: pts };
          } catch (e) {
            console.warn("filterPointsInShape failed:", e);
            pointsForCharts = { type: "FeatureCollection", features: [] };
          }
        }

        // Group points by a key (prefer h3, then id/fid)
        const groupMap = new Map();
        (pointsForCharts.features || []).forEach((pt) => {
          const props = pt.properties || {};
          // Prefer grouping by `region` which matches governorate name in the 3km dataset
          const key =
            props.region ||
            props.region_name ||
            props.h3 ||
            props.id ||
            props.fid ||
            "point";
          const val = Number(props.population) || 0;
          if (groupMap.has(key)) groupMap.set(key, groupMap.get(key) + val);
          else groupMap.set(key, val);
        });

        const grouped = Array.from(groupMap.entries())
          .map(([k, v]) => ({ k, v }))
          .sort((a, b) => b.v - a.v);

        const newLabels = grouped.map((d) => d.k).slice(0, 12);
        const newValues = grouped.map((d) => d.v).slice(0, 12);
        console.log(
          "updateCharts - labels/values:",
          newLabels.length,
          newValues.length,
        );

        // Compute total population for stat
        const total = (pointsForCharts.features || []).reduce(
          (s, f) => s + (Number(f.properties?.population) || 0),
          0,
        );
        console.log("updateCharts - total:", total);

        // Render stat
        renderChart(statCanvas, {
          type: "stat",
          value: new Intl.NumberFormat().format(total),
          label: "Total Population",
          color: "#0E21A0",
        });

        // Render bar chart (top groups)
        renderChart(barCanvas, {
          type: "bar",
          data: { labels: newLabels, values: newValues },
          colorScheme: "blues",
          label: "Population by Group",
          showAllTicks: false,
          barWidth: 25,
        });

        // Render pie chart
        renderChart(pieCanvas, {
          type: "pie",
          data: { labels: newLabels, values: newValues },
          colorScheme: "custom",
          label: "Population Share",
          legend: false,
        });
      } catch (err) {
        console.warn("updateCharts failed:", err);
      }
    }

    // Return controller so caller can trigger updates
    return { updateCharts };
  } catch (e) {
    console.warn("initializeCharts error:", e);
  }
}
