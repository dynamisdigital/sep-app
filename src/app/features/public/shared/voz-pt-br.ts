// Escolha da voz do navegador para a leitura em áudio. Mesma regra do leitor do projeto Ponte de Liquidez:
// voz feminina em português do Brasil, preferindo as "naturais" ou online; vozes masculinas conhecidas nunca
// são escolhidas. Sem voz feminina reconhecida, usa a primeira que não seja masculina, e o componente sobe o tom.

const FEMININAS = [
  /francisca.*(natural|online)/i,
  /thalita.*(natural|online)/i,
  /(natural|online).*(francisca|thalita)/i,
  /francisca/i,
  /thalita/i,
  /\bmaria\b/i,
  /vit[oó]ria/i,
  /google.*portugu[eê]s.*brasil/i,
  /luciana/i,
  /fernanda/i,
  /camila/i,
  /helena/i,
];
const MASCULINAS =
  /antonio|ant[oô]nio|daniel|felipe|ricardo|donato|humberto|julio|j[uú]lio|m[aá]rcio|marcio|male\b|masculin/i;

export interface VozEscolhida {
  voz: SpeechSynthesisVoice | null;
  /** Voz reconhecida como feminina. Quando falso, o tom sobe um pouco para a fala não soar grave. */
  feminina: boolean;
}

export function escolherVoz(vozes: SpeechSynthesisVoice[]): VozEscolhida {
  const pt = vozes.filter((v) => v.lang && v.lang.toLowerCase().replace('_', '-').startsWith('pt'));
  const ptBr = pt.filter((v) => /pt-br/i.test(v.lang.replace('_', '-')));
  const grupo = (ptBr.length ? ptBr : pt).filter((v) => !MASCULINAS.test(v.name));
  for (const re of FEMININAS) {
    const achada = grupo.find((v) => re.test(v.name));
    if (achada) return { voz: achada, feminina: true };
  }
  return { voz: grupo[0] ?? ptBr[0] ?? pt[0] ?? null, feminina: false };
}
