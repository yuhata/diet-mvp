import { useState } from 'react'

const generateICS = (startDate) => {
  const events = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().replace(/[-:]/g, '').split('.')[0]
    return `BEGIN:VEVENT\nDTSTART:${dateStr.substring(0, 8)}T200000\nDTEND:${dateStr.substring(0, 8)}T200500\nSUMMARY:ダイエットチェックイン（${i + 1}/14日目）\nDESCRIPTION:${window.location.href}\nEND:VEVENT`
  })
  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\n${events.join('\n')}\nEND:VCALENDAR`
  const blob = new Blob([ics], { type: 'text/calendar' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'diet-checkin.ics'
  a.click()
}

export default function ResultPage({
  answers,
  archetype,
  excludedTheories,
  recommendedTheories,
  rules,
  narrative,
  bioContextCards,
  onStartTracking,
  onRestart,
}) {
  const [trustScore, setTrustScore] = useState(null)
  const [exitSurvey, setExitSurvey] = useState({ q1: '', q2: '', q3: '' })
  const [surveySubmitted, setSurveySubmitted] = useState(false)

  const hasSupplemental = excludedTheories.some(e => e.isSupplemental)

  const handleTrustSelect = (score) => {
    setTrustScore(score)
    // localStorage に保存
    const data = JSON.parse(localStorage.getItem('dietMVP_data') || '{}')
    data.diagnosis = { ...data.diagnosis, trustScore: score }
    localStorage.setItem('dietMVP_data', JSON.stringify(data))
  }

  const handleExitSurveySubmit = () => {
    const data = JSON.parse(localStorage.getItem('dietMVP_data') || '{}')
    data.exitSurvey = exitSurvey
    localStorage.setItem('dietMVP_data', JSON.stringify(data))
    setSurveySubmitted(true)
  }

  return (
    <div className="min-h-svh px-4 py-8 max-w-lg mx-auto">
      {/* ===== Section A: ナラティブ ===== */}
      <section className="mb-10">
        <div className="mb-4">
          <span className="inline-block px-3 py-1 text-xs font-medium bg-accent/15 text-accent rounded-full">
            {archetype.label}
          </span>
        </div>
        <p className="text-lg sm:text-xl leading-relaxed text-text/85 font-light">
          {narrative}
        </p>
      </section>

      {/* ===== Section B: 生物学的コンテキストカード ===== */}
      {bioContextCards.length > 0 && (
        <section className="mb-10 space-y-4">
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">
            あなたの体で起きていること
          </h3>
          {bioContextCards.map((card) => (
            <div
              key={card.id}
              className="relative rounded-2xl overflow-hidden"
            >
              {/* グラデーションボーダー */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/40 via-accent/10 to-transparent p-px">
                <div className="w-full h-full rounded-2xl bg-card" />
              </div>
              {/* コンテンツ */}
              <div className="relative p-5">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl">{card.icon}</span>
                  <h4 className="text-base font-bold text-text leading-tight">
                    {card.title}
                  </h4>
                </div>
                <p className="text-sm text-text-muted leading-relaxed mb-3">
                  {card.body}
                </p>
                <p className="text-xs text-text-muted/50 flex items-center gap-1">
                  <span>📎</span> {card.source}
                </p>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ===== Section C: 除外された理論 ===== */}
      <section className="mb-10">
        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">
          {hasSupplemental ? '検討した理論' : 'あなたに合わない理論'}
        </h3>
        <div className="space-y-3">
          {excludedTheories.map((item, idx) => (
            <div
              key={`${item.theory}-${idx}`}
              className="bg-card rounded-xl p-4 border border-border"
            >
              <div className="flex items-start gap-3">
                <span className="text-lg shrink-0 mt-0.5">
                  {item.isSupplemental ? '🔍' : '❌'}
                </span>
                <div>
                  <h4 className="text-sm font-bold text-text mb-1">
                    {item.theory}
                  </h4>
                  <p className="text-xs text-text-muted leading-relaxed">
                    {item.reason}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Section D: 推奨プロトコル ===== */}
      <section className="mb-10">
        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
          推奨プロトコル
        </h3>
        <p className="text-xs text-text-muted mb-4">
          ベース理論: {recommendedTheories.join(' + ')}
        </p>

        <div className="space-y-3">
          {rules.map((rule, idx) => (
            <div
              key={idx}
              className="relative rounded-2xl overflow-hidden"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-accent/30 to-transparent p-px">
                <div className="w-full h-full rounded-2xl bg-card" />
              </div>
              <div className="relative p-5">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text mb-1">
                      ルール {idx + 1}: {rule.text}
                    </h4>
                    <p className="text-xs text-text-muted leading-relaxed">
                      {rule.detail}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {archetype.complement && archetype.complement.length > 0 && (
          <div className="mt-4 p-3 bg-card rounded-xl border border-border">
            <p className="text-xs text-text-muted">
              💡 補足: {archetype.complement.join('、')}
            </p>
          </div>
        )}
      </section>

      {/* ===== Section E: 信頼スコア ===== */}
      <section className="mb-10">
        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
          この診断結果の信頼度
        </h3>
        <p className="text-xs text-text-muted mb-4">
          この結果を信頼できると感じますか？
        </p>

        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((score) => (
            <button
              key={score}
              onClick={() => handleTrustSelect(score)}
              className={`flex-1 py-3 rounded-xl border text-center transition-all duration-150 cursor-pointer ${
                trustScore === score
                  ? 'bg-accent/15 border-accent text-accent font-bold'
                  : 'bg-card border-border text-text-muted hover:border-text-muted/40'
              }`}
            >
              <span className="text-lg block">{score}</span>
              <span className="text-[10px] block mt-0.5">
                {score === 1 ? '低い' : score === 3 ? '普通' : score === 5 ? '高い' : ''}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ===== Section F: アクション ===== */}
      {trustScore !== null && (
        <section className="mb-12">
          {trustScore >= 4 ? (
            <div className="space-y-3">
              <button
                onClick={onStartTracking}
                className="w-full py-4 bg-accent hover:bg-accent-dark text-white font-bold text-sm rounded-xl transition-colors duration-200 cursor-pointer"
              >
                2週間やってみる
              </button>
              <button
                onClick={() => generateICS(new Date())}
                className="w-full py-3 bg-card hover:bg-card-hover border border-border text-text-muted text-sm rounded-xl transition-colors duration-200 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>📅</span>
                カレンダーに追加（14日分のリマインダー）
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <button
                onClick={onRestart}
                className="w-full py-3.5 bg-card hover:bg-card-hover border border-border text-text text-sm font-bold rounded-xl transition-colors duration-200 cursor-pointer"
              >
                診断をやり直す
              </button>

              {/* 退出アンケート */}
              {!surveySubmitted ? (
                <div className="bg-card rounded-xl p-5 border border-border space-y-4">
                  <h4 className="text-sm font-bold text-text">
                    改善のためのフィードバック
                  </h4>
                  <div>
                    <label className="text-xs text-text-muted block mb-1">
                      信頼できなかった理由は？
                    </label>
                    <input
                      type="text"
                      value={exitSurvey.q1}
                      onChange={(e) => setExitSurvey(prev => ({ ...prev, q1: e.target.value }))}
                      className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted/40 focus:outline-none focus:border-accent"
                      placeholder="自由記述"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted block mb-1">
                      どんな結果なら試してみたい？
                    </label>
                    <input
                      type="text"
                      value={exitSurvey.q2}
                      onChange={(e) => setExitSurvey(prev => ({ ...prev, q2: e.target.value }))}
                      className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted/40 focus:outline-none focus:border-accent"
                      placeholder="自由記述"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted block mb-1">
                      その他コメント
                    </label>
                    <input
                      type="text"
                      value={exitSurvey.q3}
                      onChange={(e) => setExitSurvey(prev => ({ ...prev, q3: e.target.value }))}
                      className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted/40 focus:outline-none focus:border-accent"
                      placeholder="自由記述"
                    />
                  </div>
                  <button
                    onClick={handleExitSurveySubmit}
                    className="w-full py-2.5 bg-accent/15 text-accent text-sm font-medium rounded-lg hover:bg-accent/25 transition-colors cursor-pointer"
                  >
                    送信する
                  </button>
                </div>
              ) : (
                <div className="bg-card rounded-xl p-5 border border-border text-center">
                  <p className="text-sm text-text-muted">
                    ご回答ありがとうございました。改善に活かします。
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* フッター */}
      <footer className="text-center pb-8">
        <p className="text-xs text-text-muted/40">
          この診断は一般的な情報提供を目的としており、医療アドバイスではありません。
        </p>
      </footer>
    </div>
  )
}
