"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MeterData, TokenBill, AnalyticsData } from "@/types";
import { fetchTokenBills, fetchAnalytics } from "@/lib/api";
import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues
const AnalyticsDashboard = dynamic(() => import("@/components/AnalyticsDashboard"), { ssr: false });

export default function ResultsPage() {
    const router = useRouter();
    const [meterData, setMeterData] = useState<MeterData | null>(null);
    const [meterNumber, setMeterNumber] = useState<string>("");
    const [tokenBills, setTokenBills] = useState<TokenBill[]>([]);
    const [loadingBills, setLoadingBills] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalBills, setTotalBills] = useState(0);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loadingAnalytics, setLoadingAnalytics] = useState(true);
    const ITEMS_PER_PAGE = 10;

    const loadBills = useCallback(async (meter: string, page: number) => {
        setLoadingBills(true);
        const result = await fetchTokenBills(meter, page, ITEMS_PER_PAGE);
        if (result.data) {
            setTokenBills(result.data.bills);
            setTotalPages(result.data.total_pages);
            setTotalBills(result.data.total);
            setCurrentPage(result.data.page);
        }
        setLoadingBills(false);
    }, []);

    const loadAnalytics = useCallback(async (meter: string) => {
        setLoadingAnalytics(true);
        const result = await fetchAnalytics(meter);
        if (result.data) {
            setAnalytics(result.data);
        }
        setLoadingAnalytics(false);
    }, []);

    useEffect(() => {
        const storedData = sessionStorage.getItem("meterData");
        const storedMeterNumber = sessionStorage.getItem("meterNumber");

        if (!storedData || !storedMeterNumber) {
            router.push("/");
            return;
        }

        try {
            const data = JSON.parse(storedData) as MeterData;
            setMeterData(data);
            setMeterNumber(storedMeterNumber);
            loadBills(storedMeterNumber, 1);
            loadAnalytics(storedMeterNumber);
        } catch (error) {
            console.error("Error parsing meter data:", error);
            router.push("/");
        }
    }, [router, loadBills, loadAnalytics]);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            loadBills(meterNumber, newPage);
        }
    };

    const handleNewSearch = () => {
        sessionStorage.removeItem("meterData");
        sessionStorage.removeItem("meterNumber");
        router.push("/");
    };

    const formatDate = (timestamp: string) => {
        try {
            const date = new Date(timestamp);
            return date.toLocaleDateString("en-KE", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return timestamp;
        }
    };

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat("en-KE", {
            style: "currency",
            currency: "KES",
        }).format(amount);
    };

    if (!meterData) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-cyan-500/20 border-t-cyan-500"></div>
                    <p className="mt-4 text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 md:p-8 animate-fade-in">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8 text-center">
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                        Meter Analysis Results
                    </h1>
                    <p className="text-gray-400">
                        Meter Number:{" "}
                        <span className="text-cyan-400 font-mono font-semibold">
                            {meterNumber}
                        </span>
                    </p>
                </div>

                {/* Data Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Contract Status Card */}
                    <div className="glass glass-hover rounded-xl p-6">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-medium text-gray-400 mb-1">Contract Status</h3>
                                <p className="text-xl font-semibold text-white">{meterData.contractStatus || "N/A"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Address Card */}
                    <div className="glass glass-hover rounded-xl p-6">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-medium text-gray-400 mb-1">Address</h3>
                                <p className="text-lg font-semibold text-white break-words">{meterData.address || "N/A"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Service Type Card */}
                    <div className="glass glass-hover rounded-xl p-6">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-medium text-gray-400 mb-1">Service Type</h3>
                                <p className="text-xl font-semibold text-white">{meterData.offeredService || "N/A"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Connection Type Card */}
                    <div className="glass glass-hover rounded-xl p-6">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-medium text-gray-400 mb-1">Connection Type</h3>
                                <p className="text-xl font-semibold text-white">{meterData.connectionType || "N/A"}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Analytics Dashboard */}
                {loadingAnalytics ? (
                    <div className="glass rounded-xl p-6 mb-8">
                        <div className="flex items-center justify-center py-12">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-cyan-500/20 border-t-cyan-500"></div>
                            <span className="ml-3 text-gray-400">Loading analytics...</span>
                        </div>
                    </div>
                ) : analytics && analytics.total_transactions > 0 ? (
                    <AnalyticsDashboard analytics={analytics} />
                ) : null}

                {/* Token Bills Table */}
                <div className="glass rounded-xl p-6 mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            Token Purchase History
                        </h2>
                        {totalBills > 0 && (
                            <span className="text-sm text-gray-400">
                                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalBills)} of {totalBills} records
                            </span>
                        )}
                    </div>

                    {loadingBills ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-cyan-500/20 border-t-cyan-500"></div>
                            <span className="ml-3 text-gray-400">Loading billing data...</span>
                        </div>
                    ) : tokenBills.length === 0 ? (
                        <div className="text-center py-12">
                            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <p className="text-gray-400">No billing data available yet.</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Date</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Token Number</th>
                                            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Amount</th>
                                            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Units</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tokenBills.map((bill, index) => (
                                            <tr
                                                key={`${bill.tokenNo}-${index}`}
                                                className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                            >
                                                <td className="py-3 px-4 text-sm text-gray-300">
                                                    {formatDate(bill.timestamp)}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-300 font-mono">
                                                    {bill.tokenNo}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-green-400 font-semibold text-right">
                                                    {formatAmount(bill.amount)}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-cyan-400 font-semibold text-right">
                                                    {bill.units} kWh
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-white/10">
                                    <button
                                        onClick={() => handlePageChange(1)}
                                        disabled={currentPage === 1}
                                        className="px-3 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        aria-label="First page"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all font-medium"
                                    >
                                        Previous
                                    </button>

                                    <div className="flex items-center gap-1 mx-2">
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            let pageNum;
                                            if (totalPages <= 5) {
                                                pageNum = i + 1;
                                            } else if (currentPage <= 3) {
                                                pageNum = i + 1;
                                            } else if (currentPage >= totalPages - 2) {
                                                pageNum = totalPages - 4 + i;
                                            } else {
                                                pageNum = currentPage - 2 + i;
                                            }
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => handlePageChange(pageNum)}
                                                    className={`w-10 h-10 rounded-lg font-medium transition-all ${currentPage === pageNum
                                                            ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                                                            : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                                                        }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all font-medium"
                                    >
                                        Next
                                    </button>
                                    <button
                                        onClick={() => handlePageChange(totalPages)}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        aria-label="Last page"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={handleNewSearch}
                        className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-cyan-500/25"
                    >
                        Search Another Meter
                    </button>
                </div>
            </div>
        </div>
    );
}
