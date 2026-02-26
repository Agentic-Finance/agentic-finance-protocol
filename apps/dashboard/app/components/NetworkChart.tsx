'use client';

import React, { useEffect, useState, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function NetworkChart() {
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Delay rendering until the container is mounted and has dimensions
    useEffect(() => {
        const timer = requestAnimationFrame(() => setIsMounted(true));
        return () => cancelAnimationFrame(timer);
    }, []);

    useEffect(() => {
        const fetchChartData = async () => {
            try {
                const res = await fetch('/api/stats/chart');
                const json = await res.json();
                if (json.success) setData(json.data);
            } catch (error) {
                console.error("Chart fetch error", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchChartData();
    }, []);

    if (isLoading || !isMounted) {
        return <div className="h-64 flex items-center justify-center text-slate-500 font-mono text-sm animate-pulse">Loading Telemetry Data...</div>;
    }

    return (
        <div ref={containerRef} className="h-48 sm:h-64 w-full mt-4 sm:mt-6" style={{ minWidth: 0, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%" debounce={50}>
                <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                        {/* High-fidelity "Cyberpunk / Web3" shadow gradient */}
                        <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#d946ef" stopOpacity={0.4}/> {/* Fuchsia */}
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/> {/* Indigo */}
                        </linearGradient>
                    </defs>
                    
                    {/* Subtle grid lines */}
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    
                    {/* Axis Configuration */}
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11 }} tickMargin={10} />
                    <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11 }} tickFormatter={(value: number) => `$${value}`} />
                    
                    {/* Hover state Tooltip */}
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#11141D', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                        itemStyle={{ color: '#d946ef', fontWeight: 'bold' }}
                    />
                    
                    {/* Main Chart Area */}
                    <Area 
                        type="monotone" 
                        dataKey="volume" 
                        stroke="#d946ef" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorVolume)" 
                        animationDuration={1500}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
export default React.memo(NetworkChart);
