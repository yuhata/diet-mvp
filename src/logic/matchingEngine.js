// Step 2: ユーザーアーキタイプ判定
// Step 3: 推奨プロトコル生成

/**
 * Q1の回答からgenderとageを分離
 */
export function parseQ1(answer) {
  const map = {
    '男性20代':     { gender: '男性', age: '男性20代' },
    '男性30代':     { gender: '男性', age: '男性30代' },
    '男性40代':     { gender: '男性', age: '男性40代' },
    '男性50代以上': { gender: '男性', age: '男性50代以上' },
    '女性20〜30代': { gender: '女性', age: '女性20〜30代' },
    '女性40代以上': { gender: '女性', age: '女性40代以上' },
  };
  return map[answer] || { gender: null, age: null };
}

/**
 * rawAnswers (q1〜q9) をロジック用のオブジェクトに変換
 */
export function parseAnswers(raw) {
  const { gender, age } = parseQ1(raw.q1);
  return {
    gender,
    age,
    bodyGoal:     raw.q2 || [],    // 複数選択の配列
    foodPattern:  raw.q3 || [],   // 複数選択の配列
    activity:     raw.q4,
    experience:   raw.q5 || [],   // 複数選択の配列
    failReason:   raw.q6,
    mealTiming:   raw.q7 || [],   // 複数選択の配列
    sleepPattern: raw.q8,
    timeline:     raw.q9,
  };
}

