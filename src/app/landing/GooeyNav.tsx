'use client'

import { useRef, useEffect, useState } from 'react'
import './GooeyNav.css'

interface GooeyNavItem {
  label: string
  href: string
}

interface GooeyNavProps {
  items: GooeyNavItem[]
  animationTime?: number
  particleCount?: number
  particleDistances?: [number, number]
  particleR?: number
  timeVariance?: number
  colors?: number[]
  initialActiveIndex?: number
}

export default function GooeyNav({
  items,
  animationTime = 600,
  particleCount = 15,
  particleDistances = [90, 10],
  particleR = 100,
  timeVariance = 300,
  colors = [1, 2, 3, 1, 2, 3, 1, 4],
  initialActiveIndex = 0,
}: GooeyNavProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLUListElement>(null)
  const filterRef = useRef<HTMLSpanElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [activeIndex, setActiveIndex] = useState(initialActiveIndex)
  const justClickedRef = useRef(false)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const noise = (n: number = 1) => n / 2 - Math.random() * n

  const getXY = (distance: number, pointIndex: number, totalPoints: number): [number, number] => {
    const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180)
    return [distance * Math.cos(angle), distance * Math.sin(angle)]
  }

  const createParticle = (i: number, t: number, d: [number, number], r: number) => {
    const rotate = noise(r / 10)
    return {
      start: getXY(d[0], particleCount - i, particleCount),
      end: getXY(d[1] + noise(7), particleCount - i, particleCount),
      time: t,
      scale: 1 + noise(0.2),
      color: colors[Math.floor(Math.random() * colors.length)],
      rotate: rotate > 0 ? (rotate + r / 20) * 10 : (rotate - r / 20) * 10,
    }
  }

  const makeParticles = (element: HTMLSpanElement) => {
    const bubbleTime = animationTime * 2 + timeVariance
    element.style.setProperty('--time', `${bubbleTime}ms`)
    element.classList.remove('active')

    for (let i = 0; i < particleCount; i++) {
      const t = animationTime * 2 + noise(timeVariance * 2)
      const p = createParticle(i, t, particleDistances, particleR)

      setTimeout(() => {
        const particle = document.createElement('span')
        const point = document.createElement('span')
        particle.classList.add('particle')
        particle.style.setProperty('--start-x', `${p.start[0]}px`)
        particle.style.setProperty('--start-y', `${p.start[1]}px`)
        particle.style.setProperty('--end-x', `${p.end[0]}px`)
        particle.style.setProperty('--end-y', `${p.end[1]}px`)
        particle.style.setProperty('--time', `${p.time}ms`)
        particle.style.setProperty('--scale', `${p.scale}`)
        particle.style.setProperty('--color', `var(--gooey-color-${p.color})`)
        particle.style.setProperty('--rotate', `${p.rotate}deg`)
        point.classList.add('point')
        particle.appendChild(point)
        element.appendChild(particle)
        requestAnimationFrame(() => element.classList.add('active'))
        setTimeout(() => {
          try { element.removeChild(particle) } catch { /* already removed */ }
        }, t)
      }, 30)
    }
  }

  const updateEffectPosition = (el: HTMLLIElement) => {
    if (!containerRef.current || !filterRef.current || !textRef.current) return
    const cr = containerRef.current.getBoundingClientRect()
    const pr = el.getBoundingClientRect()
    const styles = {
      left: `${pr.x - cr.x}px`,
      top: `${pr.y - cr.y}px`,
      width: `${pr.width}px`,
      height: `${pr.height}px`,
    }
    Object.assign(filterRef.current.style, styles)
    Object.assign(textRef.current.style, styles)
    textRef.current.innerText = el.innerText
  }

  const clearActive = () => {
    setActiveIndex(-1)
    if (filterRef.current) {
      filterRef.current.classList.remove('active')
      filterRef.current.style.width = '0'
      filterRef.current.style.height = '0'
    }
    if (textRef.current) {
      textRef.current.classList.remove('active')
      textRef.current.style.width = '0'
      textRef.current.style.height = '0'
      textRef.current.innerText = ''
    }
  }

  const activate = (liEl: HTMLLIElement, index: number) => {
    if (activeIndex === index) return
    setActiveIndex(index)
    updateEffectPosition(liEl)
    if (filterRef.current) {
      filterRef.current.querySelectorAll('.particle').forEach(p => filterRef.current!.removeChild(p))
      makeParticles(filterRef.current)
    }
    if (textRef.current) {
      textRef.current.classList.remove('active')
      void textRef.current.offsetWidth
      textRef.current.classList.add('active')
    }

    // Ignore scroll events for 900ms after click so the anchor-scroll doesn't
    // immediately clear the highlight the user just triggered.
    justClickedRef.current = true
    clearTimeout(clickTimerRef.current)
    clickTimerRef.current = setTimeout(() => {
      justClickedRef.current = false
    }, 900)
  }

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, index: number) => {
    activate(e.currentTarget.parentElement as HTMLLIElement, index)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLAnchorElement>, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      activate(e.currentTarget.parentElement as HTMLLIElement, index)
    }
  }

  // Clear highlight on user scroll (but not during the anchor-scroll after click)
  useEffect(() => {
    const onScroll = () => {
      if (justClickedRef.current) return
      clearActive()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!navRef.current || !containerRef.current) return
    const activeLi = navRef.current.querySelectorAll('li')[activeIndex] as HTMLLIElement
    if (activeLi) {
      updateEffectPosition(activeLi)
      textRef.current?.classList.add('active')
    }
    const ro = new ResizeObserver(() => {
      const li = navRef.current?.querySelectorAll('li')[activeIndex] as HTMLLIElement
      if (li) updateEffectPosition(li)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex])

  return (
    <div className="gooey-nav-container" ref={containerRef}>
      <nav>
        <ul ref={navRef}>
          {items.map((item, index) => (
            <li key={index} className={activeIndex === index ? 'active' : ''}>
              <a
                href={item.href}
                onClick={e => handleClick(e, index)}
                onKeyDown={e => handleKeyDown(e, index)}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <span className="effect filter" ref={filterRef} />
      <span className="effect text" ref={textRef} />
    </div>
  )
}
