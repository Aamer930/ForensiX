import io
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT

W, H = A4
ACCENT = colors.HexColor("#00C9A7")
DARK = colors.HexColor("#0D1117")
LIGHT_GRAY = colors.HexColor("#F4F6F8")
MID_GRAY = colors.HexColor("#6B7280")


def build_pdf(job) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm,
    )
    styles = _make_styles()
    story = []

    # Cover
    story += _cover(job, styles)
    story.append(PageBreak())

    # Executive Summary
    story += _section("Executive Summary", styles)
    if job.correlation:
        story.append(Paragraph(job.correlation.summary or job.correlation.hypothesis, styles["body"]))
    else:
        story.append(Paragraph("No correlation results available.", styles["body"]))
    story.append(Spacer(1, 0.5*cm))

    # Attack Hypothesis
    story += _section("Attack Hypothesis", styles)
    if job.correlation:
        story.append(Paragraph(job.correlation.hypothesis, styles["body"]))
    story.append(Spacer(1, 0.5*cm))

    # Incident Timeline
    story += _section("Incident Timeline", styles)
    if job.correlation and job.correlation.timeline:
        tdata = [["Time", "Event"]]
        for e in job.correlation.timeline:
            tdata.append([e.time, e.event])
        story.append(_styled_table(tdata))
    else:
        story.append(Paragraph("No timeline events recorded.", styles["muted"]))
    story.append(Spacer(1, 0.5*cm))

    # Evidence Table
    story += _section("Evidence Table", styles)
    if job.correlation and job.correlation.evidence:
        edata = [["Finding", "Source", "Confidence"]]
        for ev in job.correlation.evidence:
            conf_text = f"{ev.confidence}%"
            edata.append([ev.finding, ev.source, conf_text])
        story.append(_styled_table(edata, col_widths=[9*cm, 3*cm, 2.5*cm]))
    else:
        story.append(Paragraph("No evidence items recorded.", styles["muted"]))
    story.append(Spacer(1, 0.5*cm))

    # Tool Summary Appendix
    story.append(PageBreak())
    story += _section("Appendix — Tool Outputs", styles)
    for output in job.tool_outputs:
        story.append(Paragraph(f"<b>{output.tool}</b> — {'SUCCESS' if output.success else 'FAILED'}", styles["body"]))
        if not output.success:
            story.append(Paragraph(f"Error: {output.error}", styles["muted"]))
        else:
            preview = _tool_preview(output)
            story.append(Paragraph(preview, styles["mono"]))
        story.append(Spacer(1, 0.3*cm))

    doc.build(story, onFirstPage=_header_footer, onLaterPages=_header_footer)
    return buf.getvalue()


def _cover(job, styles):
    elements = []
    elements.append(Spacer(1, 2*cm))
    elements.append(Paragraph("ForensiX", styles["title"]))
    elements.append(Paragraph("Autonomous Forensic Analysis Report", styles["subtitle"]))
    elements.append(HRFlowable(width="100%", thickness=2, color=ACCENT))
    elements.append(Spacer(1, 1*cm))
    meta = [
        ["Case ID:", job.job_id[:12] + "..."],
        ["Artifact:", job.filename],
        ["File Type:", job.file_type.value if job.file_type else "Unknown"],
        ["Analysis Date:", datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")],
        ["Status:", job.status.value.upper()],
    ]
    for label, value in meta:
        elements.append(Paragraph(f"<b>{label}</b> {value}", styles["body"]))
        elements.append(Spacer(1, 0.2*cm))
    return elements


def _section(title: str, styles):
    return [
        Paragraph(title, styles["heading"]),
        HRFlowable(width="100%", thickness=1, color=ACCENT, spaceAfter=6),
        Spacer(1, 0.2*cm),
    ]


def _styled_table(data: list, col_widths=None):
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [LIGHT_GRAY, colors.white]),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D1D5DB")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))
    return t


def _tool_preview(output) -> str:
    d = output.data
    if output.tool == "strings":
        lines = d.get("strings", [])[:10]
        return " | ".join(lines) if lines else "(no strings)"
    if output.tool == "yara":
        matches = d.get("matches", [])
        return ", ".join(m["rule"] for m in matches) if matches else "No matches"
    if output.tool == "vol_pslist":
        procs = d.get("processes", [])[:5]
        return ", ".join(f"{p['name']}({p['pid']})" for p in procs if p.get("name"))
    if output.tool == "vol_netscan":
        conns = d.get("connections", [])[:5]
        return ", ".join(f"{c.get('local')}→{c.get('remote')}" for c in conns)
    return str(d)[:200]


def _make_styles():
    base = getSampleStyleSheet()
    custom = {
        "title": ParagraphStyle("title", fontSize=28, textColor=ACCENT, spaceAfter=6, alignment=TA_CENTER, fontName="Helvetica-Bold"),
        "subtitle": ParagraphStyle("subtitle", fontSize=14, textColor=MID_GRAY, spaceAfter=20, alignment=TA_CENTER),
        "heading": ParagraphStyle("heading", fontSize=13, textColor=DARK, spaceBefore=12, spaceAfter=4, fontName="Helvetica-Bold"),
        "body": ParagraphStyle("body", fontSize=9, textColor=DARK, leading=14),
        "muted": ParagraphStyle("muted", fontSize=8, textColor=MID_GRAY, leading=12),
        "mono": ParagraphStyle("mono", fontSize=7.5, textColor=DARK, fontName="Courier", leading=11),
    }
    return custom


def _header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(MID_GRAY)
    canvas.drawString(2*cm, 1*cm, "ForensiX — Confidential Forensic Report")
    canvas.drawRightString(W - 2*cm, 1*cm, f"Page {doc.page}")
    canvas.restoreState()
