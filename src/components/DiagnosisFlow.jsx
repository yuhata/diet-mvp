import { useState, useEffect } from 'react'
import { QUESTIONS } from '../data/questions'
import { parseAnswers, determineArchetype, generateRules, getRecommendedTheories } from '../logic/matchingEngine'
import { applyExclusionRules, getAlternativeCards } from '../logic/exclusionRules'
import { getNarrative, getBiologicalContextCards } from '../logic/narrativeGenerator'

export default function DiagnosisFlow({ onComplete, onBack }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [fadeIn, setFadeIn] = useState(true)

  const question = QUESTIONS[currentStep]
  const totalSteps = QUESTIONS.length
  const currentAnswer = answers[question.id]

  // 選択済みかどうか
  const hasSelection = question.type === 'multi'
    ? (currentAnswer && currentAnswer.length > 0)
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

  // 次へ
  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      transitionTo(currentStep + 1)
    } else {
      // 診断完了 → ロジック実行
      const parsed = parseAnswers(answers)
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

      onComplete({
        answers: parsed,
        archetype,
        excludedTheories: displayExcluded,
        recommendedTheories,
        rules,
        narrative,
        bioContextCards,
      })
    }
  }

  // 戻る
  const handleBack = () => {
    if (currentStep > 0) {
      transitionTo(currentStep - 1)
    } else {
      onBack()
    }
  }

  return (
    <div className="min-h-svh flex flex-col px-4 py-6 max-w-lg mx-auto">
      {/* プログレスバー */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-text-muted">
            質問 {currentStep + 1} / {totalSteps}
          </span>
          <span className="text-xs text-text-muted">
            {Math.round(((currentStep + 1) / totalSteps) * 100)}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-card rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* 質問エリア */}
      <div
        className={`flex-1 transition-opacity duration-200 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* 質問ラベル */}
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
          {currentStep < totalSteps - 1 ? '次へ' : '診断結果を見る'}
        </button>
        <button
          onClick={handleBack}
          className="w-full py-2 text-sm text-text-muted hover:text-text transition-colors cursor-pointer"
        >
          {currentStep > 0 ? '← 前の質問に戻る' : '← トップに戻る'}
        </button>
      </div>
    </div>
  )
}
