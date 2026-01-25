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
import { DrawingTool } from "./map/interactions.js";
import { SidebarPrimary } from "./ui/sidebar-primary.js";
import { Drawer } from "./ui/drawer.js";
import "./ui/sidebar-primary.css";
import { Dashboard } from "./ui/dashboard.js";
import "./ui/dashboard.css";
import { SpatialAnalysis } from "./spatial/analysis.js";

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
      svg: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`
    }
  ];
  const sidebarPrimary = new SidebarPrimary({ icons: sidebarIcons, position: 'right' });
  sidebarPrimary.mount();

  // Prepare iconEl for later use
  const iconEl = sidebarPrimary.element.querySelector('.sidebar-icon[data-key="layers"]');
  // Mount the dashboard sidebar
  const dashboard = new Dashboard();
  dashboard.mount();
  try {
    const data = await Fetchers.fetchWFS(
      "/geoserver/wfs",
      "OSM:Egypt_Population",
    );

    // Fetch the governorate GeoJSON from public folder
    const govesResponse = await fetch("/data/gov_with_pop.geojson");
    const govesData = await govesResponse.json();

    // 1. Initialize Logic (Phase 2) - Use Dynamic Heatmap
    const dynamicManager = new DynamicHeatmap(map, data, "population");

    // Create a vector layer for governorates
    const govesLayer = DataLayerFactory.createVector(govesData);
    map.addLayer(govesLayer.instance);

    map.getView().setCenter([3473147.67, 3115456.46]);
    map.getView().setZoom(6);

    // 2. Initialize UI (Phase 3)
    const layerUI = new LayerSwitcher(map);
    layerUI.addLayer("Egypt Population (WFS)", dynamicManager.currentLayer);
    layerUI.addLayer("Governorates", govesLayer.instance);
    // Use Drawer utility for Layers flyout (after layers are ready)
    new Drawer({
      id: 'sidebar-flyout-layers',
      header: 'Layers',
      content: layerUI.element,
      triggerEl: iconEl,
      position: 'right',
      sticky: true
    });

    // Nav toolbar without 3D button (no v3dEngine)
    // const navTools = new NavTools(map);
    // navTools.mount();

    // Measure toolbar (Phase 4.6)
    const measureTools = new MeasureTools(map);
    measureTools.mount();

    // 3. Initialize Tools Panel (Phase 4)
    const toolsPanel = new ToolsPanel();
    const drawingTool = new DrawingTool(map);
    const analysisBox = new AnalysisBox();

    toolsPanel.addTool("Draw Mode", drawingTool);
    toolsPanel.addClearButton(drawingTool);
    toolsPanel.addAnalyzeButton(() => {
      // Get drawn shapes
      const drawnFeatures = drawingTool.getDrawnShapes();
      if (!drawnFeatures || drawnFeatures.length === 0) {
        alert("No shapes drawn. Please draw a polygon first.");
        return;
      }

      console.log("Drawn features:", drawnFeatures);

      // Union all polygons
      const mergedShape = SpatialAnalysis.unionPolygons(drawnFeatures);
      if (!mergedShape) {
        alert("Failed to process drawn shapes.");
        return;
      }

      console.log("Merged shape:", mergedShape);
      console.log("Merged shape geometry type:", mergedShape.geometry?.type);

      // Filter points inside the shape
      const pointsInside = SpatialAnalysis.filterPointsInShape(
        data,
        mergedShape,
      );
      console.log("Points inside:", pointsInside.length);

      // Aggregate population
      const totalPopulation = SpatialAnalysis.aggregateAttribute(
        pointsInside,
        "population",
      );

      // Show results
      analysisBox.showResults({
        pointCount: pointsInside.length,
        totalPopulation: totalPopulation,
        clearCallback: () => {
          drawingTool.clearShapes();
          analysisBox.hide();
        },
      });
    });

    toolsPanel.mount();
    analysisBox.mount();

    console.log("System Online: Logic + UI + Tools + Analysis connected.");
  } catch (e) {
    console.error("Error:", e);
  }
} // Phase 3: UI Setup

start();
