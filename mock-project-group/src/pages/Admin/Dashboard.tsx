/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { Card, Flex, Typography, message } from "antd";
import CountUp from "react-countup";
import axios from "axios";
import { Bar, Pie, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import moment from "moment";
import { useAuth } from "../../contexts/AuthContext";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const { Text } = Typography;

const Dashboard = () => {
  const [emotions, setEmotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  // Fetch emotion recognition data
  useEffect(() => {
    const fetchEmotions = async () => {
      try {
        const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:3000";
        const authToken =
          token ??
          localStorage.getItem("token") ??
          localStorage.getItem("access_token") ??
          localStorage.getItem("accessToken");

        const res = await axios.get(`${BASE_URL}/emotions`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
        });
        setEmotions(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        console.error(error);
        message.error("Không thể tải dữ liệu cảm xúc");
      } finally {
        setLoading(false);
      }
    };
    fetchEmotions();
  }, [token]);

  // Stats computation
  const totalAnalyses = emotions.length;
  const avgConfidence = useMemo(() => {
    if (!emotions.length) return 0;
    const sum = emotions.reduce((acc, e) => acc + (e.confidence ?? 0), 0);
    return (sum / emotions.length).toFixed(2);
  }, [emotions]);

  const emotionLabels = ["Happy", "Sad", "Angry", "Surprised", "Neutral", "Fear", "Disgust"];
  const emotionCounts = emotionLabels.map(
    (emo) => emotions.filter((e) => e.label?.toLowerCase() === emo.toLowerCase()).length
  );

  // Pie Chart - Emotion Distribution
  const pieData = {
    labels: emotionLabels,
    datasets: [
      {
        data: emotionCounts,
        backgroundColor: [
          "rgba(255, 205, 86, 0.6)",
          "rgba(54, 162, 235, 0.6)",
          "rgba(255, 99, 132, 0.6)",
          "rgba(75, 192, 192, 0.6)",
          "rgba(201, 203, 207, 0.6)",
          "rgba(153, 102, 255, 0.6)",
          "rgba(255, 159, 64, 0.6)",
        ],
        borderWidth: 1,
      },
    ],
  };

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: { position: "bottom" as const },
      title: { display: true, text: "Phân bố cảm xúc được nhận diện" },
    },
  };

  // Line Chart - Detections over last 7 days
  const today = moment().startOf("day");
  const last7Days = Array.from({ length: 7 }, (_, i) =>
    today.clone().subtract(i, "days").format("YYYY-MM-DD")
  ).reverse();

  const detectionsPerDay = last7Days.map(
    (date) =>
      emotions.filter(
        (e) => moment(e.timestamp).format("YYYY-MM-DD") === date
      ).length
  );

  const lineData = {
    labels: last7Days.map((d) => moment(d).format("DD/MM")),
    datasets: [
      {
        label: "Số lượt nhận diện",
        data: detectionsPerDay,
        borderColor: "rgba(75, 192, 192, 1)",
        backgroundColor: "rgba(75, 192, 192, 0.3)",
        fill: true,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const },
      title: { display: true, text: "Số lượt nhận diện trong 7 ngày qua" },
    },
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
  };

  // Top users with most detections
  const userStats = useMemo(() => {
    const byUser: Record<string, number> = {};
    for (const e of emotions) {
      const uid = e.userId ?? e.user_id ?? "Unknown";
      byUser[uid] = (byUser[uid] ?? 0) + 1;
    }
    const sorted = Object.entries(byUser)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    return {
      labels: sorted.map(([uid]) => uid),
      counts: sorted.map(([, count]) => count),
    };
  }, [emotions]);

  const barData = {
    labels: userStats.labels,
    datasets: [
      {
        label: "Số lượt nhận diện",
        data: userStats.counts,
        backgroundColor: "rgba(54, 162, 235, 0.6)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const },
      title: { display: true, text: "Top 5 người dùng có nhiều lượt nhận diện nhất" },
    },
    scales: { y: { beginAtZero: true } },
  };

  return (
    <div className="p-6">
      <h1 className="font-bold text-2xl mb-4">Emotion Recognition Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <MetricCard title="Tổng lượt nhận diện" value={totalAnalyses} />
        <MetricCard title="Trung bình độ tin cậy (%)" value={avgConfidence} />
        <MetricCard
          title="Số cảm xúc được nhận diện"
          value={emotionLabels.filter((_, i) => emotionCounts[i] > 0).length}
        />
        <MetricCard
          title="Cảm xúc phổ biến nhất"
          value={
            emotionLabels[emotionCounts.indexOf(Math.max(...emotionCounts))] || "-"
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        <Card title="Phân bố cảm xúc" variant="outlined" className="h-full">
          <div className="h-[300px]">
            <Pie data={pieData} options={pieOptions} />
          </div>
        </Card>
        <Card title="Lượt nhận diện theo ngày" variant="outlined" className="h-full">
          <Line data={lineData} options={lineOptions} />
        </Card>
      </div>

      {userStats.labels.length > 0 && (
        <Card title="Top người dùng hoạt động" variant="outlined" className="mt-8">
          <Bar data={barData} options={barOptions} />
        </Card>
      )}
    </div>
  );
};

export default Dashboard;

// Reusable card component
type MetricCardProps = {
  title: string;
  value: number | string;
};

const MetricCard = ({ title, value }: MetricCardProps) => {
  const isNumber = typeof value === "number";
  return (
    <Card variant="outlined" style={{ minHeight: 150 }}>
      <Flex vertical gap="large">
        <Text>{title}</Text>
        {isNumber ? (
          <Typography.Title level={2} style={{ margin: 0 }}>
            <CountUp end={value as number} separator="," />
          </Typography.Title>
        ) : (
          <Typography.Paragraph
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 600,
              wordBreak: "break-word",
              overflowWrap: "anywhere",
            }}
          >
            {String(value)}
          </Typography.Paragraph>
        )}
      </Flex>
    </Card>
  );
};
