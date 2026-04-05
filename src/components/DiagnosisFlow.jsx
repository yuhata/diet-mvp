import { useState, useEffect } from 'react'
import { QUESTIONS } from '../data/questions'
import { parseAnswers, determineArchetype, generateRules, getRecommendedTheories, getTheoryReasons } from '../logic/matchingEngine'
import { applyExclusionRules, getAlternativeCards } from '../logic/exclusionRules'
import { getNarrative, getBiologicalContextCards } from '../logic/narrativeGenerator'

export default function DiagnosisFlow({ onComplete, onBack }) {
  // currentStep: -1 = プロフィール入力, 0〜8 = Q1〜Q9
  const [currentStep, setCurrentStep] = useState(-1)
  const [answers, setAnswers] = useState({})
  const [fadeIn, setFadeIn] = useState(true)
  const [profile, setProfile] = useState({
    height: '',
    weight: '',
    waist: '',
    bodyFat: '',
  })

  const totalSteps = QUESTIONS.length + 1 // プロフィール + 9質問 = 10
  const isProfileStep = currentStep === -1
  const question = !isProfileStep ? QUESTIONS[currentStep] : null
  const currentAnswer = question ? answers[question.id] : null

  // 選択済みかどうか
  const hasSelection = isProfileStep
    ? (profile.height !== '' && profile.weight !== '')
    : question.type === 'multi'
      ? (currentAnswer && currentAnswer.length > 0)
      : question.type === 'goal'
        ? (currentAnswer?.targetWeight && currentAnswer?.timeline)
        : !!currentAnswer

  // フェードアニメーション
  const transitionTo = (nextStep) => {
    setFadeIn(false)
    setTimeout(() => {
      setCurrentStep(nextStep)
      setFadeIn(true)
    }, 200)
  }

  // 単一選択
  const handleSingleSelect = (option) => {
    setAnswers(prev => ({ ...prev, [question.id]: option }))
  }

  // 複数選択のトグル
  const handleMultiToggle = (option) => {
    setAnswers(prev => {
      const current = prev[question.id] || []
      const next = current.includes(option)
        ? current.filter(o => o !== option)
        : [...current, option]
      return { ...prev, [question.id]: next }
    })
  }

  // 目標設定の更新
  const handleGoalUpdate = (field, value) => {
    setAnswers(prev => ({
      ...prev,
      [question.id]: {
        ...(prev[question.id] || {}),
        [field]: value,
      }
    }))
  }

  // 次へ
  const handleNext = () => {
    if (isProfileStep) {
      transitionTo(0)
      return
    }

    if (currentStep < QUESTIONS.length - 1) {
      transitionTo(currentStep + 1)
    } else {
      // 診断完了 → ロジック実行
      const parsed = parseAnswers({ ...answers, profile })
      const excludedTheories = applyExclusionRules(parsed)
      const archetype = determineArchetype(parsed)
      const recommendedTheories = getRecommendedTheories(archetype, excludedTheories)
      const rules = generateRules(archetype, parsed)
      const narrative = getNarrative(archetype.id)
      const bioContextCards = getBiologicalContextCards(parsed)

      // 除外カードが2枚未満なら補充
      let displayExcluded = [...excludedTheories]
      if (displayExcluded.length < 2) {
        const alts = getAlternativeCards(archetype.id)
        for (const alt of alts) {
          if (displayExcluded.length >= 6) break
          if (!displayExcluded.find(e => e.theory === alt.theory)) {
            displayExcluded.push({ ...alt, ruleId: 'ALT', isSupplemental: true })
          }
        }
      }

      const theoryReasons = getTheoryReasons(recommendedTheories)

      onComplete({
        answers: parsed,
        profile,
        archetype,
        excludedTheories: displayExcluded,
        recommendedTheories,
        theoryReasons,
        rules,
        narrative,
        bioContextCards,
      })
    }
  }

  // 戻る
  const handleBack = () => {
    if (isProfileStep) {
      onBack()
    } else if (currentStep > 0) {
      transitionTo(currentStep - 1)
    } else {
      transitionTo(-1)
    }
  }

  // プログレス計算（プロフィール含む10ステップ）
  const progressIndex = currentStep + 1 // -1 → 0, 0 → 1, ... 8 → 9
  const progressLabel = isProfileStep
    ? 'プロフィール'
    : `質問 ${currentStep + 1}/9`
  const progressPercent = Math.round(((progressIndex + 1) / totalSteps) * 100)

  // 数値入力用の共通スタイル
  const numberInputClass = "w-24 bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text text-right placeholder:text-text-muted/40 focus:outline-none focus:border-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"

  return (
    <div className="min-h-svh flex flex-col px-4 py-6 max-w-lg mx-auto">
      {/* プログレスバー */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-text-muted">
            {progressLabel}
          </span>
          <span className="text-xs text-text-muted">
            {progressPercent}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-card rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* コンテンツエリア */}
      <div
        className={`flex-1 transition-opacity duration-200 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}
      >
        {isProfileStep ? (
          /* ===== プロフィール入力画面 ===== */
          <>
            <h2 className="text-lg font-bold text-text mb-1">
              基本データ
            </h2>
            <p className="text-xs text-text-muted mb-6">診断の精度を高めるための情報です</p>

            <div className="space-y-3">
              {/* 身長 */}
              <div className="bg-card rounded-xl p-4 border border-border flex items-center justify-between">
                <div>
                  <span className="text-sm text-text">身長</span>
                  <span className="text-xs text-accent ml-1">*</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={profile.height}
                    onChange={(e) => setProfile(prev => ({ ...prev, height: e.target.value }))}
                    className={numberInputClass}
                    placeholder="170"
                  />
                  <span className="text-xs text-text-muted w-6">cm</span>
                </div>
              </div>

              {/* 体重 */}
              <div className="bg-card rounded-xl p-4 border border-border flex items-center justify-between">
                <div>
                  <span className="text-sm text-text">体重</span>
                  <span className="text-xs text-accent ml-1">*</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={profile.weight}
                    onChange={(e) => setProfile(prev => ({ ...prev, weight: e.target.value }))}
                    className={numberInputClass}
                    placeholder="70"
                  />
                  <span className="text-xs text-text-muted w-6">kg</span>
                </div>
              </div>

              {/* ウエスト */}
              <div className="bg-card rounded-xl p-4 border border-border flex items-center justify-between">
                <div>
                  <span className="text-sm text-text">ウエスト</span>
                  <span className="text-xs text-text-muted/50 ml-1">任意</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={profile.waist}
                    onChange={(e) => setProfile(prev => ({ ...prev, waist: e.target.value }))}
                    className={numberInputClass}
                    placeholder="85"
                  />
                  <span className="text-xs text-text-muted w-6">cm</span>
                </div>
              </div>

              {/* 体脂肪率 */}
              <div className="bg-card rounded-xl p-4 border border-border flex items-center justify-between">
                <div>
                  <span className="text-sm text-text">体脂肪率</span>
                  <span className="text-xs text-text-muted/50 ml-1">任意</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={profile.bodyFat}
                    onChange={(e) => setProfile(prev => ({ ...prev, bodyFat: e.target.value }))}
                    className={numberInputClass}
                    placeholder="25"
                  />
                  <span className="text-xs text-text-muted w-6">%</span>
                </div>
              </div>
            </div>
          </>
        ) : question.type === 'goal' ? (
          /* ===== 目標設定画面（Q9） ===== */
          <>
            <h2 className="text-lg font-bold text-text mb-1">
              {question.label}
            </h2>
            <p className="text-xs text-text-muted mb-6">目標体重と期間を設定してください</p>

            {/* 目標体重 */}
            <div className="bg-card rounded-xl p-4 border border-border flex items-center justify-between mb-4">
              <div>
                <span className="text-sm text-text">目標体重</span>
                <span className="text-xs text-accent ml-1">*</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  value={currentAnswer?.targetWeight || ''}
                  onChange={(e) => handleGoalUpdate('targetWeight', e.target.value)}
                  className={numberInputClass}
                  placeholder="65"
                />
                <span className="text-xs text-text-muted w-6">kg</span>
              </div>
            </div>

            {/* 目標期間 */}
            <p className="text-xs text-text-muted mb-3">目標期間</p>
            <div className="space-y-3">
              {question.timelineOptions.map((option) => {
                const isSelected = currentAnswer?.timeline === option

                return (
                  <button
                    key={option}
                    onClick={() => handleGoalUpdate('timeline', option)}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'bg-accent/15 border-accent text-text'
                        : 'bg-card border-border text-text-muted hover:border-text-muted/40 hover:bg-card-hover'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-accent border-accent'
                            : 'border-border'
                        }`}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm">{option}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          /* ===== 通常の質問画面（Q1〜Q8） ===== */
          <>
            <h2 className="text-lg font-bold text-text mb-1">
              {question.label}
            </h2>
            {question.type === 'multi' && (
              <p className="text-xs text-text-muted mb-4">複数選択可</p>
            )}
            {question.type === 'single' && (
              <p className="text-xs text-text-muted mb-4">1つ選択してください</p>
            )}

            {/* 選択肢 */}
            <div className="space-y-3">
              {question.options.map((option) => {
                const isSelected = question.type === 'multi'
                  ? (currentAnswer || []).includes(option)
                  : currentAnswer === option

                return (
                  <button
                    key={option}
                    onClick={() =>
                      question.type === 'multi'
                        ? handleMultiToggle(option)
                        : handleSingleSelect(option)
                    }
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'bg-accent/15 border-accent text-text'
                        : 'bg-card border-border text-text-muted hover:border-text-muted/40 hover:bg-card-hover'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* チェックマーク */}
                      <div
                        className={`w-5 h-5 rounded-${question.type === 'multi' ? 'md' : 'full'} border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-accent border-accent'
                            : 'border-border'
                        }`}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm">{option}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ナビゲーション */}
      <div className="mt-8 space-y-3">
        <button
          onClick={handleNext}
          disabled={!hasSelection}
          className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${
            hasSelection
              ? 'bg-accent hover:bg-accent-dark text-white'
              : 'bg-card text-text-muted/40 cursor-not-allowed'
          }`}
        >
          {currentStep < QUESTIONS.length - 1 ? '次へ' : '診断結果を見る'}
        </button>
        <button
          onClick={handleBack}
          className="w-full py-2 text-sm text-text-muted hover:text-text transition-colors cursor-pointer"
        >
          {isProfileStep ? '← トップに戻る' : currentStep > 0 ? '← 前の質問に戻る' : '← プロフィールに戻る'}
        </button>
      </div>
    </div>
  )
}
