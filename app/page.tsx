'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import styles from './page.module.css'
import Navbar from './components/Navbar'

export default function HomePage() {
  const [sdkVisible, setSdkVisible] = useState(false)
  const [featuresVisible, setFeaturesVisible] = useState<boolean[]>([false, false, false, false])
  const [ctaVisible, setCtaVisible] = useState(false)
  const [statsVisible, setStatsVisible] = useState(false)

  const sdkRef = useRef<HTMLDivElement>(null)
  const featureRefs = useRef<(HTMLDivElement | null)[]>([])
  const ctaRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observerOptions = {
      threshold: 0.2,
      rootMargin: '0px 0px -50px 0px',
    }

    const sdkObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setSdkVisible(true)
        }
      })
    }, observerOptions)

    const featureObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = featureRefs.current.indexOf(entry.target as HTMLDivElement)
          if (index !== -1) {
            setTimeout(() => {
              setFeaturesVisible((prev) => {
                const newState = [...prev]
                newState[index] = true
                return newState
              })
            }, index * 100)
          }
        }
      })
    }, observerOptions)

    const ctaObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setCtaVisible(true)
        }
      })
    }, observerOptions)

    const statsObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setStatsVisible(true)
        }
      })
    }, observerOptions)

    if (sdkRef.current) sdkObserver.observe(sdkRef.current)
    featureRefs.current.forEach((ref) => {
      if (ref) featureObserver.observe(ref)
    })
    if (ctaRef.current) ctaObserver.observe(ctaRef.current)
    if (statsRef.current) statsObserver.observe(statsRef.current)

    return () => {
      sdkObserver.disconnect()
      featureObserver.disconnect()
      ctaObserver.disconnect()
      statsObserver.disconnect()
    }
  }, [])

  return (
    <div className={styles.page}>
      <Navbar />

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroGrid} />
        <div className={styles.heroGradient} />

        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <span className={styles.badgeDot} />
            <span>Built with Subconscious AI Agents</span>
          </div>

          <h1 className={styles.heroTitle}>
            AI-Tailored Resumes<br />
            <span className={styles.heroTitleMuted}>for Every Opportunity</span>
          </h1>

          <p className={styles.heroSubtitle}>
            Tailored resumes are 63% more likely to get interviews. Our AI agents analyze 
            job requirements and optimize your resume to match what recruiters are looking for.
          </p>

          <div className={styles.heroCta}>
            <Link href="/tailor" className={styles.ctaPrimary}>
              <span>Start Tailoring</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <Link href="/dashboard" className={styles.ctaSecondary}>
              View Dashboard
            </Link>
          </div>

          <div className={styles.poweredBy}>
            <span className={styles.poweredByText}>Powered by</span>
            <a href="https://subconscious.dev" target="_blank" rel="noopener noreferrer" className={styles.poweredByLogo}>
              <Image
                src="/Subconscious_Logo.png"
                alt="Subconscious"
                width={130}
                height={24}
                style={{ objectFit: 'contain' }}
              />
            </a>
          </div>
        </div>
      </section>

      {/* Why Tailoring Matters */}
      <section className={styles.stats} ref={statsRef}>
        <div className={`${styles.statsContainer} ${statsVisible ? styles.visible : ''}`}>
          <div className={styles.statsHeader}>
            <span className={styles.sectionLabel}>WHY IT MATTERS</span>
            <h2 className={styles.sectionTitleLight}>Generic resumes don&apos;t work anymore</h2>
            <p className={styles.statsSubtitle}>
              Recruiters spend an average of 7 seconds reviewing a resume. AI-tailored resumes 
              surface the right skills and experiences instantly.
            </p>
          </div>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>63%</span>
              <span className={styles.statLabel}>More likely to get interviews with tailored resumes</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>75%</span>
              <span className={styles.statLabel}>Of resumes are rejected by ATS before human review</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>~90s</span>
              <span className={styles.statLabel}>Average tailoring time with Subconscious agents</span>
            </div>
          </div>
        </div>
      </section>

      {/* SDK Section */}
      <section className={styles.sdkSection} ref={sdkRef}>
        <div className={`${styles.sdkContainer} ${sdkVisible ? styles.visible : ''}`}>
          <div className={styles.sdkHeader}>
            <span className={styles.sectionLabel}>POWERED BY SUBCONSCIOUS</span>
            <h2 className={styles.sectionTitle}>
              Agent-Native Architecture
            </h2>
            <p className={styles.sectionDesc}>
              This app demonstrates how to build production AI features with Subconscious. 
              Our TIM-GPT engine handles complex reasoning, web research, and structured outputs—all in one API call.
            </p>
          </div>

          <div className={styles.sdkGrid}>
            <div className={styles.codeBlock}>
              <div className={styles.codeHeader}>
                <div className={styles.codeTabs}>
                  <span className={styles.codeTabActive}>tailor-resume.ts</span>
                </div>
                <span className={styles.codeLang}>TypeScript</span>
              </div>
              <pre className={styles.codeContent}>
                <code>
                  <span className={styles.codeKeyword}>import</span>{' { Subconscious, zodToJsonSchema } '}<span className={styles.codeKeyword}>from</span>{' '}<span className={styles.codeString}>&quot;subconscious&quot;</span>{';\n'}
                  <span className={styles.codeKeyword}>import</span>{' { z } '}<span className={styles.codeKeyword}>from</span>{' '}<span className={styles.codeString}>&quot;zod&quot;</span>{';\n\n'}
                  
                  <span className={styles.codeKeyword}>const</span>{' client = '}<span className={styles.codeKeyword}>new</span>{' '}<span className={styles.codeClass}>Subconscious</span>{'({\n'}
                  {'  apiKey: process.env.'}<span className={styles.codeVariable}>SUBCONSCIOUS_API_KEY</span>{'!,\n});\n\n'}
                  
                  <span className={styles.codeComment}>{'// Define structured output with Zod'}</span>{'\n'}
                  <span className={styles.codeKeyword}>const</span>{' TailoredResume = z.'}<span className={styles.codeFunction}>object</span>{'({\n'}
                  {'  matchScore: z.'}<span className={styles.codeFunction}>number</span>{'().'}<span className={styles.codeFunction}>describe</span>{'('}<span className={styles.codeString}>&quot;0-100 match score&quot;</span>{'),\n'}
                  {'  summary: z.'}<span className={styles.codeFunction}>string</span>{'().'}<span className={styles.codeFunction}>describe</span>{'('}<span className={styles.codeString}>&quot;Optimized summary&quot;</span>{'),\n'}
                  {'  experience: z.'}<span className={styles.codeFunction}>array</span>{'(ExperienceSchema),\n'}
                  {'});\n\n'}
                  
                  <span className={styles.codeComment}>{'// Run the agent with TIM-GPT engine'}</span>{'\n'}
                  <span className={styles.codeKeyword}>const</span>{' run = '}<span className={styles.codeKeyword}>await</span>{' client.'}<span className={styles.codeFunction}>run</span>{'({\n'}
                  {'  engine: '}<span className={styles.codeString}>&quot;tim-gpt&quot;</span>{',\n'}
                  {'  input: {\n'}
                  {'    instructions: '}<span className={styles.codeString}>{`\`Tailor resume for \${jobTitle} at \${company}\``}</span>{',\n'}
                  {'    tools: [{ type: '}<span className={styles.codeString}>&quot;platform&quot;</span>{', id: '}<span className={styles.codeString}>&quot;web_search&quot;</span>{' }],\n'}
                  {'    answerFormat: '}<span className={styles.codeFunction}>zodToJsonSchema</span>{'(TailoredResume),\n'}
                  {'  },\n'}
                  {'  options: { awaitCompletion: '}<span className={styles.codeBoolean}>true</span>{' },\n'}
                  {'});\n\n'}
                  
                  <span className={styles.codeComment}>{'// Type-safe structured response'}</span>{'\n'}
                  <span className={styles.codeKeyword}>const</span>{' result = run.result?.answer '}<span className={styles.codeKeyword}>as</span>{' TailoredResume;'}
                </code>
              </pre>
            </div>

            <div className={styles.sdkFeatures}>
              <div className={styles.sdkFeature}>
                <div className={styles.featureIconSmall}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <div>
                  <h4>TIM-GPT Engine</h4>
                  <p>Compound engine with GPT-4.1 for complex reasoning and tool use</p>
                </div>
              </div>

              <div className={styles.sdkFeature}>
                <div className={styles.featureIconSmall}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 7V4h16v3"/>
                    <path d="M9 20h6"/>
                    <path d="M12 4v16"/>
                  </svg>
                </div>
                <div>
                  <h4>Structured Outputs</h4>
                  <p>Zod schemas ensure type-safe, validated JSON responses</p>
                </div>
              </div>

              <div className={styles.sdkFeature}>
                <div className={styles.featureIconSmall}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                  </svg>
                </div>
                <div>
                  <h4>Platform Tools</h4>
                  <p>Built-in web_search for real-time company and role research</p>
                </div>
              </div>

              <div className={styles.sdkFeature}>
                <div className={styles.featureIconSmall}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                </div>
                <div>
                  <h4>Async + Webhooks</h4>
                  <p>awaitCompletion for sync, or poll/webhook for long jobs</p>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.sdkCta}>
            <a href="https://docs.subconscious.dev" target="_blank" rel="noopener noreferrer" className={styles.sdkLink}>
              Read the Docs
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M4 12L12 4M12 4H6M12 4v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <a href="https://subconscious.dev/playground" target="_blank" rel="noopener noreferrer" className={styles.sdkLink}>
              Try the Playground
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M4 12L12 4M12 4H6M12 4v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features}>
        <div className={styles.featuresContainer}>
          <div className={styles.featuresHeader}>
            <span className={styles.sectionLabel}>HOW IT WORKS</span>
            <h2 className={styles.sectionTitleLight}>Four steps to a tailored resume</h2>
          </div>

          <div className={styles.featureGrid}>
            <div
              ref={(el) => { featureRefs.current[0] = el }}
              className={`${styles.featureCard} ${featuresVisible[0] ? styles.visible : ''}`}
            >
              <div className={styles.featureNumber}>01</div>
              <h3 className={styles.featureTitle}>Upload Your Resume</h3>
              <p className={styles.featureDesc}>
                Upload your existing PDF. Our parser extracts experience, skills, 
                education, and achievements into a structured profile.
              </p>
            </div>

            <div
              ref={(el) => { featureRefs.current[1] = el }}
              className={`${styles.featureCard} ${featuresVisible[1] ? styles.visible : ''}`}
            >
              <div className={styles.featureNumber}>02</div>
              <h3 className={styles.featureTitle}>Add Job Description</h3>
              <p className={styles.featureDesc}>
                Paste a job URL or description. The AI extracts requirements, 
                keywords, and company context to understand what they need.
              </p>
            </div>

            <div
              ref={(el) => { featureRefs.current[2] = el }}
              className={`${styles.featureCard} ${featuresVisible[2] ? styles.visible : ''}`}
            >
              <div className={styles.featureNumber}>03</div>
              <h3 className={styles.featureTitle}>AI Tailoring</h3>
              <p className={styles.featureDesc}>
                Subconscious agents research the company, match your experience 
                to requirements, and rewrite bullet points for maximum relevance.
              </p>
            </div>

            <div
              ref={(el) => { featureRefs.current[3] = el }}
              className={`${styles.featureCard} ${featuresVisible[3] ? styles.visible : ''}`}
            >
              <div className={styles.featureNumber}>04</div>
              <h3 className={styles.featureTitle}>Download PDF</h3>
              <p className={styles.featureDesc}>
                Export your tailored resume as a clean, ATS-optimized PDF.
                Track all versions and match scores in your dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Subconscious CTA */}
      <section className={styles.subconsciousCta}>
        <div className={styles.subconsciousContainer}>
          <div className={styles.subconsciousContent}>
            <Image
              src="/Subconscious_Logo_Graphic.png"
              alt=""
              width={80}
              height={80}
              className={styles.subconsciousGraphic}
            />
            <div className={styles.subconsciousText}>
              <h3>Build AI agents that work</h3>
              <p>
                This app is built entirely on Subconscious. Create your own AI-powered 
                applications with our developer-friendly APIs, powerful engines, and production-ready infrastructure.
              </p>
            </div>
          </div>
          <div className={styles.subconsciousActions}>
            <a href="https://subconscious.dev/platform" target="_blank" rel="noopener noreferrer" className={styles.subconsciousBtn}>
              Get API Key
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M4 12L12 4M12 4H6M12 4v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <a href="https://docs.subconscious.dev/quickstart" target="_blank" rel="noopener noreferrer" className={styles.subconsciousLink}>
              Quickstart Guide →
            </a>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.cta}>
        <div ref={ctaRef} className={`${styles.ctaContainer} ${ctaVisible ? styles.visible : ''}`}>
          <h2 className={styles.ctaTitle}>Ready to optimize your resume?</h2>
          <p className={styles.ctaDesc}>
            Stop sending generic resumes. Tailor each application in under 2 minutes.
          </p>
          <div className={styles.ctaActions}>
            <Link href="/tailor" className={styles.ctaButtonPrimary}>
              Start Tailoring
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <Image
              src="/Subconscious_Logo.png"
              alt="Subconscious"
              width={120}
              height={24}
              style={{ objectFit: 'contain' }}
            />
            <p className={styles.footerDesc}>
              AI-powered resume tailoring. A Subconscious demo application.
            </p>
          </div>

          <div className={styles.footerLinks}>
            <div className={styles.footerCol}>
              <h4>Product</h4>
              <Link href="/tailor">Tailor Resume</Link>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/dashboard/history">History</Link>
            </div>
            <div className={styles.footerCol}>
              <h4>Subconscious</h4>
              <a href="https://subconscious.dev" target="_blank" rel="noopener noreferrer">Platform</a>
              <a href="https://docs.subconscious.dev" target="_blank" rel="noopener noreferrer">Documentation</a>
              <a href="https://subconscious.dev/playground" target="_blank" rel="noopener noreferrer">Playground</a>
            </div>
            <div className={styles.footerCol}>
              <h4>Developers</h4>
              <a href="https://docs.subconscious.dev/quickstart" target="_blank" rel="noopener noreferrer">Quickstart</a>
              <a href="https://docs.subconscious.dev/engines" target="_blank" rel="noopener noreferrer">Engines</a>
              <a href="https://docs.subconscious.dev/api-reference/introduction" target="_blank" rel="noopener noreferrer">API Reference</a>
            </div>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>© {new Date().getFullYear()} Subconscious. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
