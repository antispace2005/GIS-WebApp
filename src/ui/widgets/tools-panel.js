/**
 * ToolsPanel - Independent UI widget for tools (Drawing, etc.)
 * Positioned absolutely separate from LayerSwitcher
 */
export class ToolsPanel {
  constructor() {
    this.element = this.render();
    this._tools = []; // keep track of added tools for mutual exclusivity
  }

  render() {
    const container = document.createElement("div");
    container.className = "tools-panel";
    container.innerHTML = `
      <div class="tools-list"></div>
    `;
    return container;
  }

  /**
   * Add a tool (like DrawingTool) to this panel
   */
  addTool(name, tool) {
    const toolsList = this.element.querySelector(".tools-list");

    // If this is the selection tool, render a select toggle button
    if (String(name).toLowerCase().includes("select")) {
      const selectContainer = document.createElement("div");
      selectContainer.className = "select-controls";

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "btn-select-toggle";
      toggle.setAttribute("aria-pressed", tool.isActive ? "true" : "false");
      toggle.innerHTML = `
        <svg class="icon-select" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        <span class="btn-select-text">Select Region</span>
      `;

      toggle.addEventListener("click", () => {
        // deactivate other tools first
        this._tools.forEach((t) => {
          if (t.tool !== tool && typeof t.tool.deactivate === "function") {
            try {
              t.tool.deactivate();
            } catch (e) {}
          }
        });
        if (tool.toggle) tool.toggle(!tool.isActive);
        // sync toggles
        this._updateToggleStates();
      });

      // register
      this._tools.push({ name, tool, toggle });

      selectContainer.appendChild(toggle);

      // Add clear selection button below the toggle
      const clearSelBtn = document.createElement("button");
      clearSelBtn.type = "button";
      clearSelBtn.className = "btn-clear-selection";
      clearSelBtn.textContent = "Clear";
      // make it full width to match requested layout
      clearSelBtn.style.display = "block";
      clearSelBtn.style.width = "100%";
      clearSelBtn.addEventListener("click", () => {
        // Clear all selection/shape data across registered tools
        this.clearAll();
      });
      selectContainer.appendChild(clearSelBtn);

      toolsList.appendChild(selectContainer);
      return;
    }

    // If this is the drawing tool, render a nicer toggle/button row
    if (String(name).toLowerCase().includes("draw")) {
      // Create the draw toggle
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "btn-draw-toggle";
      toggle.setAttribute("aria-pressed", tool.isActive ? "true" : "false");
      toggle.innerHTML = `
        <svg class="icon-draw" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21l3-1 11-11 3-3a2.5 2.5 0 0 0-3.5-3.5l-3 3L4 18l-1 3z"></path></svg>
        <span class="btn-draw-text">Draw Area</span>
      `;

      // style to match clear button width
      toggle.style.display = "block";
      toggle.style.width = "100%";

      toggle.addEventListener("click", () => {
        // deactivate other tools first
        this._tools.forEach((t) => {
          if (t.tool !== tool && typeof t.tool.deactivate === "function") {
            try {
              t.tool.deactivate();
            } catch (e) {}
          }
        });
        if (tool.toggle) tool.toggle(!tool.isActive);
        // sync toggles
        this._updateToggleStates();
      });

      // register
      this._tools.push({ name, tool, toggle });

      // If select-controls exist, insert draw toggle above the clear button
      const selectControls = this.element.querySelector(".select-controls");
      if (selectControls) {
        const clearBtn = selectControls.querySelector(".btn-clear-selection");
        if (clearBtn) selectControls.insertBefore(toggle, clearBtn);
        else selectControls.appendChild(toggle);
        return;
      }

      // fallback: add a dedicated draw block
      const drawContainer = document.createElement("div");
      drawContainer.className = "draw-controls";

      const inner = document.createElement("div");
      inner.className = "draw-controls-inner";

      const row = document.createElement("div");
      row.className = "draw-controls-row";
      row.appendChild(toggle);
      this._drawControlsRow = row;
      inner.appendChild(row);
      const help = document.createElement("p");
      help.className = "draw-controls-help";
      help.textContent =
        "Draw polygons on the map. Click the button to start/stop drawing.";
      inner.appendChild(help);
      drawContainer.appendChild(inner);
      toolsList.appendChild(drawContainer);
      return;
    }
  }

  /**
   * Add a clear button for drawn shapes
   */
  addClearButton(drawingTool) {
    // Register drawing tool so clearAll can clear it; do not render a separate "Clear Shapes" UI
    if (drawingTool) {
      const exists = this._tools.find((e) => e.tool === drawingTool);
      if (!exists)
        this._tools.push({ name: "draw", tool: drawingTool, toggle: null });
    }
  }

  /**
   * Add an Analyze button that runs spatial analysis on drawn shapes
   */
  addAnalyzeButton(callback) {
    const toolsList = this.element.querySelector(".tools-list");
    const button = document.createElement("button");
    button.innerText = "Analyze";
    button.className = "analyze-btn";
    button.onclick = callback;

    const buttonRow = document.createElement("div");
    buttonRow.style.marginTop = "4px";
    buttonRow.appendChild(button);
    toolsList.appendChild(buttonRow);
  }

  /**
   * Mount the tools panel to target (or default location)
   */
  mount(target) {
    let parentElement;

    if (!target) {
      // Default: Create floating panel below the layer switcher
      const defaultId = "gis-tools-panel";
      let panel = document.getElementById(defaultId);
      if (!panel) {
        panel = document.createElement("div");
        panel.id = defaultId;
        panel.className = "floating-tools-panel";
        document.body.appendChild(panel);
      }
      parentElement = panel;
    } else if (target instanceof HTMLElement) {
      parentElement = target;
    } else if (typeof target === "string") {
      const found = document.querySelector(target);
      if (found) {
        parentElement = found;
      } else {
        parentElement = document.createElement("div");
        if (target.startsWith("#")) {
          parentElement.id = target.substring(1);
        } else if (target.startsWith(".")) {
          parentElement.className = target.substring(1);
        } else {
          parentElement.id = target;
        }
        document.body.appendChild(parentElement);
      }
    }

    if (parentElement) {
      parentElement.appendChild(this.element);
    }
  }

  /**
   * Clear selections and drawings across registered tools
   */
  clearAll() {
    this._tools.forEach((entry) => {
      const t = entry.tool;
      if (!t) return;
      try {
        if (typeof t.clearSelection === "function") t.clearSelection();
        if (typeof t.clearShapes === "function") t.clearShapes();
        if (typeof t.clearMeasurements === "function") t.clearMeasurements();
      } catch (e) {
        // ignore
      }
    });
    // update toggle visuals
    this._updateToggleStates();
  }

  _updateToggleStates() {
    this._tools.forEach((entry) => {
      const btn = entry.toggle;
      const t = entry.tool;
      if (!btn) return;
      const active = !!(t && t.isActive);
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }
}
