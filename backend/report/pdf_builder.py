import io
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas as pdfcanvas

W, H = A4

# ── Palette ───────────────────────────────────────────────────────────────────
C_BG        = colors.HexColor("#020617")   # near-black
C_PANEL     = colors.HexColor("#0F172A")   # dark panel
C_BORDER    = colors.HexColor("#1E293B")   # subtle border
C_GREEN     = colors.HexColor("#22C55E")   # neon green (logo F, accents)
C_GREEN_DIM = colors.HexColor("#166534")   # darker green for header bg
C_WHITE     = colors.white
C_SLATE     = colors.HexColor("#94A3B8")
C_MUTED     = colors.HexColor("#64748B")
C_BODY      = colors.HexColor("#1E293B")   # body text on white pages

SEV = {
    "critical": colors.HexColor("#EF4444"),
    "high":     colors.HexColor("#F97316"),
    "medium":   colors.HexColor("#EAB308"),
    "low":      colors.HexColor("#3B82F6"),
}
SEV_BG = {
    "critical": colors.HexColor("#FEF2F2"),
    "high":     colors.HexColor("#FFF7ED"),
    "medium":   colors.HexColor("#FEFCE8"),
    "low":      colors.HexColor("#EFF6FF"),
}


# ── Styles ────────────────────────────────────────────────────────────────────
def _styles():
    return {
        "cover_brand":   ParagraphStyle("cover_brand",   fontName="Helvetica-Bold", fontSize=42,
                                        textColor=C_GREEN,  alignment=TA_CENTER, spaceAfter=0),
        "cover_sub":     ParagraphStyle("cover_sub",     fontName="Helvetica",      fontSize=13,
                                        textColor=C_SLATE,  alignment=TA_CENTER, spaceAfter=0),
        "cover_label":   ParagraphStyle("cover_label",   fontName="Helvetica-Bold", fontSize=8,
                                        textColor=C_GREEN,  alignment=TA_LEFT,   spaceAfter=2, leading=12),
        "cover_value":   ParagraphStyle("cover_value",   fontName="Helvetica",      fontSize=9,
                                        textColor=C_WHITE,  alignment=TA_LEFT,   spaceAfter=0, leading=13),
        "section":       ParagraphStyle("section",       fontName="Helvetica-Bold", fontSize=11,
                                        textColor=C_PANEL,  spaceAfter=4, spaceBefore=8),
        "body":          ParagraphStyle("body",          fontName="Helvetica",      fontSize=9,
                                        textColor=C_BODY,   leading=14),
        "body_white":    ParagraphStyle("body_white",    fontName="Helvetica",      fontSize=9,
                                        textColor=C_WHITE,  leading=14),
        "muted":         ParagraphStyle("muted",         fontName="Helvetica",      fontSize=8,
                                        textColor=C_MUTED,  leading=12),
        "mono":          ParagraphStyle("mono",          fontName="Courier",        fontSize=7.5,
                                        textColor=C_BODY,   leading=11),
        "mono_white":    ParagraphStyle("mono_white",    fontName="Courier",        fontSize=7.5,
                                        textColor=C_WHITE,  leading=11),
        "th":            ParagraphStyle("th",            fontName="Helvetica-Bold", fontSize=8,
                                        textColor=C_WHITE,  leading=11),
        "td":            ParagraphStyle("td",            fontName="Helvetica",      fontSize=8,
                                        textColor=C_BODY,   leading=11),
        "td_mono":       ParagraphStyle("td_mono",       fontName="Courier",        fontSize=7.5,
                                        textColor=C_BODY,   leading=11),
        "sev_label":     ParagraphStyle("sev_label",     fontName="Helvetica-Bold", fontSize=7.5,
                                        alignment=TA_CENTER, leading=10),
        "confidence":    ParagraphStyle("confidence",    fontName="Helvetica-Bold", fontSize=8,
                                        textColor=C_GREEN,  alignment=TA_RIGHT, leading=11),
    }


