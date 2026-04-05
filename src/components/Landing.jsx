export default function Landing({ onStart }) {
  return (
    <div className="min-h-svh flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-md w-full text-center space-y-8">
        {/* ロゴ・アイコン */}
        <div className="text-5xl mb-2">🍽️</div>

        {/* メインコピー */}
        <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-text">
          ダイエットに正解はない。
          <br />
          あなたに正解がある。
        </h1>

        {/* 説明テキスト */}
        <div className="space-y-4 text-text-muted text-sm leading-relaxed">
          <p>
            世の中には数百のダイエット理論があります。
            <br />
            でも「全員に効く方法」は存在しません。
          </p>
          <p>
            9つの質問であなたの生活パターン・体質・行動タイプを分析し、
            <strong className="text-text">構造的に合わない理論を除外</strong>。
            残った理論から、あなた専用の
            <strong className="text-text">3ルール</strong>
            を生成します。
          </p>
          <p className="text-xs text-text-muted/70">
            生物学的根拠に基づく診断 / 無料 / 登録不要
          </p>
        </div>

        {/* CTAボタン */}
        <button
          onClick={onStart}
          className="w-full py-4 px-6 bg-accent hover:bg-accent-dark text-white font-bold text-lg rounded-xl transition-colors duration-200 cursor-pointer"
        >
          診断をはじめる（3分）
        </button>

        {/* 信頼性の補足 */}
        <div className="flex items-center justify-center gap-4 text-xs text-text-muted/60">
          <span>📊 RCTベース</span>
          <span className="w-px h-3 bg-border" />
          <span>🔬 12の除外条件</span>
          <span className="w-px h-3 bg-border" />
          <span>🎯 15アーキタイプ</span>
        </div>
      </div>
    </div>
  )
}
