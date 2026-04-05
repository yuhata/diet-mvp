import { useState, useEffect } from 'react'
import { MINI_ADVICE } from '../logic/narrativeGenerator'

// 体重トレンドチャート（インラインSVG）
function WeightChart({ trackingData, startWeight, targetWeight }) {
  const chartW = 320
  const chartH = 160
  const padL = 40
  const padR = 16
  const padT = 20
  const padB = 28
  const plotW = chartW - padL - padR
  const plotH = chartH - padT - padB

  // データポイント収集
  const points = []
  for (let i = 1; i <= 14; i++) {
    const d = trackingData[`day${i}`]
    if (d && d.weight != null && d.weight !== '') {
      points.push({ day: i, weight: parseFloat(d.weight) })
    }
  }

  if (points.length === 0 && !startWeight && !targetWeight) return null

  // Y軸のmin/max算出
  const allWeights = points.map(p => p.weight)
  if (startWeight) allWeights.push(parseFloat(startWeight))
  if (targetWeight) allWeights.push(parseFloat(targetWeight))
  if (allWeights.length === 0) return null

  const minW = Math.floor(Math.min(...allWeights) - 1)
  const maxW = Math.ceil(Math.max(...allWeights) + 1)
  const rangeW = maxW - minW || 1

  const xScale = (day) => padL + ((day - 1) / 13) * plotW
  const yScale = (w) => padT + plotH - ((w - minW) / rangeW) * plotH

  const polylinePoints = points.map(p => `${xScale(p.day)},${yScale(p.weight)}`).join(' ')

  return (
    <div className="bg-card rounded-xl p-4 border border-border mb-6">
      <h3 className="text-xs font-bold text-text-muted mb-3">体重トレンド</h3>
      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" style={{ maxWidth: chartW }}>
        {/* Y軸ラベル */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const w = minW + frac * rangeW
          const y = yScale(w)
          return (
            <g key={frac}>
              <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="#333" strokeWidth="0.5" />
              <text x={padL - 4} y={y + 3} textAnchor="end" fill="#888" fontSize="8">{w.toFixed(1)}</text>
            </g>
          )
        })}

        {/* X軸ラベル */}
        {[1, 4, 7, 10, 14].map((day) => (
          <text key={day} x={xScale(day)} y={chartH - 4} textAnchor="middle" fill="#888" fontSize="8">
            {day}
          </text>
        ))}

        {/* 開始体重の水平破線 */}
        {startWeight && (
          <g>
            <line
              x1={padL} y1={yScale(parseFloat(startWeight))}
              x2={chartW - padR} y2={yScale(parseFloat(startWeight))}
              stroke="#888" strokeWidth="1" strokeDasharray="4 3"
            />
            <text x={chartW - padR + 2} y={yScale(parseFloat(startWeight)) + 3} fill="#888" fontSize="7" textAnchor="start">
              開始
            </text>
          </g>
        )}

        {/* 目標体重の水平破線 */}
        {targetWeight && (
          <g>
            <line
              x1={padL} y1={yScale(parseFloat(targetWeight))}
              x2={chartW - padR} y2={yScale(parseFloat(targetWeight))}
              stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 3"
            />
            <text x={chartW - padR + 2} y={yScale(parseFloat(targetWeight)) + 3} fill="#f59e0b" fontSize="7" textAnchor="start">
              目標
            </text>
          </g>
        )}

        {/* データ折れ線 */}
        {points.length >= 2 && (
          <polyline
            points={polylinePoints}
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        )}

        {/* データポイントの丸 */}
        {points.map((p) => (
          <circle
            key={p.day}
            cx={xScale(p.day)}
            cy={yScale(p.weight)}
            r="3.5"
            fill="#10b981"
            stroke="#0f0f0f"
            strokeWidth="1.5"
          />
        ))}
      </svg>
    </div>
  )
}

