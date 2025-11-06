import React, { useEffect, useMemo, useState } from "react";
import { Card, Flex, Typography } from "antd";
import CountUp from "react-countup";
import axios from "axios";
import { message } from "antd";
import { Bar, Pie } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from "chart.js";
import moment from "moment";
import { useAuth } from "../../contexts/AuthContext";

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const { Text } = Typography;


const Dashboard = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [books, setBooks] = useState<any[]>([]);
    const { token } = useAuth();
    // Fetch orders for statistics
    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/orders`);
                // đảm bảo totalPrice là number
                const normalized = (response.data || []).map((o: any) => ({
                    ...o,
                    totalPrice: Number(o.totalPrice ?? 0),
                }));
                setOrders(normalized);
            } catch (error) {
                message.error("Failed to fetch orders. Please try again later.");
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    // Fetch books for statistics
    useEffect(() => {
        const fetchBooks = async () => {
            try {
                const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:3000";
                const authToken = token ?? localStorage.getItem('token') ?? localStorage.getItem('access_token') ?? localStorage.getItem('accessToken');
                const res = await axios.get(`${BASE_URL}/books`, {
                    headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined
                });
                const raw = res?.data;
                const list: any[] = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw?.items) ? raw.items : []));
                setBooks(list);
            } catch (error: any) {
                // Retry protected route variant
                try {
                    const BASE = (import.meta.env.VITE_BASE_URL || "http://localhost:3000").replace(/\/$/, '');
                    const authToken = token ?? localStorage.getItem('token') ?? localStorage.getItem('access_token') ?? localStorage.getItem('accessToken');
                    const res2 = await axios.get(`${BASE}/664/books`, {
                        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined
                    });
                    const raw2 = res2?.data;
                    const list2: any[] = Array.isArray(raw2) ? raw2 : (Array.isArray(raw2?.data) ? raw2.data : (Array.isArray(raw2?.items) ? raw2.items : []));
                    setBooks(list2);
                } catch (err) {
                    message.error("Không thể tải dữ liệu sách");
                }
            }
        };
        fetchBooks();
    }, [token]);


    // Orders statistics
    const totalOrders = orders.length;
    const totalValue = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    const todayUtc = moment.utc().startOf("day");
    const last7Days = Array.from({ length: 7 }, (_, i) =>
        todayUtc.clone().subtract(i, "days").format("YYYY-MM-DD")
    ).reverse();

    const dailyCounts = last7Days.map((date) =>
        orders.filter(
            (order) => moment.utc(order.createdAt).format("YYYY-MM-DD") === date
        ).length
    );

    const chartData = {
        labels: last7Days.map((date) => moment.utc(date).format("DD/MM")),
        datasets: [
            {
                label: "Số đơn trong ngày",
                data: dailyCounts,
                backgroundColor: "rgba(54, 162, 235, 0.6)",
                borderColor: "rgba(54, 162, 235, 1)",
                borderWidth: 1,
            },
        ],
    };

    const chartOptions: any = {
        responsive: true,
        plugins: {
            legend: { position: "top" as const },
            title: { display: true, text: "Tổng đơn hàng trong 7 ngày qua" },
        },
        scales: {
            y: {
                beginAtZero: true,
                title: { display: true, text: "Số đơn" },
                ticks: {
                    stepSize: 1, 
                },
            },
        },
    };

    const statusLabels = ["Đang chờ xử lý", "Đang giao hàng", "Đã giao hàng", "Huỷ"];
    const statusCounts = statusLabels.map(
        (status) => orders.filter((order) => order.status === status).length
    );

    const pieData = {
        labels: statusLabels,
        datasets: [
            {
                data: statusCounts,
                backgroundColor: [
                    "rgba(255, 206, 86, 0.6)",  // vàng cho "chờ xử lý"
                    "rgba(54, 162, 235, 0.6)",  // xanh cho "đang giao hàng"
                    "rgba(75, 192, 192, 0.6)",  // xanh lá cho "đã giao hàng"
                    "rgba(255, 99, 132, 0.6)",  // đỏ cho "huỷ"
                ],
                borderColor: [
                    "rgba(255, 206, 86, 1)",
                    "rgba(54, 162, 235, 1)",
                    "rgba(75, 192, 192, 1)",
                    "rgba(255, 99, 132, 1)",
                ],
                borderWidth: 1,
            },
        ],
    };

    const pieOptions = {
        responsive: true,
        maintainAspectRatio: false,
        aspectRatio: 1,
        plugins: {
            legend: { position: "bottom" as const },
            title: { display: true, text: "Trạng thái đơn hàng" },
        },
    };

    // Book statistics
    const bookStats = useMemo(() => {
        const totalBooks = Array.isArray(books) ? books.length : 0;
        let totalSold = 0;
        let totalListPrice = 0;
        let sumRating = 0;
        let ratingCount = 0;

        if (Array.isArray(books)) {
            for (const b of books) {
                const qs = b?.quantity_sold;
                if (qs && typeof qs === 'object') {
                    const val = Number(qs.value);
                    if (Number.isFinite(val)) totalSold += val;
                    else if (typeof qs.text === 'string') {
                        const digits = qs.text.replace(/[^0-9+]/g, '');
                        if (digits.endsWith('+')) {
                            const num = Number(digits.slice(0, -1));
                            if (Number.isFinite(num)) totalSold += num;
                        } else {
                            const num = Number(digits);
                            if (Number.isFinite(num)) totalSold += num;
                        }
                    }
                } else if (typeof qs === 'number') {
                    totalSold += qs;
                }

                const lp = Number(b?.list_price ?? b?.price ?? 0);
                if (Number.isFinite(lp)) totalListPrice += lp;

                const r = Number(b?.rating_average);
                if (Number.isFinite(r)) { sumRating += r; ratingCount += 1; }
            }
        }
        const avgRating = ratingCount ? sumRating / ratingCount : 0;
        return { totalBooks, totalSold, totalListPrice, avgRating: Number(avgRating.toFixed(2)) };
    }, [books]);

    // User statistics derived from orders
    const userStats = useMemo(() => {
        type Agg = { count: number; total: number; name: string };
        const byUser: Record<string, Agg> = {};
        for (const o of orders) {
            const uid = o?.userId ?? o?.userID ?? o?.user?.id ?? o?.customerId ?? null;
            const firstRaw = o?.user?.firstName ?? o?.firstName;
            const lastRaw = o?.user?.lastName ?? o?.lastName;
            const first = typeof firstRaw === 'string' ? firstRaw.trim() : '';
            const last = typeof lastRaw === 'string' ? lastRaw.trim() : '';
            const hasFirstOrLast = !!(first || last);
            let name: string;
            if (hasFirstOrLast) {
                name = `${first} ${last}`.trim() || String(o?.fullname ?? o?.customerName ?? '').trim() || (uid != null ? `UserID: ${uid}` : 'Khách lẻ');
            } else {
                // No first/last: prefer explicit fallback to UserID: {id}
                name = uid != null ? `UserID: ${uid}` : (String(o?.fullname ?? o?.customerName ?? '').trim() || 'Khách lẻ');
            }
            const key = String(uid ?? name);
            if (!byUser[key]) byUser[key] = { count: 0, total: 0, name };
            byUser[key].count += 1;
            byUser[key].total += Number(o?.totalPrice ?? 0);
        }
        const uniqueUsers = Object.keys(byUser).length;
        const repeatUsers = Object.values(byUser).filter(u => u.count >= 2).length;
        const repeatRate = uniqueUsers ? (repeatUsers / uniqueUsers) * 100 : 0;
        const avgRevenuePerUser = uniqueUsers ? totalValue / uniqueUsers : 0;
        const sorted = Object.values(byUser).sort((a, b) => b.total - a.total);
        const top = sorted.slice(0, 5);
        const topSpender = top[0] ?? { name: '-', total: 0 };
        const topChart = {
            labels: top.map(u => u.name),
            datasets: [
                {
                    label: 'Chi tiêu (đ)',
                    data: top.map(u => u.total),
                    backgroundColor: 'rgba(10, 104, 255, 0.6)',
                    borderColor: 'rgba(10, 104, 255, 1)',
                    borderWidth: 1,
                },
            ],
        };
        return {
            uniqueUsers,
            repeatUsers,
            repeatRate: Number(repeatRate.toFixed(1)),
            avgRevenuePerUser,
            topSpender,
            topChart,
        };
    }, [orders, totalValue]);

    

    return (
        <div className="p-6">
            <h1 className="font-bold text-2xl mb-4">Thống kê đơn hàng</h1>
            <div className="grid grid-cols-2 gap-8 mb-8">
                <RevenueCard title="Tổng số đơn hàng" value={totalOrders} />
                <RevenueCard title="Tổng doanh thu" value={totalValue} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
                <Card title="Tổng đơn hàng theo ngày" variant="outlined" className="h-full">
                    <Bar data={chartData} options={chartOptions} />
                </Card>
                <Card title="Trạng thái đơn hàng" variant="outlined" className="h-full">
                    <div className="h-[300px]">
                        <Pie data={pieData} options={pieOptions} />
                    </div>
                </Card>
            </div>

            <h2 className="font-bold text-2xl mt-8 mb-4">Thống kê sách</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
                <RevenueCard title="Tổng số sách" value={bookStats.totalBooks} currency={false} />
                <RevenueCard title="Tổng đã bán" value={bookStats.totalSold} currency={false} />
                <RevenueCard title="Đánh giá trung bình" value={bookStats.avgRating} currency={false} decimals={1} />
                <RevenueCard title="Tổng giá niêm yết" value={bookStats.totalListPrice} />
            </div>

            <h2 className="font-bold text-2xl mt-8 mb-4">Thống kê người dùng</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
                <RevenueCard title="Số khách hàng duy nhất" value={userStats.uniqueUsers} currency={false} />
                <RevenueCard title="Doanh thu TB / khách" value={userStats.avgRevenuePerUser} />
                <RevenueCard title="Tỷ lệ mua lại (%)" value={userStats.repeatRate} currency={false} decimals={1} />
                <RevenueCard
                    title="Khách chi tiêu cao nhất"
                    value={`${userStats.topSpender.name} - ${userStats.topSpender.total.toLocaleString('vi-VN')} đ`}
                    currency={false}
                />
            </div>
            {userStats.topChart.labels.length > 0 && (
                <Card title="Top 5 khách chi tiêu cao nhất" variant="outlined" className="h-full mb-8">
                    <Bar data={userStats.topChart} options={{
                        responsive: true,
                        plugins: { legend: { position: 'top' as const }, title: { display: false, text: '' } },
                        scales: { y: { beginAtZero: true } }
                    }} />
                </Card>
            )}
        </div>
    );
};

export default Dashboard;


type RevenueCardProps = {
    title: string;
    value: number | string;
    height?: number;
    currency?: string | false;
    decimals?: number; // optional decimals override for numeric values
};

const RevenueCard = ({ title, value, height, currency, decimals, ...props }: RevenueCardProps) => {
    const isRevenueTitle = /revenue|doanh[\s_-]?thu/i.test(title);
    const isNumber = typeof value === "number";
    const suffix = currency === false ? "" : typeof currency === "string" ? currency : isRevenueTitle ? " đ" : "";

    return (
        <Card {...props} variant="outlined" style={{ minHeight: height || 150 }}>
            <Flex vertical gap="large">
                <Text>{title}</Text>
                {isNumber ? (
                    <Typography.Title level={2} style={{ margin: 0 }}>
                        <CountUp end={value as number} separator="," decimals={typeof decimals === 'number' ? decimals : 0} suffix={suffix} />
                    </Typography.Title>
                ) : (
                    <Typography.Paragraph style={{ margin: 0, fontSize: 18, fontWeight: 600, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                        {String(value)}
                    </Typography.Paragraph>
                )}
            </Flex>
        </Card>
    );
};
