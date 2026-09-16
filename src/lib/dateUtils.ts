/**
 * Utilitários para tratamento e exibição humanizada de datas e tempos relativos
 */

/**
 * Retorna o tempo decorrido de forma humanizada e progressiva:
 * - Menos de 15 segundos: "poucos segundos"
 * - Segundos: "X segundos"
 * - Minutos: "1 minuto" ou "X minutos"
 * - Horas: "1 hora" ou "X horas"
 * - Dias: "1 dia" ou "X dias"
 * - Semanas: "1 semana" ou "X semanas"
 * - Meses: "1 mês" ou "X meses"
 * - Anos: "1 ano" ou "X anos"
 */
export function formatTimeAgo(dateInput: string | Date | number | null | undefined): string {
  if (!dateInput) return "recentemente";

  const date = new Date(dateInput);
  const timestamp = date.getTime();
  if (isNaN(timestamp)) return "recentemente";

  const now = Date.now();
  const diffInSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));

  if (diffInSeconds < 15) {
    return "poucos segundos";
  }

  if (diffInSeconds < 60) {
    return `${diffInSeconds} segundos`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes === 1) {
    return "1 minuto";
  }
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minutos`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours === 1) {
    return "1 hora";
  }
  if (diffInHours < 24) {
    return `${diffInHours} horas`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) {
    return "1 dia";
  }
  if (diffInDays < 7) {
    return `${diffInDays} dias`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks === 1) {
    return "1 semana";
  }
  if (diffInWeeks < 4) {
    return `${diffInWeeks} semanas`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths === 1) {
    return "1 mês";
  }
  if (diffInMonths < 12) {
    return `${diffInMonths} meses`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  if (diffInYears === 1) {
    return "1 ano";
  }
  return `${diffInYears} anos`;
}

/**
 * Retorna o status de abertura humanizado, como:
 * "Aberto há poucos segundos", "Aberto há 15 minutos", "Aberto há 2 horas", "Aberto há 2 dias", etc.
 */
export function formatOpenedAgo(dateInput: string | Date | number | null | undefined): string {
  const time = formatTimeAgo(dateInput);
  if (time === "poucos segundos") {
    return "Aberto há poucos segundos";
  }
  return `Aberto há ${time}`;
}
