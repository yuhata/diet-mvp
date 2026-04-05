// Cloudflare Workers — Claude API プロキシ
// デプロイ: wrangler secret put ANTHROPIC_API_KEY && wrangler deploy

// アーキタイプ別の科学的知見（リサーチデータベースから抽出）
const ARCHETYPE_KNOWLEDGE = {
  male_40s_visceral: `【40代男性・内臓脂肪型の科学的背景】
- テストステロンは30歳以降年間2-3%低下。内臓脂肪↑→テストステロン↓→さらに内臓脂肪↑の悪循環
- テストステロン療法で内臓脂肪減少をRCTで確認（p=0.001）
- 低糖質>低脂肪：内臓脂肪の減少効果（12ヶ月RCT）
- 早食いが独立してインスリン抵抗性と関連（日本人中年男性研究）
- 間欠断食16:8はインスリン感受性を改善し、内臓脂肪を優先的に減少させる
- 高タンパク質（体重×1.6g）で筋肉量維持しながら脂肪減少が可能`,

  athlete_body_comp: `【運動習慣あり・体組成改善型の科学的背景】
- 筋肉量1kg増加で基礎代謝が1日50-100kcal向上
- カーボサイクリング：運動日に糖質を集中させることで筋合成を最大化
- タンパク質摂取タイミング：運動後30分以内が筋合成のゴールデンタイム
- 体重が同じでも体脂肪率が下がれば見た目と代謝が劇的に変わる
- 過度なカロリー制限は筋肉量低下を招き逆効果`,

  female_40s_stress: `【40代以上女性・更年期×ストレス複合型の科学的背景】
- エストロゲン低下で脂肪分布が変化（皮下脂肪→内臓脂肪）、基礎代謝低下
- ストレス×睡眠不足でコルチゾール上昇→インスリン増加→腹部脂肪蓄積促進
- マインドフルイーティングは感情食パターンの根本を変える
- 発酵食品（納豆・味噌）が腸内環境を介してストレスホルモンを調整
- 高タンパク質＋地中海食の組み合わせが更年期以降の女性に特に有効`,

  stress_eater: `【感情食・ストレス過食型の科学的背景】
- カロリー制限がコルチゾール感受性を高め、高脂肪・高カロリー食への報酬感受性を増大
- 「完璧主義的思考」「オールオアナッシング思考」が最大のリバウンド要因
- CBT（認知行動療法）系アプローチがリバウンド防止に最もエビデンス強い
- 「食べる前の3呼吸」は感情的引き金と生理的空腹を区別する間を作る
- 崩れた日を「失敗」ではなく「データ収集」と再定義することが継続の鍵
- インプリメンテーション・インテンション（事前に行動を決める）が継続率を2倍にする`,

  female_menopausal: `【40代以降女性・更年期対応型の科学的背景】
- エストロゲン低下で基礎代謝が低下、同じ食事量でも体重増加
- 脂肪分布が変化：皮下脂肪→内臓脂肪に移行
- 地中海食×高タンパク質が更年期以降の女性に最もエビデンスが強い
- 発酵食品・腸活が更年期症状の緩和に寄与
- 骨密度維持のためカルシウム・ビタミンDも意識すべき`,

  hypertension_cvd: `【高血圧・心血管リスク型の科学的背景】
- DASHダイエットは医学的裏付けが最も高い食事療法
- 減塩は収縮期血圧を最大18.6mmHg改善（系統的レビュー）
- 野菜を先に食べることで食後血糖の急上昇を抑制
- カリウム・マグネシウム・食物繊維の摂取増加が血圧改善に直結
- 体重1kg減少で血圧が約1mmHg低下`,

  male_50s_plus: `【50代以上男性・健康維持型の科学的背景】
- 50歳以降、筋肉量は年間1-2%低下（サルコペニア）
- 一度失った筋肉は高齢になるほど取り戻しにくい
- 間欠断食16:8は代謝効率を改善し、食事のタイミング制御だけで効果
- タンパク質摂取を1食に集中より分散した方が筋合成に有効
- 地中海食は心血管・認知機能・体重管理すべてに長期エビデンス`,

  home_cook_motivated: `【自炊中心・意欲高め型の科学的背景】
- 地中海食は最強の長期エビデンスを持つ食事法
- 自炊環境×意欲の高さ=記録系ダイエットが最も機能するパターン
- CICO（カロリー収支）は全ダイエットの土台、自炊なら計測可能
- 「週3回は地中海食レシピ」というルール化が継続の鍵
- 栄養バランスを意識した自炊は腸内フローラ改善→代謝向上の好循環`,

  female_young_pms: `【20〜30代女性・PMS・月経周期型の科学的背景】
- 排卵後〜月経前の黄体期にプロゲステロン上昇→糖質渇望・食欲増加
- 月経前の「食べすぎ」は意志力ではなくホルモンサイクルが原因
- 月経前1週間はルールを緩めることが継続の鍵
- 日本人女性の30-40%が鉄欠乏→代謝低下の悪循環
- 鉄分リッチ食品（あさり・ひじき・豆腐・レバー）の積極摂取が有効`,

  female_mystery_iron: `【女性・食欲消極的・痩せない型の科学的背景】
- 日本人女性の30-40%が鉄欠乏状態
- 鉄欠乏→筋肉への酸素供給低下→活動量低下→代謝低下の悪循環
- フェリチン値チェックがダイエット以前の最優先事項
- 日本人はBMIが低くても内臓脂肪が蓄積しやすい東アジア特性
- 早食いが独立してインスリン抵抗性と関連`,

  female_young: `【20〜30代女性・体重管理型の科学的背景】
- 極端な制限はレプチン（満腹ホルモン）を急低下させ、リバウンドの原因に
- 代謝率は過度なカロリー制限で15-20%低下し、数ヶ月〜数年持続
- 「食べるスピードを遅くする」だけで自然に摂取量が減る研究結果あり
- マインドフルイーティングは量の判断力を育てる
- 小さな習慣の積み重ねが長期的な体質改善に最も効果的`,

  busy_diner: `【外食ビジネスパーソン型の科学的背景】
- 外食では正確なカロリー計測が構造的に不可能→CICO系は機能しない
- 間欠断食16:8は「食べない時間」だけの制御で外食環境でも完全に機能
- 低糖質ルール（主食を最後か少量）は居酒屋でも実行可能
- 飲酒後の追加食事が最大のカロリー源（締めのラーメン等）
- 「ビール2杯→ハイボール切替」で糖質カロリーを約40%削減`,

  busy_chaotic: `【多忙・食事が雑になる型の科学的背景】
- 「忙しくて時間がない」が健康な食習慣の最大の妨げ（27.5%が回答）
- 「面倒くさい」が2位（25.3%）
- 決断疲れ（Decision Fatigue）が食事の質を下げる主原因
- ルール数を最小化し「やめること」だけ決める→認知負荷ゼロ
- 腹八分目原則（沖縄式）は認知負荷ゼロで実行可能`,

  mystery_no_appetite: `【食欲は強くないが痩せないタイプの科学的背景】
- 日本人はBMIが低くても内臓脂肪が蓄積しやすい東アジア特有の体質
- 早食いが独立してインスリン抵抗性と関連（日本人研究）
- 甲状腺機能低下が隠れた原因の可能性→血液検査推奨
- 低GI食材への切替で血糖値安定→内臓脂肪蓄積を抑制
- 日本DRI基準の栄養介入で食事を完全見直しせずに内臓脂肪が有意に減少`,

  knowledge_no_action: `【理屈はわかるが続かないタイプの科学的背景】
- ダイエット経験回数が多いほど将来の体重増加リスクが高まる
- 習慣形成には平均66日（18〜254日）かかる（UCL研究。21日説は誤り）
- 「やらないこと」を決める方が「やること」を追加するより認知負荷が低く続きやすい
- インプリメンテーション・インテンション（いつ・どこで・何をするか事前決定）が継続率を2倍にする
- トリガー→ルーティン→報酬のループ設計が鍵`,
};