export default function Tracking({ archetype, rules, recommendedTheories, onRestart }) {
  const [trackingData, setTrackingData] = useState({})
  const [ruleResults, setRuleResults] = useState(() => rules.map(() => null)) // null = 未選択, true = 達成, false = 未達成
  const [todayWeight, setTodayWeight] = useState('')
  const [todayMemo, setTodayMemo] = useState('')
  const [aiMessage, setAiMessage] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [finalSurvey, setFinalSurvey] = useState({ weight: '', waist: '', payIntent: '', reason: '' })
  const [finalSubmitted, setFinalSubmitted] = useState(false)

  // localStorage から開始体重・目標体重を取得
  const data = JSON.parse(localStorage.getItem('dietMVP_data') || '{}')
  const startWeight = data.diagnosis?.answers?.profile?.weight
  const targetWeight = data.diagnosis?.answers?.targetWeight

  // 開始日と現在の日数を算出（?day=N でテスト用に上書き可能）
  const urlDay = new URLSearchParams(window.location.search).get('day')
  const startDate = data.diagnosis?.timestamp
    ? new Date(data.diagnosis.timestamp)
    : new Date()
  const now = new Date()
  const diffMs = now - startDate
  const calcDay = Math.min(14, Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) || 1))
  const currentDay = urlDay ? Math.min(14, Math.max(1, parseInt(urlDay, 10))) : calcDay

  // localStorage からトラッキングデータ復元
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('dietMVP_data') || '{}')
    if (stored.tracking) {
      setTrackingData(stored.tracking)
      const todayKey = `day${currentDay}`
      if (stored.tracking[todayKey]) {
        const entry = stored.tracking[todayKey]
        // ルール別結果を復元
        if (entry.ruleResults) {
          setRuleResults(entry.ruleResults.map(r => r.achieved))
        }
        setTodayWeight(entry.weight || '')
        setTodayMemo(entry.memo || '')
        setAiMessage(entry.aiMessage || null)
        setSaved(true)
      }
    }
    if (stored.finalSurvey) {
      setFinalSurvey(stored.finalSurvey)
      setFinalSubmitted(true)
    }
  }, [currentDay])

  // ルール達成数の計算
  const achievedCount = ruleResults.filter(r => r === true).length
  const totalRules = rules.length
  const allAnswered = ruleResults.every(r => r !== null)

  // ルール切り替え
  const toggleRule = (idx, value) => {
    setRuleResults(prev => {
      const next = [...prev]
      next[idx] = value
      return next
    })
  }

  // AI メンタリング呼び出し（科学的知見付き）
  const fetchMentoring = async (statusText, memoText) => {
    const endpoint = import.meta.env.VITE_WORKER_ENDPOINT
    if (!endpoint) return null

    // 直近3日分の記録を収集（パターン検出用）
    const recentDays = []
    for (let i = Math.max(1, currentDay - 2); i <= currentDay; i++) {
      const d = trackingData[`day${i}`]
      if (d && d.ruleResults) {
        recentDays.push({
          day: i,
          failedRules: d.ruleResults.filter(r => !r.achieved).map(r => r.ruleText),
          achievedCount: d.ruleResults.filter(r => r.achieved).length,
        })
      }
    }

    try {
      setAiLoading(true)
      const res = await fetch(`${endpoint}/api/mentoring`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archetype: archetype.id,
          day: currentDay,
          status: statusText,
          memo: memoText,
          protocols: recommendedTheories,
          profile: data.diagnosis?.answers?.profile,
          targetWeight: data.diagnosis?.answers?.targetWeight,
          recentDays,
        }),
      })
      if (!res.ok) throw new Error('API error')
      const result = await res.json()
      return result.message || null
    } catch {
      return null
    } finally {
      setAiLoading(false)
    }
  }

  // 保存
  const handleSave = async () => {
    if (!allAnswered) return

    // ステータス文字列を生成
    const failedRules = rules.filter((_, i) => ruleResults[i] === false).map(r => r.text)
    const statusText = `${achievedCount}/${totalRules}ルール達成${failedRules.length > 0 ? '。守れなかったルール: ' + failedRules.join('、') : ''}`

    const msg = await fetchMentoring(statusText, todayMemo)

    const todayKey = `day${currentDay}`
    const entry = {
      ruleResults: rules.map((rule, i) => ({
        ruleText: rule.text,
        achieved: ruleResults[i],
      })),
      weight: todayWeight || null,
      memo: todayMemo,
      aiMessage: msg,
      date: new Date().toISOString(),
    }

    const newTracking = { ...trackingData, [todayKey]: entry }
    setTrackingData(newTracking)
    setAiMessage(msg)

    // localStorage 更新
    const stored = JSON.parse(localStorage.getItem('dietMVP_data') || '{}')
    stored.tracking = newTracking
    localStorage.setItem('dietMVP_data', JSON.stringify(stored))
    setSaved(true)
  }

  // 最終アンケート保存
  const handleFinalSubmit = () => {
    const stored = JSON.parse(localStorage.getItem('dietMVP_data') || '{}')
    stored.finalSurvey = finalSurvey
    localStorage.setItem('dietMVP_data', JSON.stringify(stored))
    setFinalSubmitted(true)
  }

  // CSV エクスポート
  const exportCSV = () => {
    const stored = JSON.parse(localStorage.getItem('dietMVP_data') || '{}')
    const ruleHeaders = rules.map((_, i) => `rule${i + 1}_achieved`)
    const rows = [
      ['date', 'day', ...ruleHeaders, 'weight', 'memo', 'archetype', 'trust_score'],
    ]

    for (let i = 1; i <= 14; i++) {
      const d = stored.tracking?.[`day${i}`]
      if (d) {
        const ruleVals = d.ruleResults
          ? d.ruleResults.map(r => (r.achieved ? '1' : '0'))
          : rules.map(() => '')
        rows.push([
          d.date || '',
          `Day ${i}`,
          ...ruleVals,
          d.weight || '',
          d.memo || '',
          archetype.id,
          stored.diagnosis?.trustScore || '',
        ])
      } else {
        rows.push([
          '',
          `Day ${i}`,
          ...rules.map(() => ''),
          '',
          '',
          archetype.id,
          stored.diagnosis?.trustScore || '',
        ])
      }
    }

    rows.push([])
    rows.push(['# 最終アンケート'])
    rows.push(['最終体重', stored.finalSurvey?.weight || ''])
    rows.push(['最終ウエスト', stored.finalSurvey?.waist || ''])
    rows.push(['課金意向', stored.finalSurvey?.payIntent || ''])
    rows.push(['理由', stored.finalSurvey?.reason || ''])

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const bom = '\uFEFF'
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'diet-mvp-data.csv'
    a.click()
  }

  // 統計計算
  const completedDays = Object.keys(trackingData).length

  // ルール別達成率の計算（中間レビュー用）
  const ruleStats = rules.map((rule, rIdx) => {
    let achieved = 0
    let total = 0
    Object.values(trackingData).forEach(d => {
      if (d.ruleResults && d.ruleResults[rIdx]) {
        total++
        if (d.ruleResults[rIdx].achieved) achieved++
      }
    })
    return { text: rule.text, theory: rule.theory, achieved, total, rate: total > 0 ? achieved / total : 0 }
  })

  // 14日グリッドの色計算ヘルパー
  const getDayColor = (dayData) => {
    if (!dayData || !dayData.ruleResults) return 'bg-card'
    const a = dayData.ruleResults.filter(r => r.achieved).length
    const t = dayData.ruleResults.length
    if (a === t) return 'bg-accent/60'
    if (a >= t / 2) return 'bg-warning/60'
    return 'bg-danger/60'
  }

  return (
    <div className="min-h-svh px-4 py-6 max-w-lg mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-text">デイリーチェックイン</h1>
          <p className="text-xs text-text-muted">{archetype.label}</p>
        </div>
        <div className="bg-accent/15 text-accent text-sm font-bold px-3 py-1.5 rounded-full">
          {currentDay}/14日目
        </div>
      </div>

      {/* 14日グリッド */}
      <div className="grid grid-cols-7 gap-2 mb-8">
        {Array.from({ length: 14 }, (_, i) => {
          const dayNum = i + 1
          const dayData = trackingData[`day${dayNum}`]
          const isCurrent = dayNum === currentDay
          const isFuture = dayNum > currentDay

          const bgColor = getDayColor(dayData)

          return (
            <div
              key={dayNum}
              className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all ${bgColor} ${
                isCurrent ? 'ring-2 ring-accent ring-offset-1 ring-offset-bg' : ''
              } ${isFuture ? 'opacity-30' : ''}`}
            >
              {dayNum}
            </div>
          )
        })}
      </div>

      {/* 体重トレンドチャート */}
      <WeightChart trackingData={trackingData} startWeight={startWeight} targetWeight={targetWeight} />

      {/* チェックイン入力 */}
      {!saved ? (
        <div className="space-y-4 mb-8">
          <h3 className="text-sm font-bold text-text">今日の振り返り</h3>

          {/* ルール別トグル */}
          <div className="bg-card rounded-xl p-4 border border-border space-y-3">
            <h4 className="text-xs font-bold text-text-muted">ルール別チェック</h4>
            {rules.map((rule, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <span className="text-sm text-text flex-1">{rule.text}</span>
                  <span className="text-[10px] bg-accent/15 text-accent px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    {rule.theory}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleRule(idx, true)}
                    className={`flex-1 text-xs py-1.5 rounded-lg border transition-all cursor-pointer ${
                      ruleResults[idx] === true
                        ? 'bg-accent/20 border-accent text-accent'
                        : 'bg-bg border-border text-text-muted hover:border-text-muted/40'
                    }`}
                  >
                    &#x2705; 守れた
                  </button>
                  <button
                    onClick={() => toggleRule(idx, false)}
                    className={`flex-1 text-xs py-1.5 rounded-lg border transition-all cursor-pointer ${
                      ruleResults[idx] === false
                        ? 'bg-danger/20 border-danger text-danger'
                        : 'bg-bg border-border text-text-muted hover:border-text-muted/40'
                    }`}
                  >
                    &#x274C; 守れなかった
                  </button>
                </div>
              </div>
            ))}
            {allAnswered && (
              <p className="text-xs text-accent font-medium pt-1">
                今日は {achievedCount} / {totalRules} ルール達成
              </p>
            )}
          </div>

          {/* 達成ゼロの場合のミニアドバイス */}
          {allAnswered && achievedCount === 0 && (
            <div className="bg-card rounded-xl p-4 border border-warning/30">
              <p className="text-xs text-text-muted mb-1">アドバイス</p>
              <p className="text-sm text-text leading-relaxed">
                {MINI_ADVICE[archetype.id] || MINI_ADVICE.knowledge_no_action}
              </p>
            </div>
          )}

          {/* 体重入力 */}
          <div>
            <label className="text-xs text-text-muted block mb-1">今日の体重 (kg)</label>
            <input
              type="number"
              step="0.1"
              value={todayWeight}
              onChange={(e) => setTodayWeight(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted/40 focus:outline-none focus:border-accent"
              placeholder="任意"
            />
          </div>

          {/* メモ */}
          <div>
            <label className="text-xs text-text-muted block mb-1">メモ（任意）</label>
            <input
              type="text"
              value={todayMemo}
              onChange={(e) => setTodayMemo(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted/40 focus:outline-none focus:border-accent"
              placeholder="今日の気づきなど"
            />
          </div>

          {/* 保存ボタン */}
          <button
            onClick={handleSave}
            disabled={!allAnswered}
            className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              allAnswered
                ? 'bg-accent hover:bg-accent-dark text-white'
                : 'bg-card text-text-muted/40 cursor-not-allowed'
            }`}
          >
            保存する
          </button>
        </div>
      ) : (
        <div className="mb-8">
          <div className="bg-card rounded-xl p-4 border border-accent/30 text-center">
            <p className="text-sm text-accent font-medium">
              今日のチェックイン完了 ({achievedCount}/{totalRules} ルール達成)
            </p>
          </div>
        </div>
      )}

      {/* AIメンタリング */}
      {saved && (
        <div className="mb-8">
          {aiLoading ? (
            <div className="bg-card rounded-xl p-5 border border-border text-center">
              <div className="animate-pulse text-sm text-text-muted">
                AIメンタリングを生成中...
              </div>
            </div>
          ) : aiMessage ? (
            <div className="relative rounded-2xl overflow-hidden">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/30 via-accent/5 to-transparent p-px">
                <div className="w-full h-full rounded-2xl bg-card" />
              </div>
              <div className="relative p-5">
                <p className="text-xs text-accent font-medium mb-2">AIメンタリング</p>
                <p className="text-sm text-text leading-relaxed">{aiMessage}</p>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl p-4 border border-border">
              <p className="text-xs text-text-muted">
                AIメンタリングは準備中です。ルールベースのアドバイスを参考にしてください。
              </p>
            </div>
          )}
        </div>
      )}

      {/* Day 7: 中間レビュー */}
      {currentDay >= 7 && completedDays >= 5 && (
        <div className="mb-8 bg-card rounded-xl p-5 border border-accent/20">
          <h3 className="text-sm font-bold text-text mb-3">中間レビュー（7日目）</h3>

          {/* ルール別達成率 */}
          <div className="space-y-2 mb-4">
            <h4 className="text-xs font-bold text-text-muted">ルール別の達成率</h4>
            {ruleStats.map((stat, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex-1">
                  <p className="text-xs text-text truncate">{stat.text}</p>
                  <div className="w-full bg-bg rounded-full h-1.5 mt-1">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        width: `${Math.round(stat.rate * 100)}%`,
                        backgroundColor: stat.rate >= 0.7 ? '#10b981' : stat.rate >= 0.4 ? '#f59e0b' : '#ef4444',
                      }}
                    />
                  </div>
                </div>
                <span className="text-xs text-text-muted w-12 text-right">
                  {stat.total > 0 ? `${Math.round(stat.rate * 100)}%` : '-'}
                </span>
              </div>
            ))}
          </div>

          {/* 全体統計 */}
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold text-accent">{completedDays}</p>
              <p className="text-xs text-text-muted">記録日</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-text">
                {ruleStats.length > 0 ? Math.round(ruleStats.reduce((s, r) => s + r.rate, 0) / ruleStats.length * 100) : 0}%
              </p>
              <p className="text-xs text-text-muted">平均達成率</p>
            </div>
          </div>

          {ruleStats.length > 0 && ruleStats.reduce((s, r) => s + r.rate, 0) / ruleStats.length >= 0.7 && (
            <p className="text-xs text-accent mt-3 text-center">
              順調です。このペースを維持しましょう。
            </p>
          )}
        </div>
      )}

      {/* Day 14: 最終アンケート */}
      {currentDay >= 14 && (
        <div className="mb-8">
          {/* 最終日の体重チャートを強調表示 */}
          <WeightChart trackingData={trackingData} startWeight={startWeight} targetWeight={targetWeight} />

          {!finalSubmitted ? (
            <div className="bg-card rounded-xl p-5 border border-accent/20 space-y-4">
              <h3 className="text-sm font-bold text-text">14日間おつかれさまでした</h3>

              <div>
                <label className="text-xs text-text-muted block mb-1">体重の変化（任意）</label>
                <input
                  type="text"
                  value={finalSurvey.weight}
                  onChange={(e) => setFinalSurvey(prev => ({ ...prev, weight: e.target.value }))}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted/40 focus:outline-none focus:border-accent"
                  placeholder="例: -1.5kg"
                />
              </div>

              <div>
                <label className="text-xs text-text-muted block mb-1">ウエストの変化（任意）</label>
                <input
                  type="text"
                  value={finalSurvey.waist}
                  onChange={(e) => setFinalSurvey(prev => ({ ...prev, waist: e.target.value }))}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted/40 focus:outline-none focus:border-accent"
                  placeholder="例: -2cm"
                />
              </div>

              <div>
                <label className="text-xs text-text-muted block mb-1">
                  月額980円で継続版を使いたいですか？
                </label>
                <div className="space-y-2">
                  {['はい、使いたい', '検討中', '払わない'].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setFinalSurvey(prev => ({ ...prev, payIntent: opt }))}
                      className={`w-full text-left p-3 rounded-lg border text-sm transition-all cursor-pointer ${
                        finalSurvey.payIntent === opt
                          ? 'bg-accent/15 border-accent text-text'
                          : 'bg-bg border-border text-text-muted hover:border-text-muted/40'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {finalSurvey.payIntent === '払わない' && (
                <div>
                  <label className="text-xs text-text-muted block mb-1">理由を教えてください</label>
                  <input
                    type="text"
                    value={finalSurvey.reason}
                    onChange={(e) => setFinalSurvey(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted/40 focus:outline-none focus:border-accent"
                    placeholder="自由記述"
                  />
                </div>
              )}

              <button
                onClick={handleFinalSubmit}
                className="w-full py-3 bg-accent hover:bg-accent-dark text-white font-bold text-sm rounded-xl transition-colors cursor-pointer"
              >
                送信する
              </button>
            </div>
          ) : (
            <div className="bg-card rounded-xl p-5 border border-accent/20 text-center space-y-3">
              <p className="text-sm text-text font-medium">
                ご回答ありがとうございました。
              </p>
              <button
                onClick={exportCSV}
                className="w-full py-3 bg-card hover:bg-card-hover border border-border text-text-muted text-sm rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                CSVダウンロード
              </button>
            </div>
          )}
        </div>
      )}

      {/* フッター */}
      <div className="text-center pb-8 space-y-3">
        <button
          onClick={exportCSV}
          className="text-xs text-text-muted/50 hover:text-text-muted transition-colors cursor-pointer"
        >
          データをCSVエクスポート
        </button>
        <br />
        <button
          onClick={onRestart}
          className="text-xs text-text-muted/50 hover:text-text-muted transition-colors cursor-pointer"
        >
          診断をやり直す
        </button>
      </div>
    </div>
  )
}
