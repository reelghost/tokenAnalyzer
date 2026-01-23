"use client";

import { useState } from "react";
import { AnalyticsData, PeriodAnalytics } from "@/types";
import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues with recharts
const AnalyticsChart = dynamic(() => import("./AnalyticsChart"), { ssr: false });

interface AnalyticsDashboardProps {
    analytics: AnalyticsData;
}

type TabType = "daily" | "weekly" | "monthly" | "yearly";

export default function AnalyticsDashboard({ analytics }: AnalyticsDashboardProps) {
    const [activeTab, setActiveTab] = useState<TabType>("monthly");

    const tabs: { key: TabType; label: string }[] = [
        { key: "daily", label: "Daily" },
        { key: "weekly", label: "Weekly" },
        { key: "monthly", label: "Monthly" },
        { key: "yearly", label: "Yearly" },
    ];

    const getTabData = (): PeriodAnalytics => {
        return analytics[activeTab];
    };

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat("en-KE", {
            style: "currency",
            currency: "KES",
        }).format(amount);
    };

    const currentPeriod = getTabData();

    return (
        <div className="glass rounded-xl p-6 mb-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Spending Analytics
                </h2>
                <span className="text-sm text-gray-400">{currentPeriod.label}</span>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === tab.key
                                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border border-cyan-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide">Total Spent</p>
                            <p className="text-lg font-bold text-cyan-400">{formatAmount(currentPeriod.total_amount)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500/10 to-pink-600/10 border border-purple-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide">Units Bought</p>
                            <p className="text-lg font-bold text-purple-400">{currentPeriod.total_units.toFixed(2)} kWh</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 border border-green-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide">Transactions</p>
                            <p className="text-lg font-bold text-green-400">{currentPeriod.count}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="bg-black/20 rounded-xl p-4">
                {currentPeriod.data.length === 0 ? (
                    <div className="h-80 flex flex-col items-center justify-center">
                        <svg className="w-16 h-16 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <p className="text-gray-400 text-center">No transactions for {currentPeriod.label}</p>
                    </div>
                ) : (
                    <AnalyticsChart data={currentPeriod.data} title={`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Spending`} />
                )}
            </div>
        </div>
    );
}