# ── Canvas callbacks ───────────────────────────────────────────────────────────
def _draw_cover(c: pdfcanvas.Canvas, doc):
    """Full dark cover page with logo, title, metadata panel."""
    c.saveState()

    # Full background
    c.setFillColor(C_BG)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    # Top accent strip
    c.setFillColor(C_GREEN)
    c.rect(0, H - 0.35*cm, W, 0.35*cm, fill=1, stroke=0)

    # Bottom accent strip
    c.rect(0, 0, W, 0.25*cm, fill=1, stroke=0)

    # ── Logo box ────────────────────────────────────────────────────────────────
    lx, ly, lsize = W/2 - 1.5*cm, H - 7*cm, 3*cm
    r = 0.4*cm
    # Rounded rect background
    c.setFillColor(C_PANEL)
    c.setStrokeColor(C_GREEN)
    c.setLineWidth(1.5)
    c.roundRect(lx, ly, lsize, lsize, r, fill=1, stroke=1)
    # "F" in green
    c.setFillColor(C_GREEN)
    c.setFont("Helvetica-Bold", 34)
    c.drawString(lx + 0.32*cm, ly + 0.65*cm, "F")
    # "X" in white
    c.setFillColor(C_WHITE)
    c.drawString(lx + 1.45*cm, ly + 0.65*cm, "X")

    # ── Brand name ──────────────────────────────────────────────────────────────
    c.setFont("Helvetica-Bold", 38)
    # "Forens" in green
    c.setFillColor(C_GREEN)
    c.drawCentredString(W/2 - 0.55*cm, H - 9.2*cm, "Forens")
    # "iX" in white — offset to align
    c.setFillColor(C_WHITE)
    name_w = c.stringWidth("Forens", "Helvetica-Bold", 38)
    x_off  = c.stringWidth("iX",     "Helvetica-Bold", 38)
    c.drawString(W/2 - 0.55*cm + name_w, H - 9.2*cm, "iX")

    # Tagline
    c.setFont("Helvetica", 11)
    c.setFillColor(C_SLATE)
    c.drawCentredString(W/2, H - 10.1*cm, "Autonomous Forensic Analysis Report")

    # Divider line
    c.setStrokeColor(C_GREEN)
    c.setLineWidth(1)
    c.line(2*cm, H - 10.7*cm, W - 2*cm, H - 10.7*cm)

    # ── Metadata panel ──────────────────────────────────────────────────────────
    px, py, pw, ph = 2*cm, H - 17.5*cm, W - 4*cm, 5.8*cm
    c.setFillColor(C_PANEL)
    c.setStrokeColor(C_BORDER)
    c.setLineWidth(0.5)
    c.roundRect(px, py, pw, ph, 0.3*cm, fill=1, stroke=1)

    # Green left accent bar on panel
    c.setFillColor(C_GREEN)
    c.roundRect(px, py, 0.25*cm, ph, 0.1*cm, fill=1, stroke=0)

    meta = [
        ("CASE ID",        doc._job.job_id),
        ("ARTIFACT",       doc._job.filename),
        ("FILE TYPE",      doc._job.file_type.value.upper().replace("_", " ") if doc._job.file_type else "UNKNOWN"),
        ("ANALYSIS DATE",  datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")),
        ("STATUS",         doc._job.status.value.upper()),
        ("AI ENGINE",      doc._job_ai_mode),
    ]
    row_h = ph / (len(meta) + 0.5)
    for i, (label, value) in enumerate(meta):
        row_y = py + ph - (i + 1) * row_h
        c.setFont("Helvetica-Bold", 7)
        c.setFillColor(C_GREEN)
        c.drawString(px + 0.6*cm, row_y + 3, label)
        c.setFont("Helvetica", 8.5)
        c.setFillColor(C_WHITE)
        # Truncate long values
        disp = value if len(value) < 55 else value[:52] + "..."
        c.drawString(px + 4.2*cm, row_y + 3, disp)

    # Horizontal rules between rows
    c.setStrokeColor(C_BORDER)
    c.setLineWidth(0.3)
    for i in range(1, len(meta)):
        ry = py + ph - i * row_h
        c.line(px + 0.5*cm, ry, px + pw - 0.3*cm, ry)

    # ── Classification badge ─────────────────────────────────────────────────
    bw, bh = 4*cm, 0.65*cm
    bx = W/2 - bw/2
    by = py - 1.2*cm
    c.setFillColor(C_GREEN_DIM)
    c.roundRect(bx, by, bw, bh, 0.2*cm, fill=1, stroke=0)
    c.setFillColor(C_GREEN)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(W/2, by + 0.2*cm, "⚠  CONFIDENTIAL — FOR AUTHORIZED USE ONLY")

    c.restoreState()


def _draw_page(c: pdfcanvas.Canvas, doc):
    """Header + footer for content pages."""
    c.saveState()

    # Header bar
    c.setFillColor(C_PANEL)
    c.rect(0, H - 1.2*cm, W, 1.2*cm, fill=1, stroke=0)
    c.setFillColor(C_GREEN)
    c.rect(0, H - 1.2*cm, 0.4*cm, 1.2*cm, fill=1, stroke=0)

    # Logo text in header
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(C_GREEN)
    c.drawString(0.8*cm, H - 0.82*cm, "Forens")
    offset = c.stringWidth("Forens", "Helvetica-Bold", 10)
    c.setFillColor(C_WHITE)
    c.drawString(0.8*cm + offset, H - 0.82*cm, "iX")

    c.setFont("Helvetica", 8)
    c.setFillColor(C_SLATE)
    c.drawRightString(W - 1.5*cm, H - 0.82*cm, "Autonomous Forensic Report")

    # Footer
    c.setFillColor(C_BORDER)
    c.rect(0, 0, W, 0.7*cm, fill=1, stroke=0)
    c.setFont("Helvetica", 7)
    c.setFillColor(C_MUTED)
    c.drawString(1.5*cm, 0.22*cm, "ForensiX — Confidential Forensic Report")
    c.drawRightString(W - 1.5*cm, 0.22*cm, f"Page {doc.page}")

    c.restoreState()


# ── Section header helper ─────────────────────────────────────────────────────
def _section_block(title: str, st: dict) -> list:
    label_row = Table(
        [[Paragraph(title.upper(), st["section"])]],
        colWidths=[W - 4*cm],
    )
    label_row.setStyle(TableStyle([
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LINEABOVE",     (0, 0), (-1, 0), 2, C_GREEN),
        ("BACKGROUND",    (0, 0), (-1, -1), colors.HexColor("#F0FDF4")),
        ("LINEBEFORE",    (0, 0), (0, -1), 4, C_GREEN),
    ]))
    return [label_row, Spacer(1, 0.25*cm)]


# ── Confidence bar ────────────────────────────────────────────────────────────
def _conf_bar(pct: int) -> Table:
    filled = max(1, int(pct / 10))
    empty  = 10 - filled
    bar_color = C_GREEN if pct >= 80 else (SEV["medium"] if pct >= 50 else SEV["high"])
    bar = "█" * filled + "░" * empty
    cell = Paragraph(f'<font color="#22C55E">{bar[:filled]}</font>'
                     f'<font color="#334155">{"░" * empty}</font>'
                     f'  <b>{pct}%</b>', ParagraphStyle(
                         "bar", fontName="Courier", fontSize=7.5,
                         textColor=C_BODY, leading=10))
    t = Table([[cell]], colWidths=[4*cm])
    t.setStyle(TableStyle([("LEFTPADDING", (0,0),(-1,-1), 0), ("TOPPADDING",(0,0),(-1,-1),0),
                            ("BOTTOMPADDING",(0,0),(-1,-1),0), ("RIGHTPADDING",(0,0),(-1,-1),0)]))
    return t


# ── Main builder ──────────────────────────────────────────────────────────────
def build_pdf(job, ai_mode: str = "claude") -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=1.8*cm, bottomMargin=1.5*cm,
    )
    # Attach job to doc so canvas callbacks can read it
    doc._job = job
    doc._job_ai_mode = ai_mode

    st = _styles()
    story = []

    # ── Cover page ──────────────────────────────────────────────────────────────
    story.append(_CoverPage())
    story.append(PageBreak())

    c = job.correlation

    # ── Executive Summary ───────────────────────────────────────────────────────
    story += _section_block("Executive Summary", st)
    text = (c.summary or c.hypothesis) if c else "No correlation results available."
    story.append(Paragraph(text, st["body"]))
    story.append(Spacer(1, 0.5*cm))

    # ── Attack Hypothesis ───────────────────────────────────────────────────────
    story += _section_block("Attack Hypothesis", st)
    hyp = c.hypothesis if c else "Unable to determine."
    # Hypothesis in a tinted box
    hyp_tbl = Table([[Paragraph(hyp, st["body"])]], colWidths=[W - 4*cm])
    hyp_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), colors.HexColor("#F0FDF4")),
        ("LINEBEFORE",    (0,0),(0,-1),  3, C_GREEN),
        ("LEFTPADDING",   (0,0),(-1,-1), 10),
        ("RIGHTPADDING",  (0,0),(-1,-1), 8),
        ("TOPPADDING",    (0,0),(-1,-1), 8),
        ("BOTTOMPADDING", (0,0),(-1,-1), 8),
        ("ROUNDEDCORNERS",(0,0),(-1,-1), [3,3,3,3]),
    ]))
    story.append(hyp_tbl)
    story.append(Spacer(1, 0.5*cm))

    # ── Incident Timeline ───────────────────────────────────────────────────────
    story += _section_block("Incident Timeline", st)
    if c and c.timeline:
        tdata = [[Paragraph("TIME", st["th"]), Paragraph("EVENT", st["th"])]]
        for i, e in enumerate(c.timeline):
            bg = colors.HexColor("#F8FAFC") if i % 2 == 0 else C_WHITE
            
            event_text = e.event
            if getattr(e, "mitre_tactic", None) and getattr(e, "mitre_technique", None):
                event_text += f'<br/><br/><font color="#0891B2" size="7"><b>[{e.mitre_technique}] {e.mitre_tactic.upper()}</b></font>'
                
            tdata.append([Paragraph(e.time, st["td_mono"]), Paragraph(event_text, st["td"])])
        tbl = Table(tdata, colWidths=[4*cm, W - 4*cm - 4*cm], repeatRows=1)
        tbl.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0), C_PANEL),
            ("ROWBACKGROUNDS",(0, 1), (-1,-1), [colors.HexColor("#F8FAFC"), C_WHITE]),
            ("GRID",          (0, 0), (-1,-1), 0.4, C_BORDER),
            ("VALIGN",        (0, 0), (-1,-1), "TOP"),
            ("LEFTPADDING",   (0, 0), (-1,-1), 6),
            ("RIGHTPADDING",  (0, 0), (-1,-1), 6),
            ("TOPPADDING",    (0, 0), (-1,-1), 5),
            ("BOTTOMPADDING", (0, 0), (-1,-1), 5),
        ]))
        story.append(tbl)
    else:
        story.append(Paragraph("No timeline events recorded.", st["muted"]))
    story.append(Spacer(1, 0.5*cm))

    # ── Evidence Table ──────────────────────────────────────────────────────────
    story += _section_block("Evidence Table", st)
    if c and c.evidence:
        edata = [[
            Paragraph("FINDING",    st["th"]),
            Paragraph("SOURCE",     st["th"]),
            Paragraph("CONFIDENCE", st["th"]),
        ]]
        for ev in c.evidence:
            edata.append([
                Paragraph(ev.finding, st["td"]),
                Paragraph(ev.source,  st["td_mono"]),
                _conf_bar(ev.confidence),
            ])
        etbl = Table(edata, colWidths=[8*cm, 3*cm, 4*cm], repeatRows=1)
        etbl.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0), C_PANEL),
            ("ROWBACKGROUNDS",(0, 1), (-1,-1), [colors.HexColor("#F8FAFC"), C_WHITE]),
            ("GRID",          (0, 0), (-1,-1), 0.4, C_BORDER),
            ("VALIGN",        (0, 0), (-1,-1), "TOP"),
            ("LEFTPADDING",   (0, 0), (-1,-1), 6),
            ("RIGHTPADDING",  (0, 0), (-1,-1), 6),
            ("TOPPADDING",    (0, 0), (-1,-1), 5),
            ("BOTTOMPADDING", (0, 0), (-1,-1), 5),
        ]))
        story.append(etbl)
    else:
        story.append(Paragraph("No evidence items recorded.", st["muted"]))
    story.append(Spacer(1, 0.5*cm))

    # ── Suspicious Strings ──────────────────────────────────────────────────────
    if c and c.suspicious_strings:
        story += _section_block("Suspicious Strings", st)
        sdata = [[
            Paragraph("STRING",      st["th"]),
            Paragraph("SEVERITY",    st["th"]),
            Paragraph("EXPLANATION", st["th"]),
        ]]
        for s in c.suspicious_strings:
            sev_key = s.severity.lower()
            sev_color = SEV.get(sev_key, C_MUTED)
            sev_bg    = SEV_BG.get(sev_key, C_WHITE)
            sev_cell = Paragraph(
                f'<b>{s.severity.upper()}</b>',
                ParagraphStyle("sev", fontName="Helvetica-Bold", fontSize=7.5,
                               textColor=sev_color, alignment=TA_CENTER, leading=10)
            )
            sdata.append([
                Paragraph(s.value,  st["td_mono"]),
                sev_cell,
                Paragraph(s.reason, st["td"]),
            ])
        stbl = Table(sdata, colWidths=[5*cm, 2.2*cm, W - 4*cm - 5*cm - 2.2*cm], repeatRows=1)
        base_style = [
            ("BACKGROUND",    (0, 0), (-1, 0), C_PANEL),
            ("ROWBACKGROUNDS",(0, 1), (-1,-1), [colors.HexColor("#F8FAFC"), C_WHITE]),
            ("GRID",          (0, 0), (-1,-1), 0.4, C_BORDER),
            ("VALIGN",        (0, 0), (-1,-1), "TOP"),
            ("LEFTPADDING",   (0, 0), (-1,-1), 6),
            ("RIGHTPADDING",  (0, 0), (-1,-1), 6),
            ("TOPPADDING",    (0, 0), (-1,-1), 5),
            ("BOTTOMPADDING", (0, 0), (-1,-1), 5),
        ]
        stbl.setStyle(TableStyle(base_style))
        # Per-row severity bg on severity column
        for i, s in enumerate(c.suspicious_strings, start=1):
            bg = SEV_BG.get(s.severity.lower(), C_WHITE)
            stbl.setStyle(TableStyle([("BACKGROUND", (1, i), (1, i), bg)]))
        story.append(stbl)
        story.append(Spacer(1, 0.5*cm))

    # ── Appendix ────────────────────────────────────────────────────────────────
    story.append(PageBreak())
    story += _section_block("Appendix — Tool Outputs", st)

    for output in job.tool_outputs:
        status_color = C_GREEN if output.success else SEV["high"]
        status_text  = "SUCCESS" if output.success else "FAILED"
        header = Table([[
            Paragraph(f'<b>{output.tool}</b>', st["body"]),
            Paragraph(f'<b><font color="{"#22C55E" if output.success else "#F97316"}">{status_text}</font></b>', st["body"]),
        ]], colWidths=[8*cm, W - 4*cm - 8*cm])
        header.setStyle(TableStyle([
            ("BACKGROUND",   (0,0),(-1,-1), colors.HexColor("#F8FAFC")),
            ("LINEBELOW",    (0,0),(-1,-1), 0.5, C_BORDER),
            ("LEFTPADDING",  (0,0),(-1,-1), 8),
            ("RIGHTPADDING", (0,0),(-1,-1), 8),
            ("TOPPADDING",   (0,0),(-1,-1), 4),
            ("BOTTOMPADDING",(0,0),(-1,-1), 4),
        ]))
        preview = _tool_preview(output)
        body = Table([[Paragraph(preview, st["mono"])]], colWidths=[W - 4*cm])
        body.setStyle(TableStyle([
            ("BACKGROUND",   (0,0),(-1,-1), C_WHITE),
            ("LINEBELOW",    (0,0),(-1,-1), 0.5, C_BORDER),
            ("LEFTPADDING",  (0,0),(-1,-1), 8),
            ("RIGHTPADDING", (0,0),(-1,-1), 8),
            ("TOPPADDING",   (0,0),(-1,-1), 4),
            ("BOTTOMPADDING",(0,0),(-1,-1), 6),
        ]))
        story.append(KeepTogether([header, body, Spacer(1, 0.2*cm)]))

    doc.build(story, onFirstPage=_draw_cover, onLaterPages=_draw_page)
    return buf.getvalue()


