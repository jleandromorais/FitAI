/**
 * Junta classes condicionais descartando falsy.
 *
 * Não faz merge de conflitos como tailwind-merge — a convenção do projeto é
 * escolher a classe vencedora no ponto de chamada (ternário) em vez de
 * empilhar duas concorrentes e depender da ordem de resolução.
 */
export type ClassValue = string | false | null | undefined;

export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
