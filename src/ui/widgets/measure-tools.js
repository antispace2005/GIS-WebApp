/**
 * Measurement toolbar widget
 * Supports distance (line) and area (polygon) with live readout and labels on features
 */
import Draw from "ol/interaction/Draw";
import VectorSource from "ol/source/Vector";
import { Vector as VectorLayer } from "ol/layer";
import { getLength, getArea } from "ol/sphere";
import Style from "ol/style/Style";
import Stroke from "ol/style/Stroke";
import Fill from "ol/style/Fill";
import Text from "ol/style/Text";
import { unByKey } from "ol/Observable";
import { getCenter } from "ol/extent";
import Point from "ol/geom/Point";

export class MeasureTools {
  constructor(map) {
    this.map = map;
    this.element = this.render();
    this.source = new VectorSource();
    this.layer = new VectorLayer({
      source: this.source,
      style: (feature) => this.createStyle(feature),
    });
    this.map.addLayer(this.layer);

    this.draw = null;
    this.activeMode = null; // "line" or "area"
    this.sketch = null;
    this.listener = null;

    this.distanceEl = null;
    this.areaEl = null;

    this.setupHandlers();
  }

  render() {
    const container = document.createElement("div");
    container.className = "gis-widget measure-tools";
    container.innerHTML = `
      <div class="measure-title">Measure</div>
      <div class="measure-buttons">
        <button class="measure-btn" data-mode="line">Distance</button>
        <button class="measure-btn" data-mode="area">Area</button>
        <button class="measure-btn clear" data-mode="clear">Clear</button>
      </div>
      <div class="measure-readouts">
        <div class="readout"><span class="label">Distance:</span> <span class="value" id="measure-distance">0 m</span></div>
        <div class="readout"><span class="label">Area:</span> <span class="value" id="measure-area">0 m²</span></div>
      </div>
    `;
    return container;
  }

  setupHandlers() {
    this.distanceEl = this.element.querySelector("#measure-distance");
    this.areaEl = this.element.querySelector("#measure-area");

    const buttons = this.element.querySelectorAll(".measure-btn");
    buttons.forEach((btn) => {
      btn.onclick = () => {
        const mode = btn.dataset.mode;
        if (mode === "line" || mode === "area") {
          this.toggleMode(mode);
        } else if (mode === "clear") {
          this.clearMeasurements();
        }
      };
    });
  }

  toggleMode(mode) {
    if (this.activeMode === mode) {
      this.deactivateDraw();
      this.activeMode = null;
      this.updateActiveButtons();
      return;
    }
    this.activeMode = mode;
    this.updateActiveButtons();
    this.activateDraw(mode);
  }

