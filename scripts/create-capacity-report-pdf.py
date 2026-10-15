import json
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Flowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "docs/releases/core/testing/results/2026-10-12-capacity-load.json"
OUTPUT = ROOT / "output/pdf/geoalerta-capacity-report-2026-10-12.pdf"
BLUE = colors.HexColor("#16324F")
TEAL = colors.HexColor("#168C8C")
GREEN = colors.HexColor("#2E7D57")
RED = colors.HexColor("#B54141")
GRAY = colors.HexColor("#677482")
LIGHT = colors.HexColor("#EDF2F5")
GOLD = colors.HexColor("#B27A19")


def fmt(value, digits=0):
    if value is None:
        return "-"
    return f"{value:,.{digits}f}".replace(",", "X").replace(".", ",").replace("X", ".")


class CapacityCharts(Flowable):
    def __init__(self, stages):
        super().__init__()
        self.stages = stages
        self.height = 420

    def wrap(self, avail_width, avail_height):
        self.width = avail_width
        return avail_width, self.height

    def draw(self):
        canvas = self.canv
        stages = self.stages
        width = self.width

        canvas.setFont("Helvetica-Bold", 10)
        canvas.setFillColor(BLUE)
        canvas.drawString(0, 402, "RPM por estágio: taxa ofertada e respostas concluídas")
        left, bottom, chart_w, chart_h = 46, 262, width - 65, 112
        max_rpm = 1800
        for tick in (0, 500, 1000, 1500):
            y = bottom + chart_h * tick / max_rpm
            canvas.setStrokeColor(colors.HexColor("#D9E1E7"))
            canvas.setLineWidth(0.5)
            canvas.line(left, y, left + chart_w, y)
            canvas.setFillColor(GRAY)
            canvas.setFont("Helvetica", 7)
            canvas.drawRightString(left - 5, y - 2, str(tick))
        ref_y = bottom + chart_h * 1667 / max_rpm
        canvas.setStrokeColor(GOLD)
        canvas.setDash(3, 2)
        canvas.line(left, ref_y, left + chart_w, ref_y)
        canvas.setDash()
        canvas.setFillColor(GOLD)
        canvas.setFont("Helvetica", 7)
        canvas.drawRightString(left + chart_w, ref_y + 3, "referência 1.667 RPM")

        group_w = chart_w / max(1, len(stages))
        bar_w = min(11, group_w * 0.28)
        for index, stage in enumerate(stages):
            center = left + group_w * (index + 0.5)
            target_h = chart_h * min(stage["targetRpm"], max_rpm) / max_rpm
            measured_h = chart_h * min(stage["successfulRpm"], max_rpm) / max_rpm
            canvas.setFillColor(colors.HexColor("#B8C5D0"))
            canvas.rect(center - bar_w - 1, bottom, bar_w, target_h, stroke=0, fill=1)
            canvas.setFillColor(GREEN if stage["accepted"] else RED)
            canvas.rect(center + 1, bottom, bar_w, measured_h, stroke=0, fill=1)
            canvas.setFillColor(GRAY)
            canvas.setFont("Helvetica", 6.5)
            canvas.drawCentredString(center, bottom - 10, str(index + 1))

        canvas.setFillColor(colors.HexColor("#B8C5D0"))
        canvas.rect(left, 238, 8, 7, stroke=0, fill=1)
        canvas.setFillColor(GRAY)
        canvas.setFont("Helvetica", 7)
        canvas.drawString(left + 12, 238, "ofertado")
        canvas.setFillColor(GREEN)
        canvas.rect(left + 70, 238, 8, 7, stroke=0, fill=1)
        canvas.setFillColor(GRAY)
        canvas.drawString(left + 82, 238, "concluído e aprovado")
        canvas.setFillColor(RED)
        canvas.rect(left + 194, 238, 8, 7, stroke=0, fill=1)
        canvas.setFillColor(GRAY)
        canvas.drawString(left + 206, 238, "reprovado")
        canvas.setFillColor(GRAY)
        canvas.drawString(left + chart_w - 112, 238, "Número = ordem da tabela")

        canvas.setFont("Helvetica-Bold", 10)
        canvas.setFillColor(BLUE)
        canvas.drawString(0, 211, "Latência p95 por rota e estágio")
        left2, bottom2, chart_w2, chart_h2 = 46, 39, width - 65, 145
        max_ms = 4000
        for tick in (0, 1000, 2000, 3000, 4000):
            y = bottom2 + chart_h2 * tick / max_ms
            canvas.setStrokeColor(colors.HexColor("#D9E1E7"))
            canvas.setLineWidth(0.5)
            canvas.line(left2, y, left2 + chart_w2, y)
            canvas.setFillColor(GRAY)
            canvas.setFont("Helvetica", 7)
            canvas.drawRightString(left2 - 5, y - 2, f"{tick} ms")
        threshold = bottom2 + chart_h2 * 3000 / max_ms
        canvas.setStrokeColor(RED)
        canvas.setDash(3, 2)
        canvas.line(left2, threshold, left2 + chart_w2, threshold)
        canvas.setDash()

        series = [
            ("backoffice.list", TEAL, "Lista"),
            ("backoffice.dashboard", BLUE, "Painel"),
            ("backoffice.detail", GOLD, "Detalhe"),
        ]
        xstep = chart_w2 / max(1, len(stages) - 1)
        for kind, color, label in series:
            points = []
            for i, stage in enumerate(stages):
                p95 = stage["latencySummaryMs"][kind]["p95"]
                if p95 is not None:
                    points.append((left2 + i * xstep, bottom2 + chart_h2 * min(p95, max_ms) / max_ms))
            canvas.setStrokeColor(color)
            canvas.setLineWidth(1.5)
            for first, second in zip(points, points[1:]):
                canvas.line(first[0], first[1], second[0], second[1])
            canvas.setFillColor(color)
            for x, y in points:
                canvas.circle(x, y, 2.4, stroke=0, fill=1)
        for i in range(len(stages)):
            x = left2 + i * xstep
            canvas.setFillColor(GRAY)
            canvas.setFont("Helvetica", 6.5)
            canvas.drawCentredString(x, bottom2 - 10, str(i + 1))
        legend_y = 15
        for x, (_, color, label) in zip((left2, left2 + 70, left2 + 150), series):
            canvas.setStrokeColor(color)
            canvas.setLineWidth(1.5)
            canvas.line(x, legend_y + 2, x + 12, legend_y + 2)
            canvas.setFillColor(GRAY)
            canvas.setFont("Helvetica", 7)
            canvas.drawString(x + 16, legend_y, label)
        canvas.setStrokeColor(RED)
        canvas.setDash(3, 2)
        canvas.line(left2 + 225, legend_y + 2, left2 + 237, legend_y + 2)
        canvas.setDash()
        canvas.setFillColor(GRAY)
        canvas.drawString(left2 + 241, legend_y, "limite p95 3.000 ms")


