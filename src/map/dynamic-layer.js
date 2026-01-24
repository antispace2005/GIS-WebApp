import { DataLayerFactory } from "./generators.js";
import { Group as LayerGroup } from "ol/layer"; // Import Group

export class DynamicHeatmap {
  constructor(map, rawData, weightAttr = "population", maxWeight = null) {
    this.map = map;
    this.rawData = rawData;
    this.weightAttr = weightAttr;

    // ... (Your existing auto-detect logic for maxWeight) ...
    // Note: Keep your existing constructor logic for maxWeight here
    if (!maxWeight) {
      /* ... keep your existing code ... */
    } else {
      this.maxWeight = maxWeight;
    }

    // 1. STABILITY FIX: Create a Layer Group
    // This Group stays on the map forever. We just change what's inside it.
    this.layerGroup = new LayerGroup({
      layers: [],
      properties: { title: "Dynamic Heatmap" }, // Helpful for debugging
    });
    this.map.addLayer(this.layerGroup);

    // Initial render
    this.refresh();

    // Event Listeners
    this.map.getView().on("change:resolution", () => this.updateHeatmapStyle());
    this.map.getView().on("moveend", () => this.refresh());
  }

  // ... (Keep calculateRadius, calculateBlur, updateHeatmapStyle exactly as they are) ...
  calculateRadius(zoom) {
    return Math.max(5, Math.min(50, 5 + (zoom - 5) * 3));
  }
  calculateBlur(zoom) {
    return Math.max(10, Math.min(40, 10 + (zoom - 5) * 2));
  }

  updateHeatmapStyle() {
    // Get the actual layer from inside the group
    const layers = this.layerGroup.getLayers();
    if (layers.getLength() > 0) {
      const layer = layers.item(0);
      const zoom = this.map.getView().getZoom();
      layer.setBlur(this.calculateBlur(zoom));
      layer.setRadius(this.calculateRadius(zoom));
    }
  }

  refresh() {
    const zoom = this.map.getView().getZoom();

    // ... (Keep your existing viewExtent / buffer logic) ...
    const viewExtent = this.map.getView().calculateExtent(this.map.getSize());
    const buffer = [
      (viewExtent[2] - viewExtent[0]) * 0.2,
      (viewExtent[3] - viewExtent[1]) * 0.2,
    ];
    const bufferedExtent = [
      viewExtent[0] - buffer[0],
      viewExtent[1] - buffer[1],
      viewExtent[2] + buffer[0],
      viewExtent[3] + buffer[1],
    ];

    // ... (Keep your existing filtering logic) ...
    const visibleFeatures = this.rawData.features.filter((feature) => {
      // ... paste your existing filter logic here ...
      if (feature.geometry.type === "Point") {
        const [x, y] = feature.geometry.coordinates;
        return (
          x >= bufferedExtent[0] &&
          x <= bufferedExtent[2] &&
          y >= bufferedExtent[1] &&
          y <= bufferedExtent[3]
        );
      }
      return true;
    });

    const filteredData = {
      type: "FeatureCollection",
      features: visibleFeatures,
    };

    // 2. STABILITY FIX: Swap layer INSIDE the Group
    // Clear the group
    this.layerGroup.getLayers().clear();

    // Create new layer
    const newLayer = DataLayerFactory.createBasicHeatmap(
      filteredData,
      this.weightAttr,
      this.maxWeight,
      this.calculateBlur(zoom),
      this.calculateRadius(zoom),
      0.7,
    );

    // Add to Group (instead of Map)
    this.layerGroup.getLayers().push(newLayer);
  }

  // 3. UI INTERFACE: Methods for the Layer Switcher
  getLayer() {
    return this.layerGroup;
  }

  setVisible(visible) {
    this.layerGroup.setVisible(visible);
  }
}