// フェーズ別のメンタリング指示
function getPhaseInstruction(day) {
  if (day <= 3) return `【習慣形成期（Day 1-3）】ルールに慣れることが最優先。完璧を求めず「やってみた」だけで十分。脳が新しいパターンを学習している段階。`;
  if (day <= 7) return `【定着期（Day 4-7）】ルールが少しずつ自動化し始める時期。「判断しなくても動ける」感覚が出てきたら順調。崩れた日があっても翌日再開すればOK。`;
  if (day <= 10) return `【加速期（Day 8-10）】脂肪燃焼が本格化し始める時期。体重の変化より体感（服のゆとり・朝の軽さ）に注目。`;
  return `【安定期（Day 11-14）】習慣がほぼ定着。2週間後の自分を振り返る準備段階。「このまま続けられるか」を意識する時期。`;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const {
        archetype, day, status, memo, protocols,
        profile, targetWeight, recentDays,
        foodPattern, failReason, mealTiming, tomorrowPlan,
      } = await request.json();

      const knowledge = ARCHETYPE_KNOWLEDGE[archetype] || ARCHETYPE_KNOWLEDGE.knowledge_no_action;
      const phase = getPhaseInstruction(day);

      // ユーザーコンテキスト構築
      let userContext = '';
      if (profile) {
        userContext += `身長: ${profile.height || '?'}cm、体重: ${profile.weight || '?'}kg`;
        if (profile.waist) userContext += `、ウエスト: ${profile.waist}cm`;
        if (targetWeight) userContext += `、目標体重: ${targetWeight}kg`;
        userContext += '\n';
      }

      // 直近の記録パターン
      let patternNote = '';
      if (recentDays && recentDays.length > 0) {
        const failedRulesCount = {};
        for (const rd of recentDays) {
          if (rd.failedRules) {
            for (const r of rd.failedRules) {
              failedRulesCount[r] = (failedRulesCount[r] || 0) + 1;
            }
          }
        }
        const repeated = Object.entries(failedRulesCount)
          .filter(([_, count]) => count >= 2)
          .map(([rule]) => rule);
        if (repeated.length > 0) {
          patternNote = `⚠️ 連続して守れていないルール: ${repeated.join('、')}（構造的な障壁がある可能性）\n`;
        }
      }

      // 食環境コンテキスト
      let foodContext = '';
      if (foodPattern && foodPattern.length > 0) {
        foodContext = `食生活: ${foodPattern.join('、')}\n`;
      }
      if (failReason) foodContext += `続かない理由: ${failReason}\n`;
      if (mealTiming && mealTiming.length > 0) {
        foodContext += `食事タイミング: ${mealTiming.join('、')}\n`;
      }

      const systemPrompt = `あなたはダイエットメンターです。世界中のダイエット理論を横断リサーチした科学的知見に基づき、この人だけに合ったアドバイスをします。

## このユーザーの具体的な状況
タイプ: ${archetype}
推奨プロトコル: ${(protocols || []).join('、')}
${userContext}${foodContext}
## 科学的知見（このユーザータイプに関連する研究結果）
${knowledge}

## 現在のフェーズ
${phase}

## 状況別の具体的メニュー知識
【外食・居酒屋】低糖質: 刺身、焼き鳥（塩）、冷奴、枝豆、焼き魚、サラダ。避ける: 締めのラーメン・チャーハン・うどん
【コンビニ】低糖質: サラダチキン、ゆで卵、ブランパン、ナッツ、チーズ。避ける: おにぎり2個以上、菓子パン
【ファミレス】低糖質: ハンバーグ（ライス抜きor半量）、サラダバー、グリルチキン。ライスをスープに変更
【自炊】低糖質: 鶏胸肉のソテー、豆腐ステーキ、サバ缶サラダ、卵料理全般。主食を豆腐やカリフラワーライスに置換
【飲酒時】ビール2杯→ハイボール/赤ワインに切替。つまみ: 枝豆・刺身・焼き鳥。飲み後の締め→水+ナッツで代替
【間欠断食中の朝】OK: 水、ブラックコーヒー、緑茶。NG: 砂糖入り飲料、牛乳入りカフェラテ（少量ならOK）
【高タンパク質】1食の目安=手のひらサイズの肉or魚。卵2個。納豆+豆腐。プロテインドリンク

## 回答ルール
- 4-5文の日本語で返す
- 1文目: 今日の状況への端的な評価（「あなたの場合」「あなたの食環境では」等、パーソナルに）
- 2文目: 関連する科学的知見を1つ引用して「なぜそうなるか」を説明
- 3文目: 明日の具体的な1アクション（具体的なメニュー名や食品名を必ず含める）
- 4文目: フェーズに応じた中期的な視点
- 5文目（任意）: 明日の予定に対する先回りアドバイス
- 「あなたの場合」「あなたの食環境では」等、個人に語りかける表現を使う
- 「意志力ではなくホルモン・構造・環境の問題」というフレームを必ず使う
- 崩れた日は「想定内」として正常化する
- 具体的な食品名・メニュー名を挙げて「何を食べればいいか」を明確にする
- 過度な励ましや褒め言葉は不要。淡々と科学的に
- ${patternNote ? '同じルールが連続で崩れている場合は、そのルール自体の難易度調整を具体的に提案する' : ''}`;

      const tomorrowContext = tomorrowPlan ? `\n明日の予定: ${tomorrowPlan}` : '';
      const userMessage = `Day ${day}日目。${status}。メモ: ${memo || 'なし'}${patternNote ? '\n' + patternNote : ''}${tomorrowContext}`;

      const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 600,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });

      const apiData = await apiRes.json();

      if (!apiRes.ok) {
        return new Response(
          JSON.stringify({ error: apiData.error?.message || 'API error' }),
          { status: apiRes.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }

      return new Response(
        JSON.stringify({ message: apiData.content[0].text }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }
  },
};
