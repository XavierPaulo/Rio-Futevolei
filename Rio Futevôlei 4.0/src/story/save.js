// 4.0 Modo História — jogo salvo (3 vagas no navegador).
import { freshCondition } from '../condition.js';
import { rollWeather } from '../condition.js';
import { HOODS } from './data.js';

const KEY = n => 'rio-futevolei.story.' + n;
export const SLOTS = [1, 2, 3];

// jogo novo: players = 1 (Giulia) ou 2 (Giulia e Zefa) · difficulty = 'facil' | 'medio' | 'dificil'
export function newSave(slot, players, difficulty) {
  return {
    v: 1, slot, players, difficulty,
    chapter: 'urca', step: 'intro', // etapa do roteiro (src/story/story.js)
    day: 1, time: 7 * 60, hood: 'urca', x: 4.5,
    money: 30,
    weather: [], weatherNext: rollWeather(), // clima de hoje e o de amanhã (a lotérica anuncia)
    cond: { giulia: freshCondition(), zefa: { ...freshCondition(), immune: true } }, // a Zefa não sente fome nem sede
    bag: {},          // consumíveis na mochila { id: quantidade }
    owned: ['regataRoxa', 'shortRoxo', 'oculosEstrela'], // roupas compradas (Moda)
    wear: { blusa: 'regataRoxa', short: 'shortRoxo', cabeca: 'oculosEstrela' },
    // especiais aprendidos e os equipados (□□ ataque, ○○ defesa); null = nenhum
    specials: {
      giulia: { attack: ['bicicleta'], defense: [], eq: { attack: 'bicicleta', defense: null } },
      zefa: { attack: [], defense: ['meiaBicicleta'], eq: { attack: null, defense: 'meiaBicicleta' } },
    },
    ct: { urca: { round: 0, done: false } },
    busOpen: false,  // ônibus na Urca (depois das obras, no fim do campeonato do CT)
    gear: [],        // artigos esportivos comprados
    rio: { next: 0 }, // Rio Futevôlei: próxima partida (0..9)
    challenged: {},  // desafios de CT: bairro → dia do último desafio
    train: { day: 0, count: 0 }, // academia: vezes que malhou no dia
    lottery: [], // últimos bilhetes
    savedAt: 0,
  };
}

export function writeSave(s) {
  s.savedAt = Date.now();
  try { localStorage.setItem(KEY(s.slot), JSON.stringify(s)); return true; } catch { return false; }
}
export function readSave(slot) {
  try { const s = JSON.parse(localStorage.getItem(KEY(slot)) || 'null'); return s && s.v === 1 ? s : null; } catch { return null; }
}
export function deleteSave(slot) { try { localStorage.removeItem(KEY(slot)); } catch { /* ignora */ } }

// resumo de uma vaga para os menus
export function slotLabel(slot) {
  const s = readSave(slot);
  if (!s) return { empty: true, text: 'vazia' };
  const hh = String(Math.floor(s.time / 60)).padStart(2, '0'), mm = String(Math.floor(s.time % 60)).padStart(2, '0');
  const diff = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' }[s.difficulty];
  return { empty: false, text: `Dia ${s.day} · ${hh}:${mm} · ${(HOODS[s.hood] || { name: s.hood }).name} · R$ ${s.money} · ${diff} · ${s.players === 2 ? '2 jogadores' : '1 jogador'}` };
}
