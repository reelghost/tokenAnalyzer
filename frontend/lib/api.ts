import { MeterData, TokenBill, PaginatedBillsResponse, AnalyticsData } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchMeterData(
    meterNumber: string
): Promise<{ data?: MeterData; error?: string }> {
    try {
        const response = await fetch(
            `${API_URL}/api/tokenabout/${meterNumber}`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        const result = await response.json();

        // Check if response contains error field
        if (result.error) {
            return { error: result.error };
        }

        // Return the data
        return { data: result as MeterData };
    } catch (error) {
        console.error("API Error:", error);
        return { error: "Failed to connect to the server. Please try again." };
    }
}

export async function fetchTokenBills(
    meterNumber: string,
    page: number = 1,
    limit: number = 10
): Promise<{ data?: PaginatedBillsResponse; error?: string }> {
    try {
        const response = await fetch(
            `${API_URL}/api/tokenbill/${meterNumber}?page=${page}&limit=${limit}`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        if (!response.ok) {
            if (response.status === 404) {
                return { data: { bills: [], total: 0, page: 1, limit: 10, total_pages: 0 } };
            }
            return { error: "Failed to fetch billing data" };
        }

        const result = await response.json();
        return { data: result as PaginatedBillsResponse };
    } catch (error) {
        console.error("API Error:", error);
        return { error: "Failed to connect to the server." };
    }
}

export async function fetchAnalytics(
    meterNumber: string
): Promise<{ data?: AnalyticsData; error?: string }> {
    try {
        const response = await fetch(
            `${API_URL}/api/tokenanalytics/${meterNumber}`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        if (!response.ok) {
            return { error: "Failed to fetch analytics data" };
        }

        const result = await response.json();
        return { data: result as AnalyticsData };
    } catch (error) {
        console.error("API Error:", error);
        return { error: "Failed to connect to the server." };
    }
}
