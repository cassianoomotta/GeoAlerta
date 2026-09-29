# -*- coding: utf-8 -*-
"""
Gerador oficial do Relatório de Auditoria de Segurança — GeoAlerta
Baseado no protocolo das Cinco Falhas Capitais.
"""

import os
import sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

# Paleta Oficial Exigida
COLOR_CRITICA = "#B91C1C"
COLOR_ALTA = "#EA580C"
COLOR_MEDIA = "#D97706"
COLOR_BAIXA = "#2563EB"
COLOR_PONTO_FORTE = "#059669"
COLOR_BG_DARK = "#0F172A"

class NumberedCanvas(canvas.Canvas):
    """Canvas de duas passagens para calcular o total exato de paginas e cabecalho/rodape."""
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            return  # Capa limpa

        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Cabecalho
        self.drawString(54, 800, "Relatório de Auditoria de Segurança — GeoAlerta (Gabinete de Crise)")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(54, 792, 541, 792)
        
        # Rodape
        page_text = f"Página {self._pageNumber} de {page_count}"
        self.drawRightString(541, 40, page_text)
        self.drawString(54, 40, "CONFIDENCIAL — Auditoria Técnica das Cinco Falhas Capitais")
        self.line(54, 50, 541, 50)
        self.restoreState()


def generate_charts(output_dir):
    os.makedirs(output_dir, exist_ok=True)
    chart_donut_path = os.path.join(output_dir, "chart_donut.png")
    chart_bar_path = os.path.join(output_dir, "chart_bar.png")

    # 1. Grafico de Rosca (Achados por Severidade)
    labels = ['Crítica (1)', 'Alta (2)', 'Média (2)', 'Baixa (1)']
    counts = [1, 2, 2, 1]
    chart_colors = [COLOR_CRITICA, COLOR_ALTA, COLOR_MEDIA, COLOR_BAIXA]

    fig, ax = plt.subplots(figsize=(4.2, 3), subplot_kw=dict(aspect="equal"))
    wedges, texts, autotexts = ax.pie(
        counts,
        labels=labels,
        autopct='%1.0f%%',
        startangle=140,
        colors=chart_colors,
        wedgeprops=dict(width=0.45, edgecolor='white', linewidth=2),
        textprops=dict(color="#1E293B", weight="bold", size=8.5)
    )
    ax.set_title("Vulnerabilidades por Severidade", fontsize=11, weight="bold", color="#0F172A", pad=12)
    plt.tight_layout()
    plt.savefig(chart_donut_path, dpi=200, bbox_inches='tight')
    plt.close()

    # 2. Grafico de Barras (Por Categoria)
    cats = [
        "1. Banco s/ Tranca",
        "2. Permissão Nav.",
        "3. IDOR",
        "4. Chaves Expostas",
        "5. Inputs / XSS"
    ]
    cat_counts = [2, 1, 1, 1, 2]

    fig, ax = plt.subplots(figsize=(5.2, 3))
    bars = ax.barh(cats, cat_counts, color="#2563EB", height=0.55, edgecolor="#1D4ED8")
    ax.set_xlabel("Nº de Vulnerabilidades", fontsize=9, weight="bold", color="#1E293B")
    ax.set_title("Achados por Categoria", fontsize=11, weight="bold", color="#0F172A", pad=12)
    ax.set_xlim(0, 3)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color('#CBD5E1')
    ax.spines['bottom'].set_color('#CBD5E1')
    ax.tick_params(colors='#334155', labelsize=8)

    for bar in bars:
        width = bar.get_width()
        ax.text(width + 0.08, bar.get_y() + bar.get_height()/2, f'{int(width)}',
                va='center', ha='left', fontsize=9, weight='bold', color='#1E293B')

    plt.tight_layout()
    plt.savefig(chart_bar_path, dpi=200, bbox_inches='tight')
    plt.close()

    return chart_donut_path, chart_bar_path


