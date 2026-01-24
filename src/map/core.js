import Map from "ol/Map";
import View from "ol/View";
import { fromLonLat } from "ol/proj";
export function initMap(targetElement) {
  const map = new Map({
    target: targetElement,
    layers: [], // Start empty or with a default
    view: new View({
      center: fromLonLat([0, 0]),
      zoom: 2,
    }),
    controls: [],
  });

  // Create a dynamic registry on the map object
  map.set("baseMapRegistry", {});

  return map;
}

/**
 * Manually adds a layer to the base map system
 */
export function registerBaseMap(map, id, layer, isVisible = false) {
  const registry = map.get("baseMapRegistry");

  // Set properties so we know it's a base layer
  layer.set("id", id);
  layer.setVisible(isVisible);

  // Store in registry
  registry[id] = layer;

  // Always insert base maps at the bottom (index 0)
  map.getLayers().insertAt(0, layer);

  // Trigger a custom event so the UI knows to refresh its buttons
  map.dispatchEvent({ type: "basemap-added", id: id });
}

export function switchBaseMap(map, key) {
  const registry = map.get("baseMapRegistry");
  Object.keys(registry).forEach((id) => {
    registry[id].setVisible(id === key);
  });
}