def make_styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("TitleCustom", parent=base["Title"], fontName="Helvetica-Bold", fontSize=23, leading=28, textColor=BLUE, spaceAfter=8),
        "subtitle": ParagraphStyle("SubCustom", parent=base["Normal"], fontName="Helvetica", fontSize=10, leading=14, textColor=GRAY, spaceAfter=10),
        "h1": ParagraphStyle("H1Custom", parent=base["Heading1"], fontName="Helvetica-Bold", fontSize=15, leading=19, textColor=BLUE, spaceBefore=3, spaceAfter=8),
        "h2": ParagraphStyle("H2Custom", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=10, leading=13, textColor=BLUE, spaceBefore=6, spaceAfter=4),
        "body": ParagraphStyle("BodyCustom", parent=base["BodyText"], fontName="Helvetica", fontSize=8.5, leading=12, textColor=colors.HexColor("#25313B"), spaceAfter=6),
        "small": ParagraphStyle("SmallCustom", parent=base["BodyText"], fontName="Helvetica", fontSize=7, leading=9, textColor=GRAY, spaceAfter=4),
        "card": ParagraphStyle("CardCustom", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=16, leading=20, textColor=BLUE, alignment=TA_CENTER),
        "cardlabel": ParagraphStyle("CardLabel", parent=base["BodyText"], fontName="Helvetica", fontSize=7.5, leading=10, textColor=GRAY, alignment=TA_CENTER),
        "center": ParagraphStyle("CenterCustom", parent=base["BodyText"], fontName="Helvetica", fontSize=8, leading=11, textColor=GRAY, alignment=TA_CENTER),
    }


