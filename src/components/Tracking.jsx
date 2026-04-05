import { useState, useEffect } from 'react'
import { MINI_ADVICE } from '../logic/narrativeGenerator'

const STATUS_OPTIONS = [
  { value: 'good', label: '3つとも守れた', emoji: '🟢', color: 'bg-accent' },
  { value: 'partial', label: '一部できた', emoji: '🟡', color: 'bg-warning' },
  { value: 'failed', label: 'できなかった', emoji: '🔴', color: 'bg-danger' },
]

export default function Tracking({ archetype, rules, recommendedTheories, onRestart }) {
  const [trackingData, setTrackingData] = useState({})
  const [todayStatus, setTodayStatus] = useState(null)
  const [todayMemo, setTodayMemo] = useState('')
  const [aiMessage, setAiMessage] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [finalSurvey, setFinalSurvey] = useState({ weight: '', waist: '', payIntent: '', reason: '' })
  const [finalSubmitted, setFinalSubmitted] = useState(false)

  // 開始日と現在の日数を算出
  const data = JSON.parse(localStorage.getItem('dietMVP_data') || '{}')
  const startDate = data.diagnosis?.timestamp
    ? new Date(data.diagnosis.timestamp)
    : new Date()
  const now = new Date()
  const diffMs = now - startDate
  const currentDay = Math.min(14, Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) || 1))

  // localStorage からトラッキングデータ復元
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('dietMVP_data') || '{}')
    if (stored.tracking) {
      setTrackingData(stored.tracking)
      const todayKey = `day${currentDay}`
      if (stored.tracking[todayKey]) {
        setTodayStatus(stored.tracking[todayKey].status)
        setTodayMemo(stored.tracking[todayKey].memo || '')
        setAiMessage(stored.tracking[todayKey].aiMessage || null)
        setSaved(true)
      }
    }
    if (stored.finalSurvey) {
      setFinalSurvey(stored.finalSurvey)
      setFinalSubmitted(true)
    }
  }, [currentDay])

  // AI メンタリング呼び出し
  const fetchMentoring = async (status, memo) => {
    const endpoint = import.meta.env.VITE_WORKER_ENDPOINT
    if (!endpoint) return null

    try {
      setAiLoading(true)
      const res = await fetch(`${endpoint}/api/mentoring`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archetypeId: archetype.id,
          day: currentDay,
          status,
          memo,
          rules: rules.map(r => r.text),
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
    if (!todayStatus) return

    const msg = await fetchMentoring(todayStatus, todayMemo)

    const todayKey = `day${currentDay}`
    const entry = {
      status: todayStatus,
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
    const rows = [
      ['項目', '値'],
      ['アーキタイプ', archetype.label],
      ['推奨理論', recommendedTheories.join(', ')],
      ['信頼スコア', stored.diagnosis?.trustScore || ''],
      ['診断日', stored.diagnosis?.timestamp || ''],
      [],
      ['日', 'ステータス', 'メモ', 'AIメッセージ', '日付'],
    ]

    for (let i = 1; i <= 14; i++) {
      const d = stored.tracking?.[`day${i}`]
      if (d) {
        rows.push([`Day ${i}`, d.status, d.memo || '', d.aiMessage || '', d.date])
      } else {
        rows.push([`Day ${i}`, '', '', '', ''])
      }
    }

    rows.push([])
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
  const goodDays = Object.values(trackingData).filter(d => d.status === 'good').length
  const partialDays = Object.values(trackingData).filter(d => d.status === 'partial').length

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

          let bgColor = 'bg-card'
          if (dayData) {
            if (dayData.status === 'good') bgColor = 'bg-accent/60'
            else if (dayData.status === 'partial') bgColor = 'bg-warning/60'
            else if (dayData.status === 'failed') bgColor = 'bg-danger/60'
          }

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

      {/* ルール確認 */}
      <div className="bg-card rounded-xl p-4 border border-border mb-6">
        <h3 className="text-xs font-bold text-text-muted mb-3">今日のルール</h3>
        <div className="space-y-2">
          {rules.map((rule, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-accent text-xs mt-0.5">✓</span>
              <span className="text-sm text-text">{rule.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* チェックイン入力 */}
      {!saved ? (
        <div className="space-y-4 mb-8">
          <h3 className="text-sm font-bold text-text">今日の振り返り</h3>
          <div className="space-y-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTodayStatus(opt.value)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all duration-150 cursor-pointer ${
                  todayStatus === opt.value
                    ? 'bg-accent/15 border-accent'
                    : 'bg-card border-border hover:border-text-muted/40'
                }`}
              >
                <span className="text-sm">
                  {opt.emoji} {opt.label}
                </span>
              </button>
            ))}
          </div>

          {/* できなかった場合のミニアドバイス */}
          {todayStatus === 'failed' && (
            <div className="bg-card rounded-xl p-4 border border-warning/30">
              <p className="text-xs text-text-muted mb-1">💡 アドバイス</p>
              <p className="text-sm text-text leading-relaxed">
                {MINI_ADVICE[archetype.id] || MINI_ADVICE.knowledge_no_action}
              </p>
            </div>
          )}

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
            disabled={!todayStatus}
            className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              todayStatus
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
              {STATUS_OPTIONS.find(o => o.value === todayStatus)?.emoji}{' '}
              今日のチェックイン完了
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
                <p className="text-xs text-accent font-medium mb-2">🤖 AIメンタリング</p>
                <p className="text-sm text-text leading-relaxed">{aiMessage}</p>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl p-4 border border-border">
              <p className="text-xs text-text-muted">
                🤖 AIメンタリングは準備中です。ルールベースのアドバイスを参考にしてください。
              </p>
            </div>
          )}
        </div>
      )}

      {/* Day 7: 中間レビュー */}
      {currentDay >= 7 && completedDays >= 5 && (
        <div className="mb-8 bg-card rounded-xl p-5 border border-accent/20">
          <h3 className="text-sm font-bold text-text mb-3">📊 中間レビュー（7日目）</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold text-accent">{goodDays}</p>
              <p className="text-xs text-text-muted">完遂日</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-warning">{partialDays}</p>
              <p className="text-xs text-text-muted">一部達成</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-text">{completedDays}</p>
              <p className="text-xs text-text-muted">記録日</p>
            </div>
          </div>
          {goodDays + partialDays >= completedDays * 0.7 && (
            <p className="text-xs text-accent mt-3 text-center">
              順調です。このペースを維持しましょう。
            </p>
          )}
        </div>
      )}

      {/* Day 14: 最終アンケート */}
      {currentDay >= 14 && (
        <div className="mb-8">
          {!finalSubmitted ? (
            <div className="bg-card rounded-xl p-5 border border-accent/20 space-y-4">
              <h3 className="text-sm font-bold text-text">🎯 14日間おつかれさまでした</h3>

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
                <span>📥</span> CSVダウンロード
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
