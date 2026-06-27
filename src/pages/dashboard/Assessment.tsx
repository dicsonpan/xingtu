import { useState, useEffect } from 'react';
import { assessmentApi } from '../../api/client';
import type { TalentProfile } from '../../../shared/types';

interface DimensionDef {
  key: string;
  label: string;
  desc: string;
}

const DIMENSIONS: DimensionDef[] = [
  { key: 'hands_on_ability', label: '动手能力', desc: '喜欢拆装东西、做手工、修理物品' },
  { key: 'spatial_thinking', label: '空间想象力', desc: '能在脑海中想象立体形状、看图纸' },
  { key: 'interpersonal_skill', label: '人际交往', desc: '善于与人沟通、组织活动、调解矛盾' },
  { key: 'art_perception', label: '艺术感知', desc: '对色彩、音乐、美感有敏锐感受' },
  { key: 'logical_thinking', label: '逻辑思维', desc: '善于分析问题、找规律、推理' },
  { key: 'language_expression', label: '语言表达', desc: '善于表达观点、讲故事、写文章' },
  { key: 'memory_ability', label: '记忆能力', desc: '记得快、记得牢、过目不忘' },
  { key: 'observation_ability', label: '观察力', desc: '善于发现细节、注意到别人忽略的' },
];

interface AnalysisResult {
  assessment_id: number;
  talent_profile: TalentProfile;
  tokens_used: number;
}

interface HistoryAssessment {
  talent_profile: TalentProfile | null;
  created_at: string;
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ProfileView({ profile }: { profile: TalentProfile }) {
  return (
    <>
      {profile.summary && (
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: 'var(--accent2)',
            lineHeight: 1.5,
            marginBottom: 20,
          }}
        >
          {profile.summary}
        </div>
      )}

      {profile.strengths && profile.strengths.length > 0 && (
        <div className="result-block">
          <h4>优势天赋</h4>
          <div className="tag-group">
            {profile.strengths.map((s, i) => (
              <span className="tag active" key={i}>
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {profile.weaknesses && profile.weaknesses.length > 0 && (
        <div className="result-block">
          <h4>待提升方面</h4>
          <div className="tag-group">
            {profile.weaknesses.map((w, i) => (
              <span className="tag" key={i}>
                {w}
              </span>
            ))}
          </div>
        </div>
      )}

      {profile.recommended_directions && profile.recommended_directions.length > 0 && (
        <div className="result-block">
          <h4>推荐发展方向</h4>
          <div className="tag-group">
            {profile.recommended_directions.map((r, i) => (
              <span className="tag active" key={i}>
                {r}
              </span>
            ))}
          </div>
        </div>
      )}

      {profile.detailed_analysis && (
        <div className="result-block">
          <h4>详细分析</h4>
          <p style={{ color: 'var(--ink)', lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>
            {profile.detailed_analysis}
          </p>
        </div>
      )}
    </>
  );
}

export function Assessment() {
  const [dimensions, setDimensions] = useState<Record<string, number>>(() =>
    Object.fromEntries(DIMENSIONS.map((d) => [d.key, 3]))
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [hasHistory, setHasHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<HistoryAssessment | null>(null);

  useEffect(() => {
    assessmentApi
      .latest()
      .then((res) => {
        if (res?.assessment) setHasHistory(true);
      })
      .catch(() => {
        // 暂无测评记录
      });
  }, []);

  const handleSlider = (key: string, value: number) => {
    setDimensions((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await assessmentApi.submit({ dimensions });
      setResult(res);
      setHasHistory(true);
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } catch (e) {
      setError(e instanceof Error ? e.message : '提交失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistory = async () => {
    setHistoryLoading(true);
    setError('');
    try {
      const res = await assessmentApi.latest();
      setHistory(res.assessment);
    } catch (e) {
      setError(e instanceof Error ? e.message : '获取历史记录失败');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setDimensions(Object.fromEntries(DIMENSIONS.map((d) => [d.key, 3])));
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>天赋发掘测评</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          偏科不等于没天赋。请根据真实情况为以下 8 个天赋维度打分（1-5 分），AI 将为您生成专属天赋画像。
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {hasHistory && !history && !historyLoading && !result && (
        <div
          className="alert alert-info"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}
        >
          <span>您之前已完成过天赋测评，可以查看上次的分析结果。</span>
          <button className="btn btn-secondary btn-sm" onClick={handleViewHistory}>
            查看上次测评结果
          </button>
        </div>
      )}

      {/* 测评问卷 */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 className="card-title">天赋维度自评</h3>
        {DIMENSIONS.map((d) => (
          <div className="form-group" key={d.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label className="form-label" style={{ marginBottom: 0 }}>
                {d.label}
              </label>
              <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{dimensions[d.key]}/5</span>
            </div>
            <div className="form-hint" style={{ marginBottom: 8 }}>
              {d.desc}
            </div>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={dimensions[d.key]}
              onChange={(e) => handleSlider(d.key, Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        ))}
        <button className="btn btn-primary btn-lg btn-block" onClick={handleSubmit} disabled={loading}>
          {loading ? '分析中...' : '开始 AI 分析'}
        </button>
      </div>

      {/* 加载中 */}
      {loading && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="loading">
            <div className="spinner" />
            AI 正在分析您的天赋...
          </div>
        </div>
      )}

      {/* AI 分析结果 */}
      {result && result.talent_profile && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 className="card-title">AI 天赋分析结果</h3>
          <ProfileView profile={result.talent_profile} />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 16,
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>本次消耗 Token：{result.tokens_used}</span>
            <button className="btn btn-secondary btn-sm" onClick={handleReset}>
              重新测评
            </button>
          </div>
        </div>
      )}

      {/* 历史测评结果 */}
      {historyLoading && (
        <div className="card">
          <div className="loading">
            <div className="spinner" /> 加载历史记录...
          </div>
        </div>
      )}

      {history && history.talent_profile && (
        <div className="card">
          <h3 className="card-title">
            上次测评结果{' '}
            <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted)' }}>
              （{formatDate(history.created_at)}）
            </span>
          </h3>
          <ProfileView profile={history.talent_profile} />
        </div>
      )}
    </div>
  );
}
