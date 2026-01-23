"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchMeterData } from "@/lib/api";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorAlert from "@/components/ErrorAlert";

export default function Home() {
  const router = useRouter();
  const [meterNumber, setMeterNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!meterNumber.trim()) {
      setError("Please enter a meter number");
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: apiError } = await fetchMeterData(meterNumber.trim());

    if (apiError || !data) {
      setError(apiError || "Failed to fetch meter data");
      setLoading(false);
      return;
    }

    // Store data in sessionStorage and navigate to results
    sessionStorage.setItem("meterData", JSON.stringify(data));
    sessionStorage.setItem("meterNumber", meterNumber.trim());
    router.push("/results");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in">
      {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

      <div className="w-full max-w-md">
        {/* Logo/Title Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
            Token Bill{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              Analyzer
            </span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base">
            Analyze your KPLC token purchases and billing information
          </p>
        </div>

        {/* Input Card */}
        <div className="glass glass-hover rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="meterNumber"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Meter Number
              </label>
              <input
                type="text"
                id="meterNumber"
                value={meterNumber}
                onChange={(e) => setMeterNumber(e.target.value)}
                placeholder="Enter your meter number"
                disabled={loading}
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-cyan-500/25"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <LoadingSpinner />
                  <span>Analyzing...</span>
                </div>
              ) : (
                "Analyze Meter"
              )}
            </button>
          </form>
        </div>

        {/* Info Section */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Powered by KPLC Self-Service API
          </p>
        </div>
      </div>
    </div>
  );
}
