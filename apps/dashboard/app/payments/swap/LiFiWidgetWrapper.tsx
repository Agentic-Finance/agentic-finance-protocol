'use client';
import React from 'react';
import { LiFiWidget, WidgetConfig } from '@lifi/widget';

const widgetConfig: WidgetConfig = {
    integrator: 'agt.finance',
    variant: 'wide',
    subvariant: 'default',
    appearance: 'dark',
    theme: {
        container: {
            borderRadius: '16px',
            boxShadow: 'none',
        },
        palette: {
            primary: { main: '#1BBFEC' },
            secondary: { main: '#3EDDB9' },
            background: {
                default: '#14161E',
                paper: '#1A1D28',
            },
        },
        shape: {
            borderRadius: 12,
            borderRadiusSecondary: 8,
        },
    },
    chains: {
        allow: [1, 137, 8453, 42161, 10, 56, 43114, 250, 100],
    },
    tokens: {
        featured: [
            { chainId: 1, address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' }, // USDC on ETH
            { chainId: 137, address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' }, // USDC on Polygon
            { chainId: 8453, address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' }, // USDC on Base
        ],
    },
    sdkConfig: {
        routeOptions: {
            maxPriceImpact: 0.4,
            slippage: 0.005,
        },
    },
    buildUrl: true,
    hiddenUI: ['poweredBy'] as any,
};

export default function LiFiWidgetWrapper() {
    return (
        <div className="lifi-widget-container rounded-xl overflow-hidden" style={{ border: '1px solid var(--pp-border)' }}>
            <LiFiWidget config={widgetConfig} />
        </div>
    );
}
