import { useMemo, useRef, useEffect, useState } from 'react'

// ── Fixed virtual coordinate space used by the SVG viewBox ──────────────
const VW = 800
const VH = 400

interface SimNode {
  id: string
  label: string
  group: 0 | 1 | 2   // 0=root  1=evidence  2=ioc
  severity?: string
  x: number; y: number
  vx: number; vy: number
  r: number
}

interface Props {
  suspiciousStrings: { value: string; severity?: string }[]
  evidence: { finding: string; source: string }[]
}

const SEV_COLOR: Record<string, string> = {
  critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#3b82f6',
}

function trunc(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

function initNodes(
  evidence: Props['evidence'],
  strings: Props['suspiciousStrings'],
): SimNode[] {
  const cx = VW / 2, cy = VH / 2
  const ns: SimNode[] = [
    { id: 'root', label: 'Malware Sample', group: 0, x: cx, y: cy, vx: 0, vy: 0, r: 20 },
  ]
  evidence.slice(0, 9).forEach((e, i) => {
    const a = (i / Math.max(evidence.length, 1)) * Math.PI * 2
    ns.push({ id: `ev-${i}`, label: trunc(e.finding, 30), group: 1,
      x: cx + Math.cos(a) * 120 + (Math.random() - .5) * 18,
      y: cy + Math.sin(a) * 120 + (Math.random() - .5) * 18,
      vx: 0, vy: 0, r: 10 })
  })
  strings.slice(0, 10).forEach((s, i) => {
    const a = (i / Math.max(strings.length, 1)) * Math.PI * 2 + 0.35
    ns.push({ id: `ioc-${i}`, label: trunc(s.value, 25), group: 2, severity: s.severity,
      x: cx + Math.cos(a) * 205 + (Math.random() - .5) * 28,
      y: cy + Math.sin(a) * 205 + (Math.random() - .5) * 28,
      vx: 0, vy: 0, r: 7 })
  })
  return ns
}

export default function ThreatGraph({ suspiciousStrings, evidence }: Props) {
  const svgRef   = useRef<SVGSVGElement>(null)
  const nodesRef = useRef<SimNode[]>([])
  const animRef  = useRef<number>()
  const dragRef  = useRef<{ id: string; ox: number; oy: number } | null>(null)
  const coolRef  = useRef(0)

  // ── Build links (stable unless props change) ─────────────────────────────
  const links = useMemo(() => {
    const l: { src: string; tgt: string }[] = []
    evidence.slice(0, 9).forEach((_, i) => l.push({ src: 'root', tgt: `ev-${i}` }))
    suspiciousStrings.slice(0, 10).forEach((_, i) => l.push({ src: 'root', tgt: `ioc-${i}` }))
    return l
  }, [evidence, suspiciousStrings])

  // ── React state drives SVG — initialized immediately, never blank ────────
  const [nodes, setNodes] = useState<SimNode[]>(() => initNodes(evidence, suspiciousStrings))
  const [hovered, setHovered] = useState<string | null>(null)

  // Rebuild when props change
  useEffect(() => {
    const fresh = initNodes(evidence, suspiciousStrings)
    nodesRef.current = fresh
    coolRef.current = 260
    setNodes([...fresh])
  }, [evidence, suspiciousStrings])

  // ── Force simulation — no dependency on container dims ───────────────────
  useEffect(() => {
    let alive = true
    nodesRef.current = initNodes(evidence, suspiciousStrings)
    coolRef.current = 260

    const step = () => {
      if (!alive) return
      const ns = nodesRef.current
      if (!ns.length) { animRef.current = requestAnimationFrame(step); return }

      // Repulsion
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const dx = ns[j].x - ns[i].x, dy = ns[j].y - ns[i].y
          const d = Math.sqrt(dx * dx + dy * dy) || 1
          const min = ns[i].r + ns[j].r + 52
          if (d < min) {
            const f = (min - d) / d * 0.22
            const di = dragRef.current?.id
            if (di !== ns[i].id) { ns[i].vx -= dx * f; ns[i].vy -= dy * f }
            if (di !== ns[j].id) { ns[j].vx += dx * f; ns[j].vy += dy * f }
          }
        }
      }

      // Springs
      links.forEach(({ src, tgt }) => {
        const s = ns.find(n => n.id === src), t = ns.find(n => n.id === tgt)
        if (!s || !t) return
        const dx = t.x - s.x, dy = t.y - s.y
        const d = Math.sqrt(dx * dx + dy * dy) || 1
        const ideal = t.group === 1 ? 130 : 208
        const f = (d - ideal) / d * 0.04
        const di = dragRef.current?.id
        if (di !== s.id) { s.vx += dx * f; s.vy += dy * f }
        if (di !== t.id) { t.vx -= dx * f; t.vy -= dy * f }
      })

      // Center gravity + damping + bounds
      let mv = 0
      ns.forEach(n => {
        if (dragRef.current?.id === n.id) return
        n.vx += (VW / 2 - n.x) * 0.0022
        n.vy += (VH / 2 - n.y) * 0.0022
        n.vx *= 0.83; n.vy *= 0.83
        n.x = Math.max(n.r + 4, Math.min(VW - n.r - 4, n.x + n.vx))
        n.y = Math.max(n.r + 4, Math.min(VH - n.r - 4, n.y + n.vy))
        mv = Math.max(mv, Math.abs(n.vx), Math.abs(n.vy))
      })

      if (coolRef.current > 0) coolRef.current--
      if (coolRef.current > 0 || dragRef.current || mv > 0.06) {
        setNodes([...ns])   // spread creates new array → triggers React re-render
      }
      animRef.current = requestAnimationFrame(step)
    }

    animRef.current = requestAnimationFrame(step)
    return () => {
      alive = false
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [links]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── SVG coordinate helper — accounts for viewBox scaling ─────────────────
  function svgPt(clientX: number, clientY: number) {
    const svg = svgRef.current!
    const pt  = svg.createSVGPoint()
    pt.x = clientX; pt.y = clientY
    return pt.matrixTransform(svg.getScreenCTM()!.inverse())
  }

  // ── Drag ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current || !svgRef.current) return
      const p = svgPt(e.clientX, e.clientY)
      const n = nodesRef.current.find(n => n.id === dragRef.current!.id)
      if (n) { n.x = p.x - dragRef.current.ox; n.y = p.y - dragRef.current.oy; n.vx = 0; n.vy = 0 }
    }
    const onUp = () => { if (dragRef.current) coolRef.current = 80; dragRef.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ────────────────────────────────────────────────────────────────
  const hNode = hovered ? nodes.find(n => n.id === hovered) : null

  return (
    <div
      className="w-full bg-[#020617] rounded-xl border border-[#1E293B] overflow-hidden relative select-none"
      style={{ height: 420 }}
    >
      {/* Overlay labels */}
      <div className="absolute top-2.5 left-3 text-[10px] font-mono text-[#334155] z-10 pointer-events-none uppercase tracking-widest">
        Interactive Threat Graph · Drag to Explore
      </div>
      <div className="absolute top-2.5 right-3 flex items-center gap-3 z-10 pointer-events-none">
        {([['#22d3ee', 'Sample'], ['#a855f7', 'Evidence'], ['#f97316', 'IOCs']] as const).map(([c, l]) => (
          <div key={l} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: c }} />
            <span className="text-[9px] font-mono text-[#475569]">{l}</span>
          </div>
        ))}
      </div>

      {/*
        viewBox keeps coordinates in the fixed 800×400 virtual space.
        SVG scales to fill the container on every screen size and DPI —
        no ResizeObserver needed, no canvas pixel-density mismatch on Mac.
      */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        height="100%"
        className="absolute inset-0"
      >
        <defs>
          <radialGradient id="tg-gr" cx="38%" cy="32%">
            <stop offset="0%"   stopColor="#67e8f9" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity="0.7"  />
          </radialGradient>
          <radialGradient id="tg-ge" cx="38%" cy="32%">
            <stop offset="0%"   stopColor="#c084fc" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.7"  />
          </radialGradient>
          <radialGradient id="tg-gi" cx="38%" cy="32%">
            <stop offset="0%"   stopColor="#fb923c" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#c2410c" stopOpacity="0.7"  />
          </radialGradient>
          <filter id="tg-fc" x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur stdDeviation="5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="tg-fe" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="tg-fi" x="-55%" y="-55%" width="210%" height="210%">
            <feGaussianBlur stdDeviation="2.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Links */}
        {links.map(({ src, tgt }, i) => {
          const s = nodes.find(n => n.id === src), t = nodes.find(n => n.id === tgt)
          if (!s || !t) return null
          return (
            <line key={i}
              x1={s.x} y1={s.y} x2={t.x} y2={t.y}
              stroke={t.group === 1 ? '#7c3aed' : '#9a3412'}
              strokeWidth={t.group === 1 ? 1.2 : 0.8}
              strokeOpacity={0.35}
            />
          )
        })}

        {/* Nodes */}
        {nodes.map(node => {
          const isRoot = node.group === 0
          const isEv   = node.group === 1
          const isHov  = hovered === node.id
          const sc     = node.severity ? SEV_COLOR[node.severity] ?? '#f97316' : '#fb923c'
          const stroke = isRoot ? '#22d3ee' : isEv ? '#a855f7' : sc
          const lc     = isRoot ? '#67e8f9' : isEv ? '#c084fc' : sc
          const fill   = `url(#${isRoot ? 'tg-gr' : isEv ? 'tg-ge' : 'tg-gi'})`
          const filter = `url(#${isRoot ? 'tg-fc' : isEv ? 'tg-fe' : 'tg-fi'})`

          return (
            <g
              key={node.id}
              transform={`translate(${node.x.toFixed(1)},${node.y.toFixed(1)})`}
              style={{ cursor: 'grab' }}
              onMouseDown={e => {
                e.preventDefault()
                const p = svgPt(e.clientX, e.clientY)
                dragRef.current = { id: node.id, ox: p.x - node.x, oy: p.y - node.y }
                coolRef.current = 120
              }}
              onMouseEnter={() => setHovered(node.id)}
              onMouseLeave={() => setHovered(h => h === node.id ? null : h)}
            >
              {isHov && (
                <circle r={node.r + 9} fill="none" stroke={stroke} strokeWidth={1} strokeOpacity={0.22} />
              )}
              <circle r={node.r + 3} fill="none" stroke={stroke}
                strokeWidth={isHov ? 1 : 0.4}
                strokeOpacity={isHov ? 0.5 : 0.14}
              />
              <circle r={node.r} fill={fill} filter={filter} />

              {isRoot && (
                <>
                  <line x1={-8} y1={0} x2={8} y2={0} stroke="#0e7490" strokeWidth={1.5} />
                  <line x1={0} y1={-8} x2={0} y2={8} stroke="#0e7490" strokeWidth={1.5} />
                  <circle r={5} fill="none" stroke="#0e7490" strokeWidth={1} />
                </>
              )}

              <text
                y={node.r + 14}
                textAnchor="middle"
                fontSize={isRoot ? 10 : 9}
                fontFamily="monospace"
                fill={lc}
                fillOpacity={isRoot ? 1 : isHov ? 1 : 0.75}
                style={{ pointerEvents: 'none' }}
              >
                {node.label}
              </text>
            </g>
          )
        })}

        {/* Tooltip rendered inside SVG — scales with viewBox, always correct */}
        {hNode && hNode.group !== 0 && (() => {
          const tx = Math.min(hNode.x + 16, VW - 160)
          const ty = Math.max(hNode.y - 36, 2)
          const bc = hNode.group === 1 ? '#7c3aed' : (hNode.severity ? SEV_COLOR[hNode.severity] : '#f97316')
          const lc = hNode.group === 1 ? '#c084fc' : (hNode.severity ? SEV_COLOR[hNode.severity] : '#f97316')
          const tag = hNode.group === 1 ? 'Evidence' : `IOC · ${hNode.severity ?? '?'}`
          return (
            <g style={{ pointerEvents: 'none' }}>
              <rect x={tx} y={ty} width={150} height={40} rx={5}
                fill="#020617" fillOpacity={0.97} stroke={bc} strokeWidth={0.5} strokeOpacity={0.45}
              />
              <text x={tx + 8} y={ty + 14} fontSize={7.5} fontFamily="monospace" fill={lc} fontWeight="bold">
                {tag}
              </text>
              <text x={tx + 8} y={ty + 27} fontSize={8} fontFamily="monospace" fill="#94a3b8">
                {hNode.label.length > 20 ? hNode.label.slice(0, 19) + '…' : hNode.label}
              </text>
            </g>
          )
        })()}
      </svg>
    </div>
  )
}
