/**
 * Injects the initial application structure into the DOM.
 * @returns {Object} References to the created elements.
 */
export function initLayout() {
  // 1. Create the Main Application Root
  const appRoot = document.createElement("main");
  appRoot.id = "gis-app-root";

  // 2. Create the Map Slot
  // This is the "targetElement" required by our map core.
  const mapSlot = document.createElement("div");
  mapSlot.id = "map-canvas";
  mapSlot.className = "full-screen-map";

  // 3. Create a Widget Overlay Container
  // This is a transparent layer where our floating widgets will be mounted.
  const uiOverlay = document.createElement("div");
  uiOverlay.id = "ui-overlay";
  uiOverlay.className = "pointer-events-none";
  // ^ CSS will make sure this doesn't block map clicks

  // Assemble and Inject
  appRoot.appendChild(mapSlot);
  appRoot.appendChild(uiOverlay);
  document.body.appendChild(appRoot);

  return {
    mapSlot,
    uiOverlay,
  };
}
