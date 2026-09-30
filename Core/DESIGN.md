# DESIGN — Guia de Design e Identidade Visual (GeoAlerta)

## 1. Filosofia de Design e Ergonomia de Crise

O **GeoAlerta** adota uma estética **SaaS Tático Premium em Dark Mode**. Em situações de crise e emergência pública, a interface precisa:
1. **Reduzir a fadiga visual** de operadores que passam 12 a 24 horas ininterruptas monitorando telas;
2. **Oferecer contraste imediato** para diferenciar níveis de risco (Crítico, Alerta, Seguro);
3. **Garantir usabilidade com 1 mão** e botões de grande área de toque no PWA do cidadão sob condições adversas (chuva, tremor, estresse).

---

## 2. Paleta de Cores e Tokens Visuais

O sistema utiliza tokens CSS centralizados em [`src/app/globals.css`](file:///c:/Users/Cassiano/Documents/Projetos/GeoAlerta/sistema/src/app/globals.css) mapeados no Tailwind:

| Token | Hex / Variável | Tailwind Class | Aplicação Principal |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `#020617` (Slate 950) | `bg-background` | Fundo principal da aplicação |
| **Card / Superfice** | `#0f172a` (Slate 900) | `bg-card` | Painéis flutuantes, gavetas, cards de ocorrência |
| **Bordas / Divisórias** | `#1e293b` (Slate 800) | `border-border` | Linhas de separação e contornos sutis |
| **Primário (Ação)** | `#3b82f6` (Blue 500) | `bg-primary` | Botões de ação, links, status normal e foco |
| **Crítico / Emergência** | `#ef4444` (Red 500) | `bg-destructive` | Ocorrências graves, manchas de inundação, alerta máximo |
| **Alerta / Atenção** | `#f59e0b` (Amber 500) | `text-amber-500` | Prioridade média, abrigos com ocupação > 80% |
| **Sucesso / Seguro** | `#10b981` (Emerald 500) | `text-emerald-500` | Ocorrências resolvidas, equipes disponíveis |
| **Texto Primário** | `#f8fafc` (Slate 50) | `text-foreground` | Títulos e dados numéricos principais |
| **Texto Secundário** | `#94a3b8` (Slate 400) | `text-muted-foreground` | Descrições, metadados e legendas |

---

## 3. Componentes de Interface Padronizados

### 3.1. Cards com Glassmorphism Tático (`.glass-card`)
Superfícies de leitura com leve translucidez e borda sutil de alto contraste:
```css
.glass-card {
  background-color: rgba(15, 23, 42, 0.95);
  border: 1px solid #1e293b;
  border-radius: 1rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}
```

### 3.2. Popups do Mapa em Dark Mode (`.dark-popup`)
Por padrão, o Leaflet gera popups com fundo branco brilhante, que causam cegueira visual no tema escuro. O projeto sobrescreve nativamente esses balões:
* Fundo: Slate 900 (`#0f172a`);
* Borda: Slate 700 (`#334155`);
* Texto: Slate 100 (`#f1f5f9`).

### 3.3. Botões e Ações (`.btn`)
* **`.btn-primary`:** Fundo azul elétrico com brilho difuso (`shadow-[0_0_15px_rgba(59,130,246,0.3)]`).
* **`.btn-danger`:** Fundo vermelho com pulso de atenção (`shadow-[0_0_15px_rgba(239,68,68,0.3)]`).
* **`.btn-secondary`:** Fundo Slate 800 discreto com borda semi-transparente.

---

## 4. Diretrizes de UX por Dispositivo

### 4.1. Mobile PWA (Cidadão)
* **Área de Toque Mínima:** 48x48px para todos os botões e inputs.
* **Fluxo Sem Fricção:** Botão central de emergência com destaque visual imediato.
* **Feedback Tátil/Visual:** Feedback de envio com confirmação de protocolo em cards grandes e legíveis.

### 4.2. Desktop / Central de Operações (Gestores)
* **Layout Split-Pane:** Mapa ocupando a maior parte do viewport, com gaveta lateral retrátil de ocorrências e indicadores numéricos em tempo real no topo.
* **Ícones Semânticos (Lucide):** Utilizados para identificar instantaneamente o tipo de emergência (água, deslizamento, resgate médico, obstáculo na pista).
