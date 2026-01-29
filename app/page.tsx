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

  const sdkRef = useRef<HTMLDivElement>(null)
  const featureRefs = useRef<(HTMLDivElement | null)[]>([])
  const ctaRef = useRef<HTMLDivElement>(null)

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

    if (sdkRef.current) sdkObserver.observe(sdkRef.current)
    featureRefs.current.forEach((ref) => {
      if (ref) featureObserver.observe(ref)
    })
    if (ctaRef.current) ctaObserver.observe(ctaRef.current)

    return () => {
      sdkObserver.disconnect()
      featureObserver.disconnect()
      ctaObserver.disconnect()
    }
  }, [])

  return (
    <div>
      <Navbar />

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroBackground}>
          <div className={styles.gradientOrb1} />
          <div className={styles.gradientOrb2} />
          <div className={styles.gradientOrb3} />
        </div>

        <div className={styles.floatingLogo}>
          <Image
            src="/Subconscious_Logo_Graphic.png"
            alt=""
            width={400}
            height={400}
            style={{ opacity: 0.15 }}
          />
        </div>

        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <span className={styles.mono}>AI-Powered</span> Resume Tailoring
          </div>

          <h1 className={styles.heroTitle}>
            Land Your Dream Job with{' '}
            <span className={styles.heroTitleAccent}>AI-Tailored</span> Resumes
          </h1>

          <p className={styles.heroSubtitle}>
            Our AI agents analyze job descriptions and automatically optimize your resume 
            to <strong>maximize your match score</strong> and stand out from the competition.
          </p>

          <div className={styles.heroCta}>
            <Link href="/tailor" className={styles.ctaPrimary}>
              Start Tailoring
              <svg className={styles.ctaArrow} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <Link href="/dashboard" className={styles.ctaSecondary}>
              Go to Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* SDK Section */}
      <section className={styles.sdkSection} ref={sdkRef}>
        <div className={styles.sdkContent}>
          <div className={`${styles.sdkText} ${sdkVisible ? styles.visible : ''}`}>
            <p className={styles.sectionTagline}>{'// POWERED BY SUBCONSCIOUS'}</p>
            <h2 className={styles.sectionTitle}>
              Built with <span className={styles.sectionTitleAccent}>Intelligent</span> AI Agents
            </h2>
            <p className={styles.sdkDesc}>
              Our resume tailoring is powered by <strong>Subconscious AI agents</strong> that understand 
              context, research companies, and optimize your experience for each unique opportunity.
            </p>

            <div className={styles.sdkHighlights}>
              <div className={styles.sdkHighlight}>
                <span className={styles.highlightIcon}>🎯</span>
                <div>
                  <strong>Smart Matching</strong>
                  <p>AI analyzes job requirements and highlights relevant experience</p>
                </div>
              </div>
              <div className={styles.sdkHighlight}>
                <span className={styles.highlightIcon}>🔍</span>
                <div>
                  <strong>Company Research</strong>
                  <p>Agents research company culture to personalize your resume</p>
                </div>
              </div>
              <div className={styles.sdkHighlight}>
                <span className={styles.highlightIcon}>✨</span>
                <div>
                  <strong>Instant Results</strong>
                  <p>Get a tailored PDF resume in seconds, not hours</p>
                </div>
              </div>
            </div>
          </div>

          <div className={`${styles.sdkVisual} ${sdkVisible ? styles.visible : ''}`}>
            <div className={styles.codeBlock}>
              <div className={styles.codeHeader}>
                <span className={styles.codeDot} />
                <span className={styles.codeDot} />
                <span className={styles.codeDot} />
                <span className={styles.codeFilename}>tailoring-agent.ts</span>
              </div>
              <pre className={styles.codeContent}>
{`// AI Agent analyzing your resume
const agent = new SubconsciousAgent({
  task: "tailor_resume",
  context: jobDescription
});

// Research company & optimize content
await agent.research(company);
const tailored = await agent.optimize({
  experience: userProfile.experience,
  skills: userProfile.skills,
  matchThreshold: 0.85
});

// Generate ATS-friendly PDF
return agent.generatePDF(tailored);`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features}>
        <div className={styles.featuresContent}>
          <div className={styles.sectionHeader}>
            <p className={styles.sectionTagline}>FEATURES</p>
            <h2 className={styles.sectionTitle}>
              Everything You Need to <span className={styles.sectionTitleAccent}>Stand Out</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              Our AI-powered platform gives you an unfair advantage in the job market.
            </p>
          </div>

          <div className={styles.featureGrid}>
            <div
              ref={(el) => { featureRefs.current[0] = el }}
              className={`${styles.featureCard} ${featuresVisible[0] ? styles.visible : ''}`}
            >
              <div className={styles.featureIcon}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                  <path d="M16 13H8M16 17H8M10 9H8" />
                </svg>
              </div>
              <h3 className={styles.featureTitle}>Smart Resume Parsing</h3>
              <p className={styles.featureDesc}>
                Upload your existing resume and our AI extracts all your experience, skills, 
                and achievements into a structured profile.
              </p>
            </div>

            <div
              ref={(el) => { featureRefs.current[1] = el }}
              className={`${styles.featureCard} ${featuresVisible[1] ? styles.visible : ''}`}
            >
              <div className={styles.featureIcon}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <h3 className={styles.featureTitle}>Job Analysis</h3>
              <p className={styles.featureDesc}>
                Paste any job posting URL or description. Our agents extract requirements, 
                keywords, and cultural signals automatically.
              </p>
            </div>

            <div
              ref={(el) => { featureRefs.current[2] = el }}
              className={`${styles.featureCard} ${featuresVisible[2] ? styles.visible : ''}`}
            >
              <div className={styles.featureIcon}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
              <h3 className={styles.featureTitle}>AI Tailoring</h3>
              <p className={styles.featureDesc}>
                Watch as AI agents rewrite bullet points, reorder sections, and optimize 
                keywords to maximize your match score.
              </p>
            </div>

            <div
              ref={(el) => { featureRefs.current[3] = el }}
              className={`${styles.featureCard} ${featuresVisible[3] ? styles.visible : ''}`}
            >
              <div className={styles.featureIcon}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              <h3 className={styles.featureTitle}>Instant PDF Export</h3>
              <p className={styles.featureDesc}>
                Download your tailored resume as a professionally formatted, ATS-friendly 
                PDF ready to submit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.cta}>
        <div className={styles.ctaBackground}>
          <div className={styles.ctaOrb1} />
          <div className={styles.ctaOrb2} />
        </div>

        <div ref={ctaRef} className={`${styles.ctaContent} ${ctaVisible ? styles.visible : ''}`}>
          <div className={styles.ctaIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-orange)" strokeWidth="1.5">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </div>
          <h2 className={styles.ctaTitle}>Ready to Land Your Dream Job?</h2>
          <p className={styles.ctaSubtitle}>
            Start tailoring your resume with AI and get more interviews.
          </p>
          <div className={styles.ctaActions}>
            <Link href="/tailor" className={styles.ctaButtonPrimary}>
              Start Tailoring Now
              <svg className={styles.ctaArrow} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <Link href="/dashboard" className={styles.ctaButtonSecondary}>
              View Dashboard
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
              width={140}
              height={26}
              style={{ objectFit: 'contain' }}
            />
            <p className={styles.footerDesc}>
              AI-powered resume tailoring to help you land your dream job faster.
            </p>
          </div>

          <div className={styles.footerLinks}>
            <div className={styles.footerCol}>
              <h4 className={styles.footerColTitle}>Product</h4>
              <Link href="/tailor">Tailor Resume</Link>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/dashboard/history">History</Link>
            </div>
            <div className={styles.footerCol}>
              <h4 className={styles.footerColTitle}>Resources</h4>
              <a href="https://docs.subconscious.dev" target="_blank" rel="noopener noreferrer">Documentation</a>
              <a href="https://subconscious.dev" target="_blank" rel="noopener noreferrer">Subconscious</a>
            </div>
            <div className={styles.footerCol}>
              <h4 className={styles.footerColTitle}>Company</h4>
              <a href="https://subconscious.dev" target="_blank" rel="noopener noreferrer">About</a>
              <a href="mailto:hello@subconscious.dev">Contact</a>
            </div>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>&copy; {new Date().getFullYear()} Subconscious. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
