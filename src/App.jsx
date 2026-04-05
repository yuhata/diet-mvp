import { useState, useEffect } from 'react'
import Landing from './components/Landing'
import DiagnosisFlow from './components/DiagnosisFlow'
import ResultPage from './components/ResultPage'
import Tracking from './components/Tracking'

function App() {
  const [screen, setScreen] = useState('landing')
  const [diagnosisResult, setDiagnosisResult] = useState(null)

  // ?reset パラメータでデータクリア
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('reset')) {
      localStorage.removeItem('dietMVP_data')
      window.location.replace(window.location.pathname)
      return
    }
  }, [])

  // localStorage から復元（トラッキング途中で再訪した場合）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const saved = localStorage.getItem('dietMVP_data')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        if (data.diagnosis) {
          setDiagnosisResult(data.diagnosis)
          // ?day=N パラメータがある場合、またはトラッキングデータがある場合はトラッキング画面へ
          if (params.has('day') || (data.tracking && Object.keys(data.tracking).length > 0)) {
            setScreen('tracking')
          } else {
            setScreen('result')
          }
        }
      } catch {
        // パースエラーは無視
      }
    }
  }, [])

  const handleDiagnosisComplete = (result) => {
    setDiagnosisResult(result)
    // localStorage に保存
    const existing = JSON.parse(localStorage.getItem('dietMVP_data') || '{}')
    existing.diagnosis = { ...result, timestamp: new Date().toISOString() }
    localStorage.setItem('dietMVP_data', JSON.stringify(existing))
    setScreen('result')
  }

  const handleStartTracking = () => {
    setScreen('tracking')
  }

  const handleRestart = () => {
    localStorage.removeItem('dietMVP_data')
    setDiagnosisResult(null)
    setScreen('diagnosis')
  }

  return (
    <div className="min-h-svh bg-bg">
      {screen === 'landing' && (
        <Landing onStart={() => setScreen('diagnosis')} />
      )}
      {screen === 'diagnosis' && (
        <DiagnosisFlow
          onComplete={handleDiagnosisComplete}
          onBack={() => setScreen('landing')}
        />
      )}
      {screen === 'result' && diagnosisResult && (
        <ResultPage
          {...diagnosisResult}
          onStartTracking={handleStartTracking}
          onRestart={handleRestart}
        />
      )}
      {screen === 'tracking' && diagnosisResult && (
        <Tracking
          archetype={diagnosisResult.archetype}
          rules={diagnosisResult.rules}
          recommendedTheories={diagnosisResult.recommendedTheories}
          onRestart={handleRestart}
        />
      )}
    </div>
  )
}

export default App
