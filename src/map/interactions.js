import Draw from "ol/interaction/Draw";
import VectorSource from "ol/source/Vector";
import { Vector as VectorLayer } from "ol/layer";
import Style from "ol/style/Style";
import Stroke from "ol/style/Stroke";
import Fill from "ol/style/Fill";
import { SpatialAnalysis } from "../spatial/analysis.js";
import Feature from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";

export class DrawingTool {
  constructor(map) {
    this.map = map;
    this.isActive = false;
    this.drawnShapes = [];
    this.drawingLayer = null;
    this.drawInteraction = null;
    this._onDrawCallbacks = [];
    this._onSelectCallbacks = [];
    this._searchCollection = null;
    this._clickHandler = null;

    this.initDrawingLayer();
  }

  initDrawingLayer() {
    // Create a layer to show drawn shapes
    const source = new VectorSource();
    const style = new Style({
      stroke: new Stroke({
        color: "#0e21a0",
        width: 2,
      }),
      fill: new Fill({
        color: "rgba(14, 33, 160, 0.12)",
      }),
    });

    this.drawingLayer = new VectorLayer({
      source: source,
      style: style,
    });
    this.map.addLayer(this.drawingLayer);
  }

  toggle(active) {
    this.isActive = active;

    if (active) {
      this.activateDrawing();
    } else {
      this.deactivateDrawing();
    }
  }

  activateDrawing() {
    if (this.drawInteraction) {
      this.map.removeInteraction(this.drawInteraction);
    }

    this.drawInteraction = new Draw({
      source: this.drawingLayer.getSource(),
      type: "Polygon",
      freehand: false,
    });

    this.drawInteraction.on("drawend", (event) => {
      const feature = event.feature;
      this.drawnShapes.push(feature);
      console.log(`Shape drawn. Total shapes: ${this.drawnShapes.length}`);
      // notify listeners with a shallow copy of shapes
      try {
        this._onDrawCallbacks.forEach((cb) => {
          try {
            cb(this.drawnShapes.slice());
          } catch (e) {
            console.warn("draw callback error:", e);
          }
        });
      } catch (e) {
        // ignore
      }
    });

    this.map.addInteraction(this.drawInteraction);
  }

  deactivateDrawing() {
    if (this.drawInteraction) {
      this.map.removeInteraction(this.drawInteraction);
      this.drawInteraction = null;
    }
  }

  getDrawnShapes() {
    return this.drawnShapes;
  }

  clearShapes() {
    this.drawingLayer.getSource().clear();
    this.drawnShapes = [];
    // notify listeners that shapes were cleared
    try {
      this._onDrawCallbacks.forEach((cb) => {
        try {
          cb(this.drawnShapes.slice());
        } catch (e) {
          console.warn("draw callback error:", e);
        }
      });
    } catch (e) {
      // ignore
    }
  }

  /**
   * Public deactivate for external callers to turn off the tool
   */
  deactivate() {
    try {
      this.toggle(false);
      this.isActive = false;
    } catch (e) {
      // ignore
    }
  }

  /**
   * Register a callback invoked when a new shape is drawn or shapes cleared.
   * Callback receives an array of drawn features (may be empty).
   */
  onDraw(cb) {
    if (typeof cb === "function") this._onDrawCallbacks.push(cb);
  }

  onSelect(cb) {
    if (typeof cb === "function") this._onSelectCallbacks.push(cb);
  }

  setSearchCollection(collection) {
    this._searchCollection = collection;
  }

  enablePointSelection(enable = true) {
    if (enable) {
      if (this._clickHandler) return;
      this._clickHandler = (evt) => {
        try {
          const coord = evt.coordinate;
          const hits = SpatialAnalysis.findFeaturesContainingPoint(
            this._searchCollection || { features: [] },
            coord,
          );
          try {
            this._onSelectCallbacks.forEach((cb) => {
              try {
                cb(hits);
              } catch (e) {
                console.warn("onSelect cb error", e);
              }
            });
          } catch (e) {}
        } catch (e) {
          console.warn("point selection handler failed", e);
        }
      };
      this.map.on("singleclick", this._clickHandler);
    } else {
      if (this._clickHandler) {
        this.map.un("singleclick", this._clickHandler);
        this._clickHandler = null;
      }
    }
  }
}

export class SelectionTool {
  constructor(map) {
    this.map = map;
    this.isActive = false;
    this._searchCollection = null;
    this._onSelectCallbacks = [];
    this._clickHandler = null;
    this._hoverHandler = null;
    this._hoveredFeature = null;
    this._hoveredLayer = null;
    this._selectedLayer = null;
    this._tooltip = null;
    this.initSelectionLayers();
  }

  initSelectionLayers() {
    // Selection layer (persistent, orange/blue fill)
    const selectSource = new VectorSource();
    const selectStyle = new Style({
      stroke: new Stroke({ color: "#0e21a0", width: 2 }),
      fill: new Fill({ color: "rgba(14, 33, 160, 0.18)" }),
    });
    this._selectedLayer = new VectorLayer({
      source: selectSource,
      style: selectStyle,
    });
    this.map.addLayer(this._selectedLayer);

    // Hover layer (temporary, yellow highlight)
    const hoverSource = new VectorSource();
    const hoverStyle = new Style({
      stroke: new Stroke({ color: "#79a8ff", width: 3 }),
      fill: new Fill({ color: "rgba(14, 33, 160, 0.08)" }),
    });
    this._hoveredLayer = new VectorLayer({
      source: hoverSource,
      style: hoverStyle,
    });
    this.map.addLayer(this._hoveredLayer);
  }

