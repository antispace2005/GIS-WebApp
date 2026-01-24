// src/ui/widgets/basemap-switcher.js
import { switchBaseMap } from "../../map/core.js";

export class BasemapSwitcher {
  constructor(map) {
    this.map = map;
    this.element = document.createElement("div");
    this.element.className =
      "gis-widget basemap-switcher floating-bottom-right";
    this.element.innerHTML = `<h4>Base Maps</h4><div class="btn-container"></div>`;

    // Listen for new base maps being added manually
    this.map.on("basemap-added", () => this.refreshButtons());
  }

  refreshButtons() {
    const container = this.element.querySelector(".btn-container");
    container.innerHTML = ""; // Clear existing

    const registry = this.map.get("baseMapRegistry");
    Object.keys(registry).forEach((id) => {
      const btn = document.createElement("button");
      btn.innerText = id;
      btn.className = "basemap-btn";
      btn.onclick = () => switchBaseMap(this.map, id);
      container.appendChild(btn);
    });
  }

  mount(parent = document.body) {
    parent.appendChild(this.element);
    this.refreshButtons(); // Initial draw
  }
}
