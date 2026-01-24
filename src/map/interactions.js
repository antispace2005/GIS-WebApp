import Draw from "ol/interaction/Draw";
import VectorSource from "ol/source/Vector";
import { Vector as VectorLayer } from "ol/layer";
import Style from "ol/style/Style";
import Stroke from "ol/style/Stroke";
import Fill from "ol/style/Fill";

export class DrawingTool {
  constructor(map) {
    this.map = map;
    this.isActive = false;
    this.drawnShapes = [];
    this.drawingLayer = null;
    this.drawInteraction = null;

    this.initDrawingLayer();
  }

  initDrawingLayer() {
    // Create a layer to show drawn shapes
    const source = new VectorSource();
    const style = new Style({
      stroke: new Stroke({
        color: "#ff3333",
        width: 2,
      }),
      fill: new Fill({
        color: "rgba(255, 51, 51, 0.1)",
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
  }
}
