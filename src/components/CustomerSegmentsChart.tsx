import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface CustomerSegmentsChartProps {
  segments: Array<{
    segment: string;
    count: number;
    totalRevenue: number;
    avgOrderValue: number;
  }>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function CustomerSegmentsChart({ segments }: CustomerSegmentsChartProps) {
  const chartData = segments.map(seg => ({
    name: seg.segment,
    value: seg.count,
    revenue: seg.totalRevenue
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => [`${value} mijoz`, 'Soni']}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
