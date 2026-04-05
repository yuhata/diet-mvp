// Step 1: 除外ルール（全12条件）
// Q1〜Q9の回答から「構造的に機能しない理論」を落とす

const EXCLUSION_RULES = [
  // E1: 食環境系
  {
    id: 'E1',
    theory: 'CICO',
    condition: (a) => a.foodPattern.includes('不規則（外食・会食多い）'),
    reason: '外食・会食が多い環境では、カロリー計測は構造的に不可能です。続かないのは意志力の問題ではなく、道具の選択ミスです。',
  },
  // E2
  {
    id: 'E2',
    theory: '地中海食',
    condition: (a) => a.foodPattern.includes('不規則（外食・会食多い）'),
    reason: '食材指定（オリーブオイル・全粒穀物等）が居酒屋・会食に非対応。日本の外食環境には対応できません。',
  },
  // E3
  {
    id: 'E3',
    theory: 'DASH',
    condition: (a) => a.foodPattern.includes('不規則（外食・会食多い）'),
    reason: '塩分・脂質・食材の細かい管理が外食環境では不可能です。',
  },
  // E4
  {
    id: 'E4',
    theory: 'ケトジェニック',
    condition: (a) =>
      a.foodPattern.includes('不規則（外食・会食多い）') ||
      a.foodPattern.includes('飲酒の機会が多い（週3回以上）'),
    reason: '糖質20g以下の維持が飲み会・外食で即崩壊します。継続は構造的に困難です。',
  },
  // E5
  {
    id: 'E5',
    theory: '低脂肪',
    condition: (a) =>
      a.foodPattern.includes('飲酒の機会が多い（週3回以上）') ||
      a.foodPattern.includes('不規則（外食・会食多い）'),
    reason: 'アルコールは脂肪として代謝されます。飲み会・外食との相性は最悪です。',
  },
  // E6
  {
    id: 'E6',
    theory: 'プラントベース',
    condition: (a) => a.foodPattern.includes('不規則（外食・会食多い）'),
    reason: '接待・居酒屋で動物性食品を完全回避するのは社会的に困難です。',
  },
  // E7: 行動パターン系
  {
    id: 'E7',
    theory: '食事記録アプリ',
    condition: (a) => a.failReason === '理屈はわかるが行動が続かないタイプ',
    reason: '記録という新しいタスクの追加は、このタイプの離脱を加速します。',
  },
  // E8
  {
    id: 'E8',
    theory: 'カーボサイクリング',
    condition: (a) =>
      a.activity !== '週3回以上は動いている' ||
      a.failReason === '忙しくて食事が雑になるタイプ',
    reason: '週単位の糖質管理はトレーニング計画と連動しなければ意味がありません。',
  },
  // E9
  {
    id: 'E9',
    theory: 'ADF',
    condition: (a) =>
      a.foodPattern.includes('不規則（外食・会食多い）') ||
      a.failReason === '忙しくて食事が雑になるタイプ',
    reason: '断食日に会食が入った場合の対処が困難。社会生活との摩擦が大きいです。',
  },
  // E10: 睡眠・ホルモン系
  {
    id: 'E10',
    theory: 'CICO',
    condition: (a) =>
      a.sleepPattern === '5時間以下、または深夜に仕事することが多い',
    reason: '睡眠不足時はグレリン（食欲増進ホルモン）が最大22%上昇し、カロリー制限の継続は生物学的に困難です。「意志力の問題」ではなく、ホルモンの問題です。',
  },
  // E11
  {
    id: 'E11',
    theory: 'CICO',
    condition: (a) =>
      a.age === '男性40代' &&
      a.bodyGoal === '内臓脂肪・お腹まわり' &&
      a.activity === '週3回以上は動いている',
    reason: '運動しているのに内臓脂肪が減りにくい場合、テストステロン低下による代謝変化が主因の可能性があります。カロリーを減らすだけではこの悪循環は切れません。',
  },
  // E12: 年齢系
  {
    id: 'E12',
    theory: 'MIND',
    condition: (a) =>
      a.age === '男性20代' || a.age === '男性30代' || a.age === '女性20〜30代',
    reason: 'MINDは認知機能保護が主目的。30代以下では他の理論が有効性で上回ります。',
  },
];

/**
 * 除外ルールを適用し、除外された理論のリストを返す
 * @param {Object} answers - パース済み回答オブジェクト
 * @returns {Array<{theory: string, reason: string, ruleId: string}>}
 */
export function applyExclusionRules(answers) {
  const excluded = [];
  const seenTheories = new Set();

  for (const rule of EXCLUSION_RULES) {
    if (rule.condition(answers) && !seenTheories.has(rule.theory)) {
      seenTheories.add(rule.theory);
      excluded.push({
        theory: rule.theory,
        reason: rule.reason,
        ruleId: rule.id,
      });
    }
  }

  return excluded;
}

/**
 * 除外カードが2枚未満の場合の補充カード
 */
const ALTERNATIVE_CARDS = {
  home_cook_motivated: [
    { theory: 'ADF', reason: '隔日断食は実行可能ですが、社会生活との摩擦が大きく、長期の継続には向いていません。あなたの自炊力を活かせる理論の方が効果的です。' },
    { theory: 'ケトジェニック', reason: '短期的な効果は高いですが、極端な糖質制限は長期的な維持が困難です。あなたの意欲の高さを活かすなら、より持続可能な方法があります。' },
  ],
  athlete_body_comp: [
    { theory: 'CICO', reason: 'カロリー計算は有効ですが、体組成改善にはタンパク質の量とタイミングの方が重要です。' },
    { theory: '間欠断食 16:8', reason: '運動パフォーマンスに影響する可能性があります。トレーニングと栄養の連動を優先します。' },
  ],
  female_menopausal: [
    { theory: 'ケトジェニック', reason: '短期的には効果がありますが、更年期の女性には骨密度維持の観点から、よりバランスの取れた食事法が推奨されます。' },
    { theory: 'ADF', reason: 'ホルモン変動が大きい時期に厳格な断食は、ストレスホルモンをさらに増加させるリスクがあります。' },
  ],
  hypertension_cvd: [
    { theory: 'ケトジェニック', reason: '高脂肪食は心血管リスクがある場合には推奨されません。DASH・地中海食の方が安全で効果的です。' },
    { theory: 'カーボサイクリング', reason: '運動計画との連動が前提のため、体重管理が主目的の場合は不要な複雑さです。' },
  ],
  default: [
    { theory: 'ケトジェニック', reason: '短期的な効果は高いですが、日本の食文化との相性が悪く、長期継続が困難な理論です。' },
    { theory: 'ADF', reason: '隔日断食は社会生活との摩擦が大きく、継続ハードルが高い理論です。' },
  ],
};

export function getAlternativeCards(archetypeId) {
  return ALTERNATIVE_CARDS[archetypeId] || ALTERNATIVE_CARDS.default;
}