def build_pdf():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    output_pdf = os.path.join(current_dir, "relatorio-auditoria-seguranca.pdf")
    tmp_charts_dir = os.path.join(current_dir, "_charts")

    chart_donut, chart_bar = generate_charts(tmp_charts_dir)

    doc = SimpleDocTemplate(
        output_pdf,
        pagesize=A4,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CoverTitle', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=24, leading=30,
        textColor=colors.HexColor(COLOR_BG_DARK)
    )
    subtitle_style = ParagraphStyle(
        'CoverSubtitle', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=12, leading=16,
        textColor=colors.HexColor(COLOR_BAIXA)
    )
    meta_style = ParagraphStyle(
        'CoverMeta', parent=styles['Normal'],
        fontName='Helvetica', fontSize=9.5, leading=15,
        textColor=colors.HexColor("#475569")
    )
    h1_style = ParagraphStyle(
        'H1', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=15, leading=19,
        textColor=colors.HexColor(COLOR_BG_DARK), spaceBefore=16, spaceAfter=8
    )
    h2_style = ParagraphStyle(
        'H2', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=11, leading=15,
        textColor=colors.HexColor("#334155"), spaceBefore=10, spaceAfter=4
    )
    body_style = ParagraphStyle(
        'Body', parent=styles['Normal'],
        fontName='Helvetica', fontSize=9, leading=13.5,
        textColor=colors.HexColor("#1E293B"), spaceAfter=5
    )
    code_box = ParagraphStyle(
        'CodeBox', parent=styles['Normal'],
        fontName='Courier', fontSize=7.5, leading=10.5,
        textColor=colors.HexColor("#0F172A"), backColor=colors.HexColor("#F1F5F9"),
        borderPadding=5, spaceAfter=6
    )

    story = []

    # ==========================================
    # 1. CAPA
    # ==========================================
    story.append(Spacer(1, 30))
    story.append(Paragraph("RELATÓRIO DE AUDITORIA DE SEGURANÇA", subtitle_style))
    story.append(Spacer(1, 6))
    story.append(Paragraph("GeoAlerta — Gabinete de Crise Integrado", title_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=2.5, color=colors.HexColor(COLOR_BAIXA), spaceAfter=16))

    story.append(Paragraph("<b>Data da Auditoria:</b> 13 de Setembro de 2026", meta_style))
    story.append(Paragraph("<b>Escopo Auditado:</b> Código-fonte Next.js, esquemas Supabase SQL, storage, middleware e rotas do painel", meta_style))
    story.append(Spacer(1, 12))

    story.append(Paragraph("<b>Mapeamento da Stack Tecnológica:</b>", h2_style))
    story.append(Paragraph("• <b>Linguagem & Runtime:</b> TypeScript / Node.js v24", body_style))
    story.append(Paragraph("• <b>Framework Frontend & Backend:</b> Next.js 16.3.5 (App Router, Turbopack, React 19)", body_style))
    story.append(Paragraph("• <b>Banco de Dados & Storage:</b> Supabase PostgreSQL com extensão geográfica PostGIS e Supabase Storage", body_style))
    story.append(Paragraph("• <b>Mecanismo de Autenticação:</b> Supabase Auth (@supabase/ssr + @supabase/supabase-js) com sessão em cookies", body_style))
    story.append(Paragraph("• <b>Deploy & Infraestrutura:</b> Vercel Edge / Serverless, sem containers Docker ativos", body_style))
    story.append(Spacer(1, 10))

    story.append(Paragraph("<b>Nota Metodológica:</b>", h2_style))
    story.append(Paragraph(
        "A auditoria foi executada com base no rigoroso protocolo das <b>Cinco Falhas Capitais de Segurança</b>: "
        "(1) Banco sem Tranca (RLS e isolamento de dados no Supabase); "
        "(2) Permissão no Navegador (gates de UI vs validação server-side); "
        "(3) IDOR (manipulação arbitrária de ocorrências por UUID); "
        "(4) Chaves Expostas (verificação de segredos e histórico git); "
        "(5) Inputs sem Tratamento (validação de payloads e vetores de upload XSS).",
        body_style
    ))
    story.append(PageBreak())

    # ==========================================
    # 2. RESUMO EXECUTIVO E GRAFICOS
    # ==========================================
    story.append(Paragraph("1. Resumo Executivo", h1_style))
    story.append(Paragraph(
        "Foram detectadas <b>6 vulnerabilidades verificadas no código real</b> (1 Crítica, 2 Altas, 2 Médias, 1 Baixa). "
        "O sistema possui pontos fortes estruturais modernos, como o middleware Server-Side de autenticação e proteção "
        "nativa do React contra XSS refletido. No entanto, o acesso direto do cliente ao banco de dados via Supabase "
        "com políticas RLS excessivamente permissivas (`USING true`) representa o risco mais crítico.",
        body_style
    ))
    story.append(Spacer(1, 8))

    charts_table = Table([
        [Image(chart_donut, width=195, height=135), Image(chart_bar, width=255, height=135)]
    ], colWidths=[205, 275])
    charts_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(charts_table)
    story.append(Spacer(1, 12))

    # ==========================================
    # 3. PONTOS FORTES E PONTOS FRACOS
    # ==========================================
    story.append(Paragraph("2. Pontos Fortes e Riscos Centrais", h1_style))
    
    story.append(Paragraph("<b>✅ Pontos Fortes Verificados no Código:</b>", h2_style))
    story.append(Paragraph(f"• <font color='{COLOR_PONTO_FORTE}'><b>[CONFIRMADO]</b></font> <b>Proteção Server-Side das Rotas do Painel:</b> O arquivo <code>src/middleware.ts</code> valida ativamente a sessão no servidor via <code>supabase.auth.getUser()</code> para toda a rota <code>/painel/*</code>, impedindo acesso não autorizado.", body_style))
    story.append(Paragraph(f"• <font color='{COLOR_PONTO_FORTE}'><b>[CONFIRMADO]</b></font> <b>Histórico Git 100% Limpo:</b> Nenhum arquivo de variáveis de ambiente (<code>.env</code>) foi commitado no histórico do repositório.", body_style))
    story.append(Paragraph(f"• <font color='{COLOR_PONTO_FORTE}'><b>[CONFIRMADO]</b></font> <b>Sem Secrets em Código:</b> A biblioteca <code>lib/supabase.ts</code> consome exclusivamente variáveis de ambiente, sem chaves embutidas em código.", body_style))
    story.append(Paragraph(f"• <font color='{COLOR_PONTO_FORTE}'><b>[CONFIRMADO]</b></font> <b>Escaping Nativo contra XSS:</b> Os componentes React interpolam dados de relatores e descrições sem utilizar <code>dangerouslySetInnerHTML</code>.", body_style))
    story.append(Spacer(1, 8))

    story.append(Paragraph("<b>⚠️ Riscos Centrais Identificados:</b>", h2_style))
    story.append(Paragraph(f"• <font color='{COLOR_CRITICA}'><b>[CRÍTICO]</b></font> <b>RLS Aberto para Modificações:</b> A policy de UPDATE da tabela <code>occurrences</code> permite que qualquer cliente anônimo com a anon key altere registros de qualquer chamado.", body_style))
    story.append(Paragraph(f"• <font color='{COLOR_ALTA}'><b>[ALTO]</b></font> <b>Upload de Mídia sem Lista Branca:</b> A extensão e tipo MIME dos arquivos de foto são extraídos diretamente do nome fornecido pelo usuário sem sanitização ou limite de tamanho.", body_style))
    story.append(Spacer(1, 10))

    # ==========================================
    # 4. TABELA DE ACHADOS DETALHADOS
    # ==========================================
    story.append(Paragraph("3. Tabela de Achados Detalhados por Categoria", h1_style))
    
    findings_data = [
        ["Severidade", "Arquivo : Linha", "Descrição da Vulnerabilidade & Categoria"],
        [
            Paragraph(f"<font color='{COLOR_CRITICA}'><b>CRÍTICA</b></font>", body_style),
            Paragraph("<font size=7.5><b>supabase.sql:41-42</b></font>", body_style),
            Paragraph("<b>[1. Banco s/ Tranca]</b> Policy <code>Permitir alteração anônima</code> usa <code>FOR UPDATE USING (true)</code>. Qualquer pessoa na internet pode alterar status ou apagar informações de chamados via API aberta sem login.", body_style)
        ],
        [
            Paragraph(f"<font color='{COLOR_ALTA}'><b>ALTA</b></font>", body_style),
            Paragraph("<font size=7.5><b>sistema/src/app/page.tsx:55-61</b></font>", body_style),
            Paragraph("<b>[5. Inputs / XSS]</b> Upload extrai <code>file.name.split('.').pop()</code> sem validar lista branca de extensões (jpg, png) nem validar tamanho máximo, permitindo upload de scripts ou arquivos gigantes.", body_style)
        ],
        [
            Paragraph(f"<font color='{COLOR_ALTA}'><b>ALTA</b></font>", body_style),
            Paragraph("<font size=7.5><b>sistema/src/app/painel/page.tsx:99<br/>tabela/page.tsx:109</b></font>", body_style),
            Paragraph("<b>[3. IDOR]</b> Updates de ocorrência operam diretamente por ID sem validar propriedade de órgão ou contexto de autorização da requisição no banco.", body_style)
        ],
        [
            Paragraph(f"<font color='{COLOR_ALTA}'><b>ALTA</b></font>", body_style),
            Paragraph("<font size=7.5><b>supabase.sql:49-50</b></font>", body_style),
            Paragraph("<b>[1. Banco s/ Tranca]</b> Storage Policy de insert aberta sem limite de cota de upload por IP ou checagem de tipos MIME aceitos no bucket.", body_style)
        ],
        [
            Paragraph(f"<font color='{COLOR_MEDIA}'><b>MÉDIA</b></font>", body_style),
            Paragraph("<font size=7.5><b>sistema/src/middleware.ts:38-44</b></font>", body_style),
            Paragraph("<b>[2. Permissão Nav.]</b> Middleware valida autenticação, mas não valida papéis/órgãos (RBAC). Qualquer servidor logado tem acesso irrestrito a botões de despacho de outros órgãos.", body_style)
        ],
        [
            Paragraph(f"<font color='{COLOR_BAIXA}'><b>BAIXA</b></font>", body_style),
            Paragraph("<font size=7.5><b>sistema/.env:4-5</b></font>", body_style),
            Paragraph("<b>[4. Chaves Expostas]</b> Arquivo local contém senha mestra do PostgreSQL em texto puro. Embora protegido pelo .gitignore, requer rotação e cofre de segredos em produção.", body_style)
        ]
    ]

    t = Table(findings_data, colWidths=[65, 140, 275])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F8FAFC")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor("#0F172A")),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,0), 5),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t)
    story.append(PageBreak())

    # ==========================================
    # 5. RECOMENDACOES PRIORIZADAS
    # ==========================================
    story.append(Paragraph("4. Recomendações Priorizadas de Correção", h1_style))
    
    story.append(Paragraph("<b>P1 (Imediata) — Trancar Políticas de UPDATE no Supabase</b>", h2_style))
    story.append(Paragraph("Remova a policy <code>Permitir alteração anônima</code> e restrinja a operação de UPDATE exclusivamente a usuários autenticados: <code>CREATE POLICY 'Apenas gestores alteram' ON public.occurrences FOR UPDATE USING (auth.uid() IS NOT NULL);</code>", body_style))
    story.append(Spacer(1, 6))

    story.append(Paragraph("<b>P2 (Alta) — Sanitização Estrita de Uploads de Mídia</b>", h2_style))
    story.append(Paragraph("No arquivo <code>src/app/page.tsx</code>, valide o tipo MIME (permitir apenas <code>image/jpeg</code>, <code>image/png</code>, <code>image/webp</code>) e limite o tamanho a no máximo 5MB antes do upload. Gere o nome do arquivo com UUID v4 criptográfico em vez de concatenar a extensão enviada pelo cliente.", body_style))
    story.append(Spacer(1, 6))

    story.append(Paragraph("<b>P3 (Média) — Implementar RBAC e Perfis de Órgãos</b>", h2_style))
    story.append(Paragraph("Criar tabela de perfis de gestores vinculada a <code>auth.users</code> para registrar o órgão de lotação (ex: Defesa Civil, Bombeiros, Obras, Assistência) e limitar o despacho de acordo com o órgão correspondente.", body_style))
    story.append(Spacer(1, 14))

    # ==========================================
    # 6. ISSUES PARA O GITHUB
    # ==========================================
    story.append(Paragraph("5. Issues Acionáveis para o GitHub", h1_style))
    story.append(Paragraph("Copie os blocos delimitados abaixo diretamente para a aba de Issues do seu repositório:", body_style))
    story.append(Spacer(1, 8))

    issues = [
        {
            "title": "[Segurança] Restringir Políticas de UPDATE na tabela occurrences (RLS)",
            "labels": ["security", "crítica", "supabase"],
            "body": """--- ISSUE 1 ---
Título: [Segurança] Restringir Políticas de UPDATE na tabela occurrences (RLS)
Labels: security, crítica, supabase

Descrição:
A policy atual de UPDATE na tabela `public.occurrences` está configurada com `FOR UPDATE USING (true)`. Isso permite que qualquer cliente anônimo com a anon key consiga alterar dados ou apagar ocorrências via API aberta.

Evidência:
supabase.sql (linhas 41-42):
CREATE POLICY "Permitir alteração anônima" ON public.occurrences FOR UPDATE USING (true);

Impacto:
Adulteração de relatórios da Defesa Civil, encerramento indevido de chamados de resgate e falsificação de despachos operacionais.

Sugestão de Correção:
Substituir a policy por:
CREATE POLICY "Permitir apenas gestores autenticados alterarem" ON public.occurrences
    FOR UPDATE USING (auth.uid() IS NOT NULL);

Critérios de Aceite:
- [ ] Drop da policy 'Permitir alteração anônima'.
- [ ] Criação de nova policy exigindo sessão autenticada.
- [ ] Teste de update anônimo via REST confirmando bloqueio (403/0 rows).
--- FIM ISSUE 1 ---"""
        },
        {
            "title": "[Segurança] Sanitizar upload de evidências fotográficas e limitar tamanho",
            "labels": ["security", "alta", "storage"],
            "body": """--- ISSUE 2 ---
Título: [Segurança] Sanitizar upload de evidências fotográficas e limitar tamanho
Labels: security, alta, storage

Descrição:
O formulário de registro de ocorrência do cidadão extrai a extensão do arquivo diretamente de `file.name` e realiza upload no Supabase Storage sem validação de tipos MIME ou tamanho máximo.

Evidência:
sistema/src/app/page.tsx (linhas 55-61):
const fileExt = file.name.split('.').pop();
const fileName = `${Math.random()}.${fileExt}`;

Impacto:
Risco de upload de scripts maliciosos (.html, .svg com JS), esgotamento de quota do Storage (DDoS de armazenamento) ou arquivos corrompidos.

Sugestão de Correção:
- Validar se `file.type` está na lista ['image/jpeg', 'image/png', 'image/webp'].
- Rejeitar arquivos com mais de 5MB.
- Gerar nome utilizando `crypto.randomUUID()` com extensão fixa determinada pelo MIME type.

Critérios de Aceite:
- [ ] Validação de tamanho (< 5MB) antes do envio.
- [ ] Validação estrita de tipo de imagem.
- [ ] Nome do arquivo seguro sem caracteres controlados pelo cliente.
--- FIM ISSUE 2 ---"""
        },
        {
            "title": "[Segurança] Implementar controle de acesso por órgão (RBAC)",
            "labels": ["security", "média", "auth"],
            "body": """--- ISSUE 3 ---
Título: [Segurança] Implementar controle de acesso por órgão (RBAC)
Labels: security, média, auth

Descrição:
Atualmente, qualquer usuário autenticado no painel pode atualizar e despachar ocorrências de qualquer órgão sem restrição de papel (ex: operador de obras alterando chamados de bombeiros).

Evidência:
sistema/src/app/painel/page.tsx (linha 99) e sistema/src/middleware.ts:
Verificação limita-se à existência de `user`, sem checar `role` ou `orgao`.

Impacto:
Falta de rastreabilidade de ações e conflito de despachos operacionais entre secretarias municipais.

Sugestão de Correção:
Vincular metadados de órgão ao usuário no Supabase Auth (`raw_user_meta_data.orgao`) e validar a correspondência antes de permitir o despacho.

Critérios de Aceite:
- [ ] Tabela ou metadata de usuários com órgão vinculado.
- [ ] Bloqueio de ações em ocorrências de outros órgãos, exceto para perfil Administrador.
--- FIM ISSUE 3 ---"""
        }
    ]

    for issue in issues:
        story.append(KeepTogether([
            Paragraph(f"<b>{issue['title']}</b>", h2_style),
            Paragraph(f"<b>Labels:</b> {', '.join(issue['labels'])}", meta_style),
            Spacer(1, 3),
            Paragraph(issue['body'].replace('\n', '<br/>'), code_box),
            Spacer(1, 8)
        ]))

    doc.build(story, canvasmaker=NumberedCanvas)

    # Limpeza de imagens temporarias
    try:
        if os.path.exists(chart_donut): os.remove(chart_donut)
        if os.path.exists(chart_bar): os.remove(chart_bar)
        if os.path.exists(tmp_charts_dir): os.rmdir(tmp_charts_dir)
    except:
        pass

    print(f"Relatório gerado com sucesso em: {output_pdf}")

if __name__ == '__main__':
    build_pdf()
