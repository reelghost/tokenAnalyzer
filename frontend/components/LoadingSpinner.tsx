export default function LoadingSpinner() {
    return (
        <div className="flex items-center justify-center">
            <div className="relative w-16 h-16">
                <div className="absolute top-0 left-0 w-full h-full border-4 border-cyan-500/20 rounded-full"></div>
                <div className="absolute top-0 left-0 w-full h-full border-4 border-transparent border-t-cyan-500 rounded-full animate-spin"></div>
            </div>
        </div>
    );
}