def footer(canvas, doc):
    canvas.saveState()
    width, _ = A4
    canvas.setStrokeColor(colors.HexColor("#D9E1E7"))
    canvas.line(18 * mm, 14 * mm, width - 18 * mm, 14 * mm)
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(GRAY)
    canvas.drawString(18 * mm, 9 * mm, "GeoAlerta | evidência local | 12/10/2026")
    canvas.drawRightString(width - 18 * mm, 9 * mm, f"Página {doc.page}")
    canvas.restoreState()


def main():
    data = json.loads(INPUT.read_text(encoding="utf-8"))
    stages = data["stages"]
    styles = make_styles()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm,
        topMargin=17 * mm, bottomMargin=19 * mm, title="GeoAlerta - capacidade e bateria de testes",
        author="GeoAlerta - relatório técnico local",
    )
    story = []
    story += [
        Spacer(1, 7 * mm),
        Paragraph("GeoAlerta", styles["title"]),
        Paragraph("Relatório de capacidade e bateria de testes", styles["h1"]),
        Paragraph("Medição local, reproduzível e sanitizada | 12 de outubro de 2026", styles["subtitle"]),
        Spacer(1, 4 * mm),
    ]
    cards = [
        [Paragraph("1.268 RPM", styles["card"]), Paragraph("76.080/h", styles["card"]), Paragraph("100.000/h", styles["card"])],
        [Paragraph("maior taxa confirmada", styles["cardlabel"]), Paragraph("projeção aritmética", styles["cardlabel"]), Paragraph("alvo não aprovado", styles["cardlabel"])],
    ]
    card_table = Table(cards, colWidths=[(A4[0] - 36 * mm) / 3] * 3, rowHeights=[12 * mm, 9 * mm])
    card_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT), ("BOX", (0, 0), (-1, -1), 0.5, colors.white),
        ("INNERGRID", (0, 0), (-1, -1), 2, colors.white), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story += [card_table, Spacer(1, 6 * mm), Paragraph("Conclusão executiva", styles["h2"])]
    story.append(Paragraph(
        "O maior estágio que completou o critério de estabilidade foi <b>1.268 requisições por minuto</b>, por cinco minutos, com 6.340 respostas HTTP 200 e zero erros inesperados. A projeção é 76.080 requisições por hora se o mesmo perfil permanecer constante. O alvo de 100.000/h equivale a aproximadamente 1.667 RPM e <b>não passou</b>: p95 acima de 3 s e taxa de chegada abaixo do mínimo. Este resultado vale somente para a aplicação local e o mix de leituras descrito neste documento.", styles["body"]))
    story.append(Paragraph("Leitura comercial", styles["h2"]))
    story.append(Paragraph(
        "Não apresente 100 mil requisições/hora como capacidade comprovada. Também não trate 76.080/h como capacidade geral, promessa de disponibilidade ou SLO: não houve teste hospedado nem soak de uma hora nessa taxa. Uma execução exploratória anterior registrou 503/P2028 a 1.268 RPM; ela permanece preservada e reduz a força da inferência até repetição controlada em infraestrutura equivalente à hospedada.", styles["body"]))
    story.append(Paragraph("Escopo do resultado", styles["h2"]))
    story.append(Paragraph(
        "Mix autenticado de leitura: 60% listagem, 30% painel e 10% detalhe, dez sessões. Critérios: erros <=1%, taxa de chegada >=95%, p95 <=3.000 ms em cada rota e pendências <=1%. Escritas públicas, fotos, Realtime, CDN/proxy/Vercel e geradores distribuídos ficaram fora do perfil.", styles["body"]))
    story.append(Paragraph(
        f"Ambiente: {data['machine']['cpuModel'].strip()}, {data['machine']['logicalCpus']} CPUs lógicas, {fmt(data['machine']['totalMemoryBytes'] / (1024**3), 2)} GB de memória reportada, Windows {data['machine']['os'].split()[-1]}, Node {data['machine']['node']}, banco PostgreSQL local em Docker. Resultado final: {data['result']}. Run ID: {data['runId']}.", styles["small"]))

    story += [PageBreak(), Paragraph("Curvas de carga e latência", styles["h1"]),
              Paragraph("Os marcadores numerados correspondem à ordem dos estágios na tabela da página seguinte. As faixas de busca e soak podem ter sido encerradas antes do prazo ao cruzar um limite.", styles["body"]),
              CapacityCharts(stages), Spacer(1, 4 * mm),
              Paragraph("O estágio de 1.325 RPM passou na busca de 90 s, mas seu soak terminou após 88 s quando o p95 do painel atingiu 3.043 ms. O soak de 1.268 RPM completou os 300 s.", styles["small"])]

    story += [PageBreak(), Paragraph("Resultados por estágio", styles["h1"]),
              Paragraph("Os valores de RPM concluído representam respostas HTTP 200 por minuto durante a janela observada. Estágios encerrados cedo não são comparáveis a um estágio completo pela duração; são evidência de cruzamento de limite.", styles["body"])]
    header = ["#", "Fase", "Alvo\nRPM", "Concl.\nRPM", "Erro\n%", "P95 lista\nms", "P95 painel\nms", "P95 detalhe\nms", "Resultado"]
    rows = [header]
    for i, stage in enumerate(stages, 1):
        lat = stage["latencySummaryMs"]
        result = "APROVADO" if stage["accepted"] else "REPROVADO"
        if stage["kind"] == "soak" and not stage["accepted"]:
            result = "SOAK reprovado"
        rows.append([
            str(i), stage["kind"], fmt(stage["targetRpm"]), fmt(stage["successfulRpm"], 1),
            fmt(stage["errorRatePercent"], 2), fmt(lat["backoffice.list"]["p95"], 0),
            fmt(lat["backoffice.dashboard"]["p95"], 0), fmt(lat["backoffice.detail"]["p95"], 0), result,
        ])
    table = Table(rows, repeatRows=1, colWidths=[7 * mm, 15 * mm, 17 * mm, 20 * mm, 13 * mm, 21 * mm, 22 * mm, 23 * mm, 27 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLUE), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"), ("FONTSIZE", (0, 0), (-1, -1), 6.7),
        ("LEADING", (0, 0), (-1, -1), 8), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-2, -1), "CENTER"), ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#D2DCE3")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
        ("TEXTCOLOR", (-1, 1), (-1, -1), GRAY), ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story += [table, Spacer(1, 5 * mm), Paragraph("Resumo do soak aprovado em 1.268 RPM", styles["h2"])]
    soak = next(s for s in stages if s["kind"] == "soak" and s["accepted"])
    soak_summary = [
        ["Duração", "Respostas", "Erros", "Taxa programada", "p95 lista", "p95 painel", "p95 detalhe"],
        ["300 s", fmt(soak["completedResponses"]), fmt(soak["unexpectedErrors"]), f"{fmt(soak['scheduleFulfillmentPercent'], 1)}%",
         f"{fmt(soak['latencySummaryMs']['backoffice.list']['p95'])} ms", f"{fmt(soak['latencySummaryMs']['backoffice.dashboard']['p95'])} ms", f"{fmt(soak['latencySummaryMs']['backoffice.detail']['p95'])} ms"],
    ]
    summary_table = Table(soak_summary, repeatRows=1, colWidths=[21 * mm, 23 * mm, 17 * mm, 29 * mm, 23 * mm, 24 * mm, 27 * mm])
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), TEAL), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"), ("FONTSIZE", (0, 0), (-1, -1), 7),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"), ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#D2DCE3")),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story += [summary_table, Spacer(1, 4 * mm), Paragraph("Todos os status HTTP do soak foram 200. Valores detalhados por rota, p50, máximo, status, recursos registrados e etapas de teste estão no JSON sanitizado associado ao run ID.", styles["small"])]

    story += [PageBreak(), Paragraph("Método, evidência e limites", styles["h1"]),
              Paragraph("Como a capacidade foi medida", styles["h2"]),
              Paragraph("O runner iniciou a aplicação compilada em modo de produção em 127.0.0.1:3100 contra a stack descartável local Supabase/PostgreSQL. Um agendador de chegada constante percorreu a escada de RPM, a busca binária aproximou a fronteira e o soak de cinco minutos confirmou a maior faixa aprovada. O runner passou a parar a etapa assim que erro excedeu 1% após amostra mínima ou quando o p95 de uma rota excedeu 3 s, drenando solicitações pendentes e salvando evidência JSON.", styles["body"]),
              Paragraph("Resultado anterior e comparabilidade", styles["h2"]),
              Paragraph("O teste integrado de 60 minutos documentado na bateria é complementar: 2.651 requisições no total, fluxos de criação/alerta, dez edições, conflito esperado, CSV e foto, sem erros inesperados. A taxa média agregada foi cerca de 44 RPM, mas o perfil e o mix são diferentes e não indicam limite máximo. Já uma execução exploratória de capacidade, encerrada antes de busca/soak e preservada em JSON separado, registrou 503/P2028 a 1.268 RPM. O executor final corrigiu o encerramento antecipado para interromper ao cruzar latência/erro; apesar de o soak atual passar, a diferença entre execuções precisa ser investigada antes de usar uma alegação em contrato.", styles["body"]),
              Paragraph("Limites", styles["h2"]),
              Paragraph("Uma única máquina Windows e uma stack Docker não modelam Vercel, funções hospedadas, proxy, rede, CDN, regiões, concorrência entre instâncias, escala automática, pool de conexões em produção, escrita pública, armazenamento de fotos, Realtime, picos distribuídos ou disponibilidade. O p95 é estatística da amostra capturada por estágio. O valor 76.080/h é uma extrapolação de 1.268 RPM, não uma execução de 60 minutos na taxa. Use-o como evidência inicial de laboratório, não como garantia ou certificação de desempenho.", styles["body"]),
              Paragraph("Bateria funcional documentada", styles["h2"]),
              Paragraph("Unitários: 190/190; avaliador de capacidade: 4/4; API: 60/60; banco/PostGIS: 34/34; migrations: 4/4; design system: 7/7; lint, TypeScript e build aprovados. Matriz de navegador: 203 aprovados, três skips e um erro local ERR_NO_BUFFER_SPACE, com os dois testes focados de autenticação passando na repetição. A restauração adicional ficou bloqueada antes da restauração pela incompatibilidade pg_dump 16.4 versus servidor PostgreSQL 17.11.", styles["body"]),
              Paragraph("Verificação final após os testes", styles["h2"]),
              Paragraph("O lint focado dos scripts do runner e o verificador TypeScript passaram com exit code 0. O PDF teve quatro páginas; o texto foi extraído e todas as páginas foram renderizadas e inspecionadas. Essas verificações pontuais não repetem as suítes completas de API, banco ou navegador.", styles["body"]),
              Paragraph("Rastreabilidade", styles["h2"]),
              Paragraph(f"Data do ensaio: {data['startedAt']} até {data['updatedAt']} (UTC). Revisão Git: {data['source']['revision']}; árvore de trabalho já estava suja. runId: {data['runId']}. O arquivo JSON inclui taxa por estágio, latências, status HTTP, critérios, host descartável, recursos registrados e metadados da máquina. Após a execução, a consulta confirmou zero contas Auth, perfis e papéis temporários; os servidores locais foram encerrados. Não foram gravados cookies, tokens, credenciais ou IDs privados. Nenhum commit, push, merge ou deploy foi feito.", styles["body"]),
              Paragraph("Arquivos no projeto", styles["h2"]),
              Paragraph("Relatório detalhado: docs/releases/core/testing/results/2026-10-12-test-battery-report.md<br/>Dados de capacidade: docs/releases/core/testing/results/2026-10-12-capacity-load.json<br/>Ensaio exploratório: docs/releases/core/testing/results/2026-10-12-capacity-load-exploratory.json<br/>Carga integrada de 60 minutos: docs/releases/core/testing/results/2026-10-12-load-local.json", styles["small"])]

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(OUTPUT)


if __name__ == "__main__":
    main()
