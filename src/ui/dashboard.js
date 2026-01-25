// Dashboard Sidebar Component
// Handles sidebar open/close, chart area, and analytics widgets

export class Dashboard {
  constructor() {
    this.element = this.render();
    this.isCollapsed = false;
    this.setupToggle();
  }

  render() {
    const sidebar = document.createElement("div");
    sidebar.className = "dashboard-sidebar";
    sidebar.innerHTML = `
      <button class="dashboard-toggle" title="Toggle Sidebar">&#9776;</button>
      <div class="dashboard-content">
        <div class="dashboard-section" id="dashboard-charts">
          <!-- Chart(s) will be injected here -->
        </div>
        <div class="dashboard-section" id="dashboard-analytics">
          <!-- Analytics widgets go here -->
        </div>
      </div>
    `;
    return sidebar;
  }

  setupToggle() {
    const toggleBtn = this.element.querySelector(".dashboard-toggle");
    toggleBtn.onclick = () => {
      this.isCollapsed = !this.isCollapsed;
      this.element.classList.toggle("collapsed", this.isCollapsed);
    };
  }

  mount(target = document.body) {
    target.prepend(this.element);
  }
}
