export default function Loading() {
    return (
        <div className="min-h-screen bg-[#07090E] flex items-center justify-center">
            <div className="text-center">
                <div className="relative w-12 h-12 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20"></div>
                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500 animate-spin"></div>
                </div>
                <p className="text-slate-500 font-mono text-sm animate-pulse">
                    Initializing Protocol...
                </p>
            </div>
        </div>
    );
}
