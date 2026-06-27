import { useState } from 'react';
import { Link } from 'react-router-dom';
import { schoolApi, matchingApi } from '../../api/client';

interface School {
  school_type: string;
  features: string;
  matching_majors: string[];
  tuition_range: string;
  employment_rate: string | number;
  pros: string[];
  cons: string[];
}

interface SchoolResult {
  schools: School[];
  comparison_advice: string;
  application_tips: string[];
  tokens_used: number;
}

export function SchoolCompare() {
  const [majorName, setMajorName] = useState('');
  const [additionalRequirements, setAdditionalRequirements] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SchoolResult | null>(null);
  const [error, setError] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const loadSuggestions = async () => {
    setSuggestionLoading(true);
    setError('');
    try {
      const res = await matchingApi.recommend();
      const majors = (res.recommendations || [])
        .map((r: { major_name?: string }) => r.major_name)
        .filter((m): m is string => typeof m === 'string' && m.length > 0);
      setSuggestions(majors);
      if (majors.length === 0) {
        setError('暂未获取到推荐专业，请先完成天赋测评与专业匹配');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载推荐专业失败');
    } finally {
      setSuggestionLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!majorName.trim()) {
      setError('请输入目标专业名称');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await schoolApi.recommend({
        major_name: majorName.trim(),
        additional_requirements: additionalRequirements.trim() || undefined,
      });
      setResult(res as SchoolResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : '获取推荐失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>学校推荐对比</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          输入目标专业和您的额外要求，AI 将推荐合适的学校并进行对比分析。
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="form-group">
          <label className="form-label">
            目标专业<span className="req"> *</span>
          </label>
          <input
            className="form-input"
            value={majorName}
            onChange={(e) => setMajorName(e.target.value)}
            placeholder="如：护理、新能源汽车维修、幼儿保育"
          />
          <div
            className="form-hint"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}
          >
            <span>不确定选什么专业？可从匹配结果中载入。</span>
            <button className="btn btn-secondary btn-sm" onClick={loadSuggestions} disabled={suggestionLoading}>
              {suggestionLoading ? '载入中...' : '从匹配结果载入'}
            </button>
          </div>
          {suggestions.length > 0 && (
            <div className="tag-group" style={{ marginTop: 10 }}>
              {suggestions.map((m, i) => (
                <button
                  key={i}
                  className={`tag ${majorName === m ? 'active' : ''}`}
                  onClick={() => setMajorName(m)}
                  type="button"
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">额外要求</label>
          <textarea
            className="form-textarea"
            value={additionalRequirements}
            onChange={(e) => setAdditionalRequirements(e.target.value)}
            placeholder="如：希望学费较低、离家近、公办学校、就业率高等"
          />
        </div>

        <button className="btn btn-primary btn-lg btn-block" onClick={handleSubmit} disabled={loading}>
          {loading ? '获取中...' : '获取推荐'}
        </button>
      </div>

      {loading && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="loading">
            <div className="spinner" /> AI 正在为您筛选对比学校...
          </div>
        </div>
      )}

      {result && (
        <div className="card">
          <h3 className="card-title">推荐学校对比</h3>

          {result.schools && result.schools.length > 0 ? (
            <div>
              {result.schools.map((s, i) => (
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
                    <h4 style={{ margin: 0 }}>
                      {i + 1}. {s.school_type}
                    </h4>
                    {s.employment_rate != null && s.employment_rate !== '' && (
                      <span className="badge badge-approved">
                        就业率 {s.employment_rate}
                        {typeof s.employment_rate === 'number' ? '%' : ''}
                      </span>
                    )}
                  </div>

                  {s.features && <p style={{ marginBottom: 10 }}>{s.features}</p>}

                  {s.tuition_range && (
                    <p style={{ marginBottom: 10, fontSize: 14 }}>
                      <span style={{ color: 'var(--muted)' }}>学费区间：</span>
                      <strong>{s.tuition_range}</strong>
                    </p>
                  )}

                  {s.matching_majors && s.matching_majors.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>开设相关专业</div>
                      <div className="tag-group">
                        {s.matching_majors.map((m, j) => (
                          <span className="tag" key={j}>
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {s.pros && s.pros.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600, marginBottom: 4 }}>优点</div>
                      <ul style={{ paddingLeft: 20 }}>
                        {s.pros.map((p, j) => (
                          <li key={j} style={{ fontSize: 14, marginBottom: 2 }}>
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {s.cons && s.cons.length > 0 && (
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600, marginBottom: 4 }}>缺点</div>
                      <ul style={{ paddingLeft: 20 }}>
                        {s.cons.map((c, j) => (
                          <li key={j} style={{ fontSize: 14, marginBottom: 2 }}>
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="icon">🏫</div>暂无匹配学校
            </div>
          )}

          {result.comparison_advice && (
            <div className="result-block" style={{ background: 'var(--accent2-light)' }}>
              <h4>对比建议</h4>
              <p style={{ lineHeight: 1.85 }}>{result.comparison_advice}</p>
            </div>
          )}

          {result.application_tips && result.application_tips.length > 0 && (
            <div className="result-block">
              <h4>报考建议</h4>
              <ul style={{ paddingLeft: 20 }}>
                {result.application_tips.map((t, i) => (
                  <li key={i} style={{ marginBottom: 6 }}>
                    {t}
                  </li>
                ))}
              </ul>
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
            <Link to="/dashboard/antifraud" style={{ fontSize: 14 }}>
              对推荐学校不放心？前往防骗检测 →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
