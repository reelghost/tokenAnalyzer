"use client";

import { ChartDataPoint } from "@/types";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

interface AnalyticsChartProps {
    data: ChartDataPoint[];
    title: string;
}

export default function AnalyticsChart({ data, title }: AnalyticsChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="h-80 flex items-center justify-center">
                <p className="text-gray-400">No data available for this period</p>
            </div>
        );
    }

    const formatAmount = (value: number) => {
        if (value >= 1000) {
            return `${(value / 1000).toFixed(1)}K`;
        }
        return value.toFixed(0);
    };

    return (
        <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={data}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                        dataKey="date"
                        stroke="#9ca3af"
                        tick={{ fill: "#9ca3af", fontSize: 12 }}
                        tickLine={{ stroke: "#9ca3af" }}
                    />
                    <YAxis
                        yAxisId="amount"
                        orientation="left"
                        stroke="#22d3ee"
                        tick={{ fill: "#9ca3af", fontSize: 12 }}
                        tickFormatter={formatAmount}
                        tickLine={{ stroke: "#9ca3af" }}
                    />
                    <YAxis
                        yAxisId="units"
                        orientation="right"
                        stroke="#a855f7"
                        tick={{ fill: "#9ca3af", fontSize: 12 }}
                        tickFormatter={formatAmount}
                        tickLine={{ stroke: "#9ca3af" }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "rgba(20, 20, 20, 0.95)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            borderRadius: "8px",
                            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
                        }}
                        labelStyle={{ color: "#e5e5e5", fontWeight: 600 }}
                        formatter={(value: number, name: string) => {
                            if (name === "Amount") {
                                return [`KES ${value.toLocaleString()}`, name];
                            }
                            return [`${value.toFixed(2)} kWh`, "Units"];
                        }}
                    />
                    <Legend
                        wrapperStyle={{ paddingTop: "20px" }}
                        formatter={(value) => (
                            <span style={{ color: "#e5e5e5" }}>{value}</span>
                        )}
                    />
                    <Line
                        yAxisId="amount"
                        type="monotone"
                        dataKey="amount"
                        name="Amount"
                        stroke="#22d3ee"
                        strokeWidth={2}
                        dot={{ fill: "#22d3ee", strokeWidth: 0, r: 4 }}
                        activeDot={{ r: 6, fill: "#22d3ee" }}
                    />
                    <Line
                        yAxisId="units"
                        type="monotone"
                        dataKey="units"
                        name="Units"
                        stroke="#a855f7"
                        strokeWidth={2}
                        dot={{ fill: "#a855f7", strokeWidth: 0, r: 4 }}
                        activeDot={{ r: 6, fill: "#a855f7" }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
