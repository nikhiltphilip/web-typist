// The Chart.js pieces our charts use. chart.js/auto would also bundle every
// other chart type, scale and plugin (pie, radar, time axes, legend…).
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  ScatterController,
  Tooltip,
} from "chart.js";

Chart.register(BarController, BarElement, CategoryScale, Filler, LinearScale, LineController, LineElement, PointElement, ScatterController, Tooltip);

export { Chart };