  updateActiveButtons() {
    const buttons = this.element.querySelectorAll(".measure-btn");
    buttons.forEach((btn) => {
      const mode = btn.dataset.mode;
      if (mode === this.activeMode) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  activateDraw(mode) {
    this.deactivateDraw();
    const type = mode === "area" ? "Polygon" : "LineString";
    this.draw = new Draw({ source: this.source, type });

    this.draw.on("drawstart", (evt) => {
      this.sketch = evt.feature;
      this.updateReadouts(0, 0);
      const geom = this.sketch.getGeometry();
      this.listener = geom.on("change", (e) => {
        this.computeAndShow(e.target, true);
      });
    });

    this.draw.on("drawend", (evt) => {
      const geom = evt.feature.getGeometry();
      const { dist, area } = this.computeMeasurements(geom);

      // Store the measurement as a property on the feature
      if (geom.getType() === "LineString") {
        evt.feature.set("measurement", this.formatDistance(dist));
      } else if (geom.getType() === "Polygon") {
        evt.feature.set("measurement", this.formatArea(area));
      }

      this.sketch = null;
      if (this.listener) {
        unByKey(this.listener);
        this.listener = null;
      }
      this.updateReadouts(0, 0);
    });

    this.map.addInteraction(this.draw);
  }

  deactivateDraw() {
    if (this.draw) {
      this.map.removeInteraction(this.draw);
      this.draw = null;
    }
    if (this.listener) {
      unByKey(this.listener);
      this.listener = null;
    }
    this.sketch = null;
  }

  createStyle(feature) {
    const geometry = feature.getGeometry();
    const measurement = feature.get("measurement");

    const styles = [
      new Style({
        stroke: new Stroke({ color: "#ff9900", width: 2 }),
        fill: new Fill({ color: "rgba(255, 153, 0, 0.15)" }),
      }),
    ];

    if (measurement && geometry) {
      let labelPoint;
      if (geometry.getType() === "LineString") {
        // Place label at the midpoint of the line
        const coordinates = geometry.getCoordinates();
        const midIndex = Math.floor(coordinates.length / 2);
        labelPoint = coordinates[midIndex];
      } else if (geometry.getType() === "Polygon") {
        // Place label at the center of the polygon
        const extent = geometry.getExtent();
        labelPoint = getCenter(extent);
      }

      if (labelPoint) {
        styles.push(
          new Style({
            geometry: new Point(labelPoint),
            text: new Text({
              text: measurement,
              font: "bold 14px sans-serif",
              fill: new Fill({ color: "#fff" }),
              stroke: new Stroke({ color: "#ff9900", width: 3 }),
              offsetY: -10,
              backgroundFill: new Fill({ color: "rgba(255, 153, 0, 0.8)" }),
              padding: [3, 6, 3, 6],
            }),
          }),
        );
      }
    }

    return styles;
  }

  computeMeasurements(geometry) {
    let dist = 0;
    let area = 0;
    if (!geometry) return { dist, area };

    const type = geometry.getType();
    if (type === "LineString") {
      dist = getLength(geometry);
    } else if (type === "Polygon") {
      area = getArea(geometry);
      dist = getLength(geometry.getLinearRing(0));
    }
    return { dist, area };
  }

  computeAndShow(geometry, isLive = false) {
    const { dist, area } = this.computeMeasurements(geometry);
    if (isLive) {
      this.updateReadouts(dist, area);
    }
  }

  formatDistance(meters) {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${meters.toFixed(1)} m`;
  }

  formatArea(sqMeters) {
    if (sqMeters >= 1_000_000) {
      return `${(sqMeters / 1_000_000).toFixed(2)} km²`;
    }
    if (sqMeters >= 10_000) {
      return `${(sqMeters / 10_000).toFixed(2)} ha`;
    }
    return `${sqMeters.toFixed(1)} m²`;
  }

  updateReadouts(dist, area) {
    if (this.distanceEl)
      this.distanceEl.textContent = this.formatDistance(dist);
    if (this.areaEl) this.areaEl.textContent = this.formatArea(area);
  }

  clearMeasurements() {
    this.source.clear();
    this.updateReadouts(0, 0);
    this.deactivateDraw();
    this.activeMode = null;
    this.updateActiveButtons();
  }

  mount(target) {
    let parent;
    if (!target) {
      const id = "gis-measure-tools";
      let el = document.getElementById(id);
      if (!el) {
        el = document.createElement("div");
        el.id = id;
        el.className = "floating-top-left measure-tools-slot";
        document.body.appendChild(el);
      }
      parent = el;
    } else if (target instanceof HTMLElement) {
      parent = target;
    } else if (typeof target === "string") {
      const found = document.querySelector(target);
      if (found) {
        parent = found;
      } else {
        const el = document.createElement("div");
        if (target.startsWith("#")) el.id = target.substring(1);
        else if (target.startsWith(".")) el.className = target.substring(1);
        else el.id = target;
        document.body.appendChild(el);
        parent = el;
      }
    }
    parent.appendChild(this.element);
  }

  destroy() {
    this.clearMeasurements();
    this.map.removeLayer(this.layer);
    if (this.element?.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}
