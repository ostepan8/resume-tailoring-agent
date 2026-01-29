import type { Metadata } from 'next'
import { Manrope, Chivo_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ClerkProvider } from '@clerk/nextjs'
import { AuthProvider } from '../lib/auth-context'
import DevPanel from './components/DevPanel'
import OnboardingWrapper from './components/OnboardingWrapper'
import './globals.css'

const manrope = Manrope({
    subsets: ['latin'],
    variable: '--font-manrope',
    display: 'swap',
})

const chivoMono = Chivo_Mono({
    subsets: ['latin'],
    variable: '--font-chivo-mono',
    display: 'swap',
})

export const metadata: Metadata = {
    title: 'AI Resume Tailor | Subconscious Demo',
    description: 'Tailor your resume for any job with AI agents that analyze job descriptions and optimize your experience.',
    icons: {
        icon: '/Subconscious_Logo_Graphic.png',
        apple: '/Subconscious_Logo_Graphic.png',
    },
    openGraph: {
        title: 'AI Resume Tailor',
        description: 'Tailor your resume for any job with AI agents that analyze job descriptions and optimize your experience.',
        images: ['/Subconscious_Logo_Graphic.png'],
    },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <ClerkProvider>
            <html lang="en" className={`${manrope.variable} ${chivoMono.variable}`}>
                <body>
                    <AuthProvider>
                        {children}
                        <OnboardingWrapper />
                        <DevPanel />
                    </AuthProvider>
                    <Analytics />
                </body>
            </html>
        </ClerkProvider>
    )
}
