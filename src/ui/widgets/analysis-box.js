export class AnalysisBox {
  constructor() {
    this.element = this.render();
    this.isVisible = false;
  }

  render() {
    const container = document.createElement("div");
    container.className = "gis-widget analysis-box";
    container.style.display = "none";

    container.innerHTML = `
      <div class="analysis-header">
        <h4>Analysis Results</h4>
        <button class="analysis-close-btn">&times;</button>
      </div>
      <div class="analysis-content">
        <div class="result-item">
          <span class="result-label">Points inside:</span>
          <span class="result-value" id="points-count">0</span>
        </div>
        <div class="result-item">
          <span class="result-label">Total Population:</span>
          <span class="result-value" id="total-population">0</span>
        </div>
        <div class="result-item">
          <span class="result-label">Avg. per Point:</span>
          <span class="result-value" id="avg-population">0</span>
        </div>
        <button class="analysis-clear-btn">Clear Selection</button>
      </div>
    `;

    // Close button listener
    container
      .querySelector(".analysis-close-btn")
      .addEventListener("click", () => {
        this.hide();
      });

    return container;
  }

  showResults(results) {
    const { pointCount, totalPopulation, clearCallback } = results;
    const avgPopulation =
      pointCount > 0 ? (totalPopulation / pointCount).toFixed(0) : 0;

    // Update values
    this.element.querySelector("#points-count").textContent =
      pointCount.toLocaleString();
    this.element.querySelector("#total-population").textContent =
      totalPopulation.toLocaleString();
    this.element.querySelector("#avg-population").textContent =
      avgPopulation.toLocaleString();

    // Clear button callback
    if (clearCallback) {
      this.element.querySelector(".analysis-clear-btn").onclick = clearCallback;
    }

    this.show();
  }

  show() {
    this.element.style.display = "block";
    this.isVisible = true;
  }

  hide() {
    this.element.style.display = "none";
    this.isVisible = false;
  }

  mount(target = "#analysis-results") {
    let parentElement;

    if (!target) {
      // Default: append to body
      document.body.appendChild(this.element);
    } else if (target instanceof HTMLElement) {
      parentElement = target;
      parentElement.appendChild(this.element);
    } else if (typeof target === "string") {
      const found = document.querySelector(target);
      if (found) {
        found.appendChild(this.element);
      } else {
        // Create container with that ID
        parentElement = document.createElement("div");
        parentElement.id = target.replace("#", "").replace(".", "");
        parentElement.className = target.startsWith(".")
          ? target.replace(".", "")
          : "";
        document.body.appendChild(parentElement);
        parentElement.appendChild(this.element);
      }
    }
  }
}