// アーキタイプ定義（上から順に評価、最初にマッチした1つを採用）
const ARCHETYPES = [
  {
    id: 'male_40s_visceral',
    label: '40代男性・内臓脂肪型',
    match: (a) =>
      a.gender === '��性' && a.age === '男性40代' &&
      a.bodyGoal.includes('内臓脂肪・お腹まわり'),
    primary: ['間欠断食 16:8', '低糖質（外食版）', '高タンパク質'],
    secondary: ['腹八分目原則'],
    complement: ['週2回の筋力トレーニング推奨'],
    biologicalContext: ['testosterone_visceral_cycle'],
    ruleCount: 3,
  },
  {
    id: 'athlete_body_comp',
    label: '運動習慣あり・体組成改善型',
    match: (a) =>
      a.activity === '週3回���上は動いている' &&
      (a.bodyGoal.includes('筋肉をつけながら絞りたい') ||
       a.bodyGoal.includes('体重より体脂肪・体組成を改善したい')),
    primary: ['高タンパク質', 'カーボサイクリング'],
    secondary: ['低糖質', '間欠断食 16:8'],
    complement: [],
    biologicalContext: ['muscle_metabolism_diff'],
    ruleCount: 2,
  },
  {
    id: 'hypertension_cvd',
    label: '高血圧・心血管リスク型',
    match: (a) =>
      (a.age === '男性50代以上' || a.age === '女性40代以上') &&
      a.bodyGoal.includes('全体的に体重を落としたい'),
    primary: ['DASH', '地中海食'],
    secondary: ['低糖質', 'フレキシタリアン'],
    complement: [],
    biologicalContext: [],
    ruleCount: 2,
  },
  {
    id: 'female_40s_stress',
    label: '40代以上女性・更年期×ストレス複合型',
    match: (a) =>
      a.gender === '女性' && a.age === '女性40代以上' &&
      a.failReason === 'ストレス過食タイプ（食べると落ち着く）',
    primary: ['マインドフルイーティング', '地中海食'],
    secondary: ['CBT系', '高タンパク質'],
    complement: ['腸活・発酵食品の橋渡し'],
    biologicalContext: ['menopausal_metabolism', 'cortisol_double_hit'],
    ruleCount: 2,
  },
  {
    id: 'female_menopausal',
    label: '40代以降女性・更年期対応型',
    match: (a) =>
      a.gender === '女性' && a.age === '女性40代以上',
    primary: ['地中海食', '高タンパク質'],
    secondary: ['マインドフルイーティング', '和食'],
    complement: ['腸活・発酵食品の積極摂取'],
    biologicalContext: ['menopausal_metabolism'],
    ruleCount: 2,
  },
  {
    id: 'stress_eater',
    label: '感情食・ストレス過食型',
    match: (a) =>
      a.failReason === 'ストレス過食タイプ（食べると落ち着く）',
    primary: ['マインドフルイーティング', 'CBT系'],
    secondary: ['間欠断食 16:8', '腹八分目原則'],
    complement: [],
    biologicalContext: ['cortisol_double_hit'],
    ruleCount: 2,
  },
  {
    id: 'male_50s_plus',
    label: '50代以上男性・健康維���型',
    match: (a) =>
      a.gender === '男性' && a.age === '男性50代以上',
    primary: ['地中海食', '間欠断食 16:8'],
    secondary: ['DASH', '高タンパク質'],
    complement: [],
    biologicalContext: [],
    ruleCount: 2,
  },
  {
    id: 'home_cook_motivated',
    label: '自炊中心・意欲高め型',
    match: (a) =>
      a.foodPattern.includes('自炊中心でコントロールできる') &&
      (a.timeline === '3ヶ月かけてしっかり変えたい' ||
       a.timeline === '半年〜1年で体質改善したい'),
    primary: ['地中海食', 'CICO'],
    secondary: ['低糖質', '高タンパク質'],
    complement: [],
    biologicalContext: [],
    ruleCount: 2,
  },
  {
    id: 'female_young_pms',
    label: '20〜30代女性・PMS・月経周期型',
    match: (a) =>
      a.gender === '女性' && a.age === '女性20〜30代' &&
      (a.failReason === 'ストレス過食タイプ（食べると落ち着く���' ||
       a.foodPattern.includes('間食・甘いものがやめられない')),
    primary: ['マインドフルイーティング', '低糖質'],
    secondary: ['和食', '高タンパク質'],
    complement: ['鉄分リッチ食品の積極摂取'],
    biologicalContext: ['female_pms_cycle'],
    ruleCount: 2,
  },
  {
    id: 'female_mystery_iron',
    label: '女性・食欲消極的・痩せない型',
    match: (a) =>
      a.gender === '女性' &&
      a.failReason === '食欲自体は強くないが痩せない',
    primary: ['日本人特性配慮型', '低糖質'],
    secondary: ['和食', 'CGM連携型'],
    complement: ['鉄分・甲状腺チェック推奨'],
    biologicalContext: ['female_iron_fatigue', 'japanese_low_bmi_visceral'],
    ruleCount: 2,
  },
  {
    id: 'female_young',
    label: '20〜30代女性・体重管理型',
    match: (a) =>
      a.gender === '女性' && a.age === '女性20〜30代',
    primary: ['低糖質', 'マインドフルイーティング'],
    secondary: ['間欠断食 16:8', 'フレキシタリアン'],
    complement: [],
    biologicalContext: [],
    ruleCount: 2,
  },
  {
    id: 'busy_diner',
    label: '外食ビジネスパーソン型',
    match: (a) =>
      a.foodPattern.includes('不規則（外食・会食多い）'),
    primary: ['間欠断食 16:8', '低糖質（外食版）'],
    secondary: ['腹八分目原則'],
    complement: ['飲酒マネジメント'],
    biologicalContext: [],
    ruleCount: 2,
  },
  {
    id: 'busy_chaotic',
    label: '多忙・食事が雑になる型',
    match: (a) =>
      a.failReason === '忙しくて食事が雑になるタイプ',
    primary: ['間欠断食 16:8', '腹八分目原則'],
    secondary: ['���糖質（外食版）'],
    complement: [],
    biologicalContext: [],
    ruleCount: 1,
  },
  {
    id: 'mystery_no_appetite',
    label: '食欲は強くないが痩せないタイプ',
    match: (a) =>
      a.failReason === '食欲自体は強くないが痩せない',
    primary: ['日本人���性配慮型', '低糖質'],
    secondary: ['CGM連携型', '和食'],
    complement: ['代謝・血糖チェック推奨'],
    biologicalContext: ['japanese_low_bmi_visceral'],
    ruleCount: 2,
  },
  {
    id: 'knowledge_no_action',
    label: '理屈はわかるが続かな��タイプ',
    match: () => true, // デフォルト
    primary: ['間欠断食 16:8', '腹八分目原則'],
    secondary: ['低糖��（外食版）'],
    complement: ['CBT系'],
    biologicalContext: [],
    ruleCount: 1,
  },
];

