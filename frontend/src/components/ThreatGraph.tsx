import { useMemo } from 'react'
import ForceGraph2D from 'react-force-graph-2d'

interface Props {
  suspiciousStrings: any[]
  evidence: any[]
}

export default function ThreatGraph({ suspiciousStrings, evidence }: Props) {
  const data = useMemo(() => {
    const nodes: any[] = [{ id: 'Malware Sample', group: 0, val: 5 }]
    const links: any[] = []

    // Group 1: Evidence (Tools)
    evidence.forEach((e, i) => {
      const id = `ev-${i}`
      nodes.push({ id, name: e.finding, group: 1, val: 3 })
      links.push({ source: 'Malware Sample', target: id })
    })

    // Group 2: Strings
    suspiciousStrings.forEach((s, i) => {
      const id = `str-${i}`
      nodes.push({ id, name: s.value, group: 2, val: 2 })
      // connect to random evidence to simulate correlation, or back to root
      links.push({ source: 'Malware Sample', target: id })
    })

    return { nodes, links }
  }, [suspiciousStrings, evidence])

  return (
    <div className="w-full h-[400px] bg-[#020617] rounded-xl border border-[#1E293B] overflow-hidden flex items-center justify-center relative cursor-move">
      <div className="absolute top-2 left-2 text-[10px] font-mono text-[#64748B] z-10 pointer-events-none">
        INTERACTIVE THREAT GRAPH · DRAG TO EXPLORE
      </div>
      <ForceGraph2D
        graphData={data}
        width={800}
        height={400}
        backgroundColor="#020617"
        nodeAutoColorBy="group"
        nodeLabel="name"
        linkColor={() => '#1E293B'}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const label = node.name || node.id;
          const fontSize = 12 / globalScale;
          ctx.font = `${fontSize}px Fira Code`;
          ctx.fillStyle = node.color;
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.val + 2, 0, 2 * Math.PI, false);
          ctx.fill();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#F8FAFC';
          ctx.fillText(label, node.x, node.y + node.val + 6 + fontSize);
        }}
      />
    </div>
  )
}