  toggle(active) {
    this.isActive = active;
    if (active) {
      this.activate();
    } else {
      this.deactivate();
    }
  }

  activate() {
    if (this._clickHandler) return;

    this._clickHandler = (evt) => {
      if (!this.isActive) return;
      try {
        const coord = evt.coordinate;
        const hits = SpatialAnalysis.findFeaturesContainingPoint(
          this._searchCollection || { features: [] },
          coord,
        );
        if (hits && hits.length > 0) {
          const feature = hits[0];
          // Store WGS84 feature directly in a data property on OL feature for later retrieval
          const geojsonFormat = new GeoJSON();
          const olFeature = geojsonFormat.readFeature(feature, {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:3857",
          });
          // Attach the original WGS84 feature
          olFeature.set("_wgs84Feature", feature, true);
          // Add to selected layer (do NOT clear - allow multiple selections)
          this._selectedLayer.getSource().addFeature(olFeature);

          // Notify callbacks with ALL currently selected features (as WGS84 GeoJSON Feature objects)
          const allSelected = this._selectedLayer
            .getSource()
            .getFeatures()
            .map((olF) => {
              // Return the stored WGS84 feature directly instead of round-tripping through writeFeature
              const storedFeature = olF.get("_wgs84Feature");
              if (storedFeature) {
                return storedFeature;
              }
              // Fallback for non-WGS84-stored features
              const geojsonFmt = new GeoJSON();
              const jsonStr = geojsonFmt.writeFeature(olF, {
                dataProjection: "EPSG:3857",
                featureProjection: "EPSG:4326",
              });
              return JSON.parse(jsonStr);
            });
          this._onSelectCallbacks.forEach((cb) => {
            try {
              cb(allSelected);
            } catch (e) {
              console.warn("onSelect cb error", e);
            }
          });
        }
      } catch (e) {
        console.warn("selection click handler failed", e);
      }
    };

    this._hoverHandler = (evt) => {
      if (!this.isActive) return;
      try {
        const coord = evt.coordinate;
        const hits = SpatialAnalysis.findFeaturesContainingPoint(
          this._searchCollection || { features: [] },
          coord,
        );

        // Clear hover layer before adding new hover
        const hoverSource = this._hoveredLayer.getSource();
        hoverSource.clear();
        this._hoveredFeature = null;

        if (hits && hits.length > 0) {
          const geojsonFormat = new GeoJSON();
          const olFeature = geojsonFormat.readFeature(hits[0], {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:3857",
          });
          this._hoveredFeature = olFeature;
          // Add to hover layer
          hoverSource.addFeature(olFeature);

          // Show tooltip
          const name = hits[0].properties?.name || "";
          if (name) {
            if (!this._tooltip) {
              this._tooltip = document.createElement("div");
              this._tooltip.id = "gov-hover-tooltip";
              this._tooltip.style.position = "fixed";
              this._tooltip.style.pointerEvents = "none";
              this._tooltip.style.padding = "4px 8px";
              this._tooltip.style.background = "rgba(0,0,0,0.8)";
              this._tooltip.style.color = "white";
              this._tooltip.style.borderRadius = "3px";
              this._tooltip.style.fontSize = "12px";
              this._tooltip.style.zIndex = "10000";
              document.body.appendChild(this._tooltip);
            }
            this._tooltip.style.display = "block";
            this._tooltip.textContent = name;
            const clientX = evt.originalEvent?.clientX || evt.pixel[0] || 0;
            const clientY = evt.originalEvent?.clientY || evt.pixel[1] || 0;
            this._tooltip.style.left = clientX + 12 + "px";
            this._tooltip.style.top = clientY + 12 + "px";
          }
        } else {
          if (this._tooltip) {
            this._tooltip.style.display = "none";
          }
        }
      } catch (e) {
        console.warn("hover handler failed", e);
      }
    };

    this.map.on("singleclick", this._clickHandler);
    this.map.on("pointermove", this._hoverHandler);
  }

  deactivate() {
    this.isActive = false;
    if (this._clickHandler) {
      this.map.un("singleclick", this._clickHandler);
      this._clickHandler = null;
    }
    if (this._hoverHandler) {
      this.map.un("pointermove", this._hoverHandler);
      this._hoverHandler = null;
    }
    if (this._hoveredLayer) {
      this._hoveredLayer.getSource().clear();
    }
    this._hoveredFeature = null;
    if (this._tooltip) {
      this._tooltip.style.display = "none";
    }
  }

  clearSelection() {
    if (this._selectedLayer) {
      this._selectedLayer.getSource().clear();
    }
  }

  setSearchCollection(collection) {
    this._searchCollection = collection;
  }

  onSelect(cb) {
    if (typeof cb === "function") this._onSelectCallbacks.push(cb);
  }

  getSelectedFeatures() {
    return this._selectedLayer
      .getSource()
      .getFeatures()
      .map((olF) => {
        // Return the stored WGS84 feature directly
        const storedFeature = olF.get("_wgs84Feature");
        if (storedFeature) {
          return storedFeature;
        }
        // Fallback for features added without stored WGS84
        const geojsonFormat = new GeoJSON();
        const jsonStr = geojsonFormat.writeFeature(olF, {
          dataProjection: "EPSG:3857",
          featureProjection: "EPSG:4326",
        });
        return JSON.parse(jsonStr);
      });
  }
}
