import { applyMergeRules } from './src/lib/pipeline.ts';
import { calculateStats } from './src/lib/stats.ts';

const transactions = [{ id: '1', date: '2023-01-01', name: '朱晓琳', amount: 100 }];
const mergeRules = [{ id: 'r1', targetName: '朱晓琳', aliases: ['朱晓琳'], gender: 'girl' as const }];

const { normalized } = applyMergeRules(transactions, mergeRules);
console.log('Normalized transaction:', normalized[0]);

const stats = calculateStats(normalized);
console.log('Player Stats:', stats.playerStats['朱晓琳']);
