import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadarController,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadarController,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Clone the specific typography styling from the HTML reference document
ChartJS.defaults.font.family = "'Inter', sans-serif"; 
ChartJS.defaults.font.size = 9;
ChartJS.defaults.color = '#aaa';

export default ChartJS;