/**
 * アーキタイプを判定
 */
export function determineArchetype(answers) {
  for (const arch of ARCHETYPES) {
    if (arch.match(answers)) {
      return arch;
    }
  }
  return ARCHETYPES[ARCHETYPES.length - 1]; // knowledge_no_action
}

// アーキタイプ別のルール文テンプレート
const RULE_TEMPLATES = {
  male_40s_visceral: {
    rules: [
      { text: '正午前は食べない（16:8）', detail: 'コーヒー・水はOK。外食・会食は夜なので自然に機能する。' },
      { text: '夜の主食は最後か少量だけ', detail: '居酒屋でも実行可能。締めのラーメン・チャーハンをやめるだけ。' },
      { text: '1食に手のひら基準のタンパ��質', detail: '筋肉維持×内臓脂肪減少の両立。大豆製品・魚・肉・卵は外食でも応用可。' },
    ],
    conditionalRules: [
      { condition: (a) => a.foodPattern.includes('飲酒の機会が多い（週3回以���）'), text: 'ビール2杯まで→ハイボールor赤ワインに切り替え', detail: '飲んだ後に食べない（水で満たす）。' },
    ],
  },
  athlete_body_comp: {
    rules: [
      { text: 'タンパク質：体重×1.6g/日を目安', detail: '運動の効果を最大化するための摂取量。' },
      { text: '運動日：炭水化物OK / 休養日：糖質控えめ', detail: '筋肉合成と脂肪燃焼を両立するタイミング戦略。' },
    ],
    conditionalRules: [],
  },
  female_40s_stress: {
    rules: [
      { text: '食べる前に3回深呼吸してから座る', detail: '感情的な引き金と生理的な空腹を区別するための間を作る。' },
      { text: '発酵食品を毎日1品（納豆・味噌・ヨーグ���ト）', detail: '腸内環境とストレスホルモンの関係を整える。' },
    ],
    conditionalRules: [],
  },
  stress_eater: {
    rules: [
      { text: '食��る前に3回深呼吸し���から座る', detail: '感情的な引き金��生理的な空腹を区別するための間を作る。' },
      { text: '「何を感じているか」を1行だけメモ', detail: 'カロリーではなく感情パターンの把握が目的。' },
    ],
    conditionalRules: [],
  },
  female_menopausal: {
    rules: [
      { text: '1食に植物性たんぱく質（豆腐・豆類）を入れる', detail: '更年期の筋肉量維持と代謝サポート。' },
      { text: '発��食品を毎日1品（納豆・味噌・ヨーグルト）', detail: '腸内環境を整え、ホルモンバランスをサポー���。' },
    ],
    conditionalRules: [
      { condition: (a) => !a.foodPattern.includes('不規則（���食・会食多い）'), text: '地中海食のオリーブオイルを調理に使う', detail: '抗炎症作用と心血管保護。' },
    ],
  },
  hypertension_cvd: {
    rules: [
      { text: '塩分を「味付け前に半量」ルールで減塩', detail: '血圧管理の最も効果的な食事アプローチ。' },
      { text: '野菜を先に食べる（食後血糖の安定）', detail: '食物繊維が血糖値の急上昇を抑える。' },
    ],
    conditionalRules: [
      { condition: (a) => !a.foodPattern.includes('不規則（外食・会食多い）'), text: 'DASH食材リストで買い物', detail: 'カリウム・マグネシウム・食物繊維が豊富な食材を選ぶ。' },
    ],
  },
  male_50s_plus: {
    rules: [
      { text: '正午前は食べない（16:8）', detail: '食べるタイミングを制御するだけで代謝効率が改善。' },
      { text: '1食にタンパク質源を必ず入れる', detail: '筋肉量の維持が50代以降の代謝の鍵。' },
    ],
    conditionalRules: [],
  },
  home_cook_motivated: {
    rules: [
      { text: '週3回は地中海食レシピから選ぶ', detail: '最もエビデンスが強い長期健康食���' },
      { text: 'タンパク質・野菜・炭水化物の比率を意識', detail: '自炊力を最大限に活かした体質改善。' },
    ],
    conditionalRules: [
      { condition: (a) => a.failReason !== '理屈はわかるが行動が続かないタイプ', text: '食事記録をつける（このタイプには有効）', detail: '意欲が高い人には記録が強力なツールになる。' },
    ],
  },
  female_young_pms: {
    rules: [
      { text: '月経前1週間はルールを緩めてOK', detail: '黄体期の食欲増加はホルモンが原因。責めないことが継続の鍵。' },
      { text: '夜の主食は半量以下にする', detail: '糖質への渇望を穏やかに抑える。' },
    ],
    conditionalRules: [],
  },
  female_mystery_iron: {
    rules: [
      { text: '早食いをやめる（よく噛む）', detail: 'インスリン抵抗性の改善に直結。' },
      { text: '鉄分チェック（血液検査でフェリチン値）', detail: '代謝の基盤を確認することが最短経路。' },
    ],
    conditionalRules: [],
  },
  female_young: {
    rules: [
      { text: '夜の主食は半量以下にする', detail: '極端な制限なしに体重管理できる最もシンプルなルール。' },
      { text: '食べるスピードを意識的にゆっくりに', detail: '満腹感を感じるまでのタイムラグを活かす。' },
    ],
    conditionalRules: [
      { condition: (a) => a.foodPattern.includes('不規則（外食・会食多い）'), text: '間欠断食16:8を追加', detail: '外食環境でも正午前ルールだけで機能する。' },
    ],
  },
  busy_diner: {
    rules: [
      { text: '正午前��食べない（16:8）', detail: '起床から正午までの空白時間でコントロール。' },
      { text: '夜の主食は最後か少量だけ', detail: '外食でも実行可能なルール。' },
    ],
    conditionalRules: [
      { condition: (a) => a.foodPattern.includes('飲酒の機会が多い（週3回以上）'), text: '飲んだ後は食べない（水で満たす）', detail: 'アルコール後の追加カロリーを構造的にカット。' },
    ],
  },
  busy_chaotic: {
    rules: [
      { text: '正午前は食べない（16:8）', detail: '判断不要。時間だけで決まるルール��' },
      { text: '「これ以上は食べない」を1品決める', detail: '決断の数を極限まで減らす。' },
    ],
    conditionalRules: [],
  },
  mystery_no_appetite: {
    rules: [
      { text: '早食いをやめ��（よく噛む）', detail: '日本人の早食いとインスリン抵��性の関連が研究で確認。' },
      { text: '夜の主食を低GI食材に変える', detail: '血糖値の安定化で内臓脂肪蓄積を抑制。' },
    ],
    conditionalRules: [
      { condition: () => true, text: '血糖・代謝チェックを推奨', detail: '医療機関での検査が最短経路の��能性。' },
    ],
  },
  knowledge_no_action: {
    rules: [
      { text: '「やめること」を1つだけ決める', detail: '新しい行動を追加しない。認知負荷をゼロにする。' },
      { text: '2週間だけ試す（期限を切る）', detail: '永遠にやる必要はない。まず2週間だけ。' },
    ],
    conditionalRules: [],
  },
};

/**
 * アーキタイプと除外結果からルール文��生成
 */
export function generateRules(archetype, answers) {
  const template = RULE_TEMPLATES[archetype.id] || RULE_TEMPLATES.knowledge_no_action;
  const rules = [...template.rules];

  for (const cr of template.conditionalRules) {
    if (cr.condition(answers)) {
      rules.push(cr);
    }
  }

  return rules.slice(0, 3); // 最大3つ
}

/**
 * 除外された理論がprimaryに含まれる場合、secondaryに格下げ
 */
export function getRecommendedTheories(archetype, excludedTheories) {
  const excludedSet = new Set(excludedTheories.map(e => e.theory));
  const recommended = [];

  // primaryから除外されていないものを追加
  for (const t of archetype.primary) {
    if (!excludedSet.has(t)) {
      recommended.push(t);
    }
  }

  // primaryがすべて除外された場合、secondaryから補充
  if (recommended.length === 0) {
    for (const t of archetype.secondary) {
      if (!excludedSet.has(t)) {
        recommended.push(t);
      }
    }
  }

  // それでも空なら腹八分目原則 + 間欠断食16:8
  if (recommended.length === 0) {
    recommended.push('腹八分目原���', '間欠断食 16:8');
  }

  return recommended;
}
