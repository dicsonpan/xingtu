import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { matchingApi, assessmentApi } from '../../api/client';

interface Recommendation {
  major_name: string;
  match_score: number;
  reason: string;
  employment_prospect: string;
  required_talents: string[];
}

interface MatchResult {
  recommendations: Recommendation[];
  summary: string;
  tokens_used: number;
}

function scoreClass(score: number): string {
  if (score >= 80) return 'score-high';
  if (score >= 60) return 'score-mid';
  return 'score-low';
}

function scoreText(score: number): string {
  if (score >= 80) return '高度匹配';
  if (score >= 60) return '较为匹配';
  return '匹配度低';
}

export function Matching() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState('');
  const [hasAssessment, setHasAssessment] = useState<boolean | null>(null);

  useEffect(() => {
    assessmentApi
      .latest()
      .then((res) => setHasAssessment(!!res?.assessment))
      .catch(() => setHasAssessment(false));
  }, []);

  const handleMatch = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await matchingApi.recommend();
      setResult(res as MatchResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : '匹配失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>专业智能匹配</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          基于您的天赋测评和个人档案，AI 将为您推荐最适合的职业教育专业。
        </p>
      </div>

      {hasAssessment === false && (
        <div className="alert alert-warning">
          您还未完成天赋测评，匹配效果可能不佳。建议先完成{' '}
          <Link to="/dashboard/assessment" style={{ fontWeight: 700, textDecoration: 'underline' }}>
            天赋发掘测评
          </Link>{' '}
          再进行专业匹配。
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card" style={{ marginBottom: 24 }}>
        <button className="btn btn-primary btn-lg btn-block" onClick={handleMatch} disabled={loading}>
          {loading ? '匹配中...' : '开始匹配'}
        </button>
      </div>

      {loading && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="loading">
            <div className="spinner" /> AI 正在为您匹配最合适的专业...
          </div>
        </div>
      )}

      {result && (
        <div className="card">
          <h3 className="card-title">匹配结果</h3>

          {result.summary && <p style={{ lineHeight: 1.85, marginBottom: 20 }}>{result.summary}</p>}

          {result.recommendations && result.recommendations.length > 0 ? (
            <div>
              {result.recommendations.map((rec, i) => (
                <div className="result-block" key={i}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    <h4 style={{ margin: 0, fontSize: 16 }}>
                      {i + 1}. {rec.major_name}
                    </h4>
                    <span className={`match-score ${scoreClass(rec.match_score)}`}>
                      匹配度 {rec.match_score} · {scoreText(rec.match_score)}
                    </span>
                  </div>

                  {rec.reason && <p style={{ marginBottom: 10, color: 'var(--ink)' }}>{rec.reason}</p>}

                  {rec.employment_prospect && (
                    <p style={{ marginBottom: 10, fontSize: 14, color: 'var(--muted)' }}>
                      <strong style={{ color: 'var(--accent2)' }}>就业前景：</strong>
                      {rec.employment_prospect}
                    </p>
                  )}

                  {rec.required_talents && rec.required_talents.length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>所需天赋</div>
                      <div className="tag-group">
                        {rec.required_talents.map((t, j) => (
                          <span className="tag" key={j}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="icon">🔍</div>暂无匹配结果
            </div>
          )}

          <div
            style={{
              marginTop: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>本次消耗 Token：{result.tokens_used}</span>
            {result.recommendations && result.recommendations.length > 0 && (
              <Link to="/dashboard/school" style={{ fontSize: 14 }}>
                找到心仪专业？前往学校推荐对比 →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