# ── Cover flowable ─────────────────────────────────────────────────────────────
from reportlab.platypus import Flowable

class _CoverPage(Flowable):
    """Blank placeholder — cover is drawn entirely by _draw_cover canvas callback."""
    def draw(self):
        pass
    def wrap(self, availWidth, availHeight):
        self.width  = availWidth
        self.height = availHeight
        return (availWidth, availHeight)


# ── Tool preview ───────────────────────────────────────────────────────────────
def _tool_preview(output) -> str:
    if not output.success:
        return f"Error: {output.error or 'unknown'}"
    d = output.data
    if output.tool == "strings":
        lines = d.get("strings", [])[:15]
        return "\n".join(lines) if lines else "(no strings)"
    if output.tool == "yara":
        matches = d.get("matches", [])
        if not matches:
            return "No YARA rule matches."
        return "\n".join(f"• {m.get('rule','?')}  —  {', '.join(m.get('tags',[]))}" for m in matches[:10])
    if output.tool == "vol_pslist":
        procs = d.get("processes", [])[:20]
        if not procs:
            return "(no processes)"
        return "\n".join(f"PID {p.get('pid','?'):>5}  PPID {p.get('ppid','?'):>5}  {p.get('name','?')}" for p in procs)
    if output.tool == "vol_netscan":
        conns = d.get("connections", [])[:15]
        if not conns:
            return "(no connections)"
        return "\n".join(f"{c.get('proto','?'):>4}  {c.get('local','?'):<22} → {c.get('remote','?')}" for c in conns)
    if output.tool == "vol_cmdline":
        cmds = d.get("cmdlines", [])[:10]
        if not cmds:
            return "(no command lines)"
        return "\n".join(f"PID {c.get('pid','?')}: {c.get('cmdline','')[:80]}" for c in cmds)
    if output.tool == "vol_imageinfo":
        banners = d.get("banners", [])
        return banners[0][:120] if banners else "(no image info)"
    if output.tool == "binwalk":
        carved = d.get("carved", [])
        return "\n".join(str(x)[:80] for x in carved[:10]) if carved else "(nothing carved)"
    return str(d)[:300]
