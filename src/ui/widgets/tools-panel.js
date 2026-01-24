/**
 * ToolsPanel - Independent UI widget for tools (Drawing, etc.)
 * Positioned absolutely separate from LayerSwitcher
 */
export class ToolsPanel {
  constructor() {
    this.element = this.render();
  }

  render() {
    const container = document.createElement("div");
    container.className = "gis-widget tools-panel";
    container.innerHTML = `
      <h4>Tools</h4>
      <div class="tools-list"></div>
    `;
    return container;
  }

  /**
   * Add a tool (like DrawingTool) to this panel
   */
  addTool(name, tool) {
    const toolsList = this.element.querySelector(".tools-list");
    const row = document.createElement("div");
    row.className = "layer-row";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = false;

    // Tool toggle
    checkbox.onchange = (e) => {
      if (tool.toggle) {
        tool.toggle(e.target.checked);
      }
    };

    const label = document.createElement("span");
    label.innerText = name;
    label.onclick = () => checkbox.click();

    row.appendChild(checkbox);
    row.appendChild(label);
    toolsList.appendChild(row);
  }

  /**
   * Add a clear button for drawn shapes
   */
  addClearButton(drawingTool) {
    const toolsList = this.element.querySelector(".tools-list");
    const button = document.createElement("button");
    button.innerText = "Clear Drawn";
    button.className = "clear-drawn-btn";
    button.onclick = () => {
      drawingTool.clearShapes();
    };

    const buttonRow = document.createElement("div");
    buttonRow.style.marginTop = "8px";
    buttonRow.appendChild(button);
    toolsList.appendChild(buttonRow);
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
}
