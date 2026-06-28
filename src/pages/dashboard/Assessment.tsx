import { useState, useEffect, useRef } from 'react';
import { assessmentApi } from '../../api/client';
import type { TalentProfile } from '../../../shared/types';

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

// ============================================================
// 情景题定义
// ============================================================
interface ScenarioOption {
  value: string;
  label: string;
}

interface ScenarioQuestion {
  question: string;
  options: ScenarioOption[];
}

const SCENARIO_QUESTIONS: ScenarioQuestion[] = [
  {
    question: '课余时间，你最喜欢做什么？',
    options: [
      { value: 'hands_on', label: '拆装、修理东西，或者做手工' },
      { value: 'art', label: '画画、设计，或者听音乐' },
      { value: 'social', label: '和朋友一起玩、组织活动' },
      { value: 'logic', label: '玩策略游戏、解谜题' },
    ],
  },
  {
    question: '做事的时候，你最享受哪种感觉？',
    options: [
      { value: 'hands_on', label: '手上有活儿，做出实在的东西' },
      { value: 'spatial', label: '脑海里浮现出画面和形状' },
      { value: 'social', label: '和人打交道，聊到一块儿' },
      { value: 'logic', label: '找到规律，想明白一件事' },
    ],
  },
  {
    question: '朋友最常夸你什么？',
    options: [
      { value: 'hands_on', label: '手巧，什么东西都会修' },
      { value: 'art', label: '有创意，审美不错' },
      { value: 'social', label: '会来事，人缘好' },
      { value: 'memory', label: '记性好，过目不忘' },
    ],
  },
  {
    question: '遇到一个难题，你的第一反应是？',
    options: [
      { value: 'hands_on', label: '先动手试试看' },
      { value: 'spatial', label: '在脑子里画个图想想' },
      { value: 'social', label: '找人讨论一下' },
      { value: 'logic', label: '一步步推理分析' },
    ],
  },
  {
    question: '如果让你学一门手艺，你最想学？',
    options: [
      { value: 'hands_on', label: '机械修理、汽车维修' },
      { value: 'art', label: '设计、美工、摄影' },
      { value: 'social', label: '销售、管理、培训' },
      { value: 'logic', label: '编程、电子技术' },
    ],
  },
  {
    question: '你觉得自己最接近哪种人？',
    options: [
      { value: 'hands_on', label: '实干家——动手能力强' },
      { value: 'art', label: '艺术家——感知力敏锐' },
      { value: 'social', label: '交际者——善于沟通' },
      { value: 'observation', label: '观察者——善于发现细节' },
    ],
  },
];

// ============================================================
// 类型定义
// ============================================================
interface ScenarioAnswer {
  questionIndex: number;
  selected: string;
  selectedLabel: string;
}

interface AnalysisResult {
  assessment_id: number;
  talent_profile: TalentProfile;
  tokens_used: number;
}

interface HistoryAssessment {
  answers: any;
  talent_profile: TalentProfile | null;
  created_at: string;
}

const TOTAL_STEPS = 3;
const STEP_LABELS = ['情景选择', '自由描述', 'AI 分析'];

// ============================================================
// 工具函数
// ============================================================
function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ============================================================
// 天赋画像展示组件
// ============================================================
function ProfileView({ profile }: { profile: TalentProfile }) {
  return (
    <>
      {profile.summary && (
        <div
          style={{
            fontSize: 20,
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
          <h4>你的优势</h4>
          <div className="tag-group">
            {profile.strengths.map((s, i) => (
              <span
                className="tag"
                key={i}
                style={{ background: 'var(--success-light)', color: 'var(--success)', borderColor: 'transparent', cursor: 'default' }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {profile.weaknesses && profile.weaknesses.length > 0 && (
        <div className="result-block">
          <h4>需要注意</h4>
          <div className="tag-group">
            {profile.weaknesses.map((w, i) => (
              <span
                className="tag"
                key={i}
                style={{ background: 'var(--warning-light)', color: 'var(--warning)', borderColor: 'transparent', cursor: 'default' }}
              >
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
              <span
                className="tag"
                key={i}
                style={{ background: 'var(--accent-light)', color: 'var(--accent)', borderColor: 'transparent', cursor: 'default' }}
              >
                {r}
              </span>
            ))}
          </div>
        </div>
      )}

      {profile.detailed_analysis && (
        <div className="result-block">
          <h4>详细分析</h4>
          <p style={{ color: 'var(--ink)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
            {profile.detailed_analysis}
          </p>
        </div>
      )}
    </>
  );
}

// ============================================================
// 主组件
// ============================================================
export function Assessment() {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Record<number, ScenarioAnswer>>({});
  const [voiceText, setVoiceText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryAssessment | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 语音识别相关状态
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  // 页面加载：检查历史测评 & 语音识别支持
  useEffect(() => {
    assessmentApi
      .latest()
      .then((res) => {
        if (res?.assessment) setHistory(res.assessment);
      })
      .catch(() => {
        // 暂无测评记录
      });

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
    }
  }, []);

  // 是否所有情景题都已作答
  const allAnswered = SCENARIO_QUESTIONS.every((_, i) => answers[i]);

  const handleSelectOption = (questionIndex: number, value: string, label: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionIndex]: { questionIndex, selected: value, selectedLabel: label },
    }));
  };

  // ============================================================
  // 语音识别
  // ============================================================
  const startListening = () => {
    if (!voiceSupported) return;
    // 已在录音中则不重复启动
    if (recognitionRef.current) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-CN';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let finalText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalText += event.results[i][0].transcript;
          }
        }
        if (finalText) {
          setVoiceText((prev) => prev + finalText);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('语音识别错误:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch (e) {
      console.error('启动语音识别失败:', e);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  // ============================================================
  // 提交 AI 分析
  // ============================================================
  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const scenarioAnswers = SCENARIO_QUESTIONS.map((_, i) => answers[i]);
      const res = await assessmentApi.submit({
        scenario_answers: scenarioAnswers,
        voice_description: voiceText,
      });
      setResult(res);
      // 更新历史记录为最新结果
      setHistory({
        answers: scenarioAnswers,
        talent_profile: res.talent_profile,
        created_at: new Date().toISOString(),
      });
      setHistoryExpanded(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '提交失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setAnswers({});
    setVoiceText('');
    setResult(null);
    setError('');
  };

  const handleViewHistory = () => {
    if (!history) {
      setHistoryLoading(true);
      assessmentApi
        .latest()
        .then((res) => {
          if (res?.assessment) {
            setHistory(res.assessment);
            setHistoryExpanded(true);
          }
        })
        .catch((e) => {
          setError(e instanceof Error ? e.message : '获取历史记录失败');
        })
        .finally(() => setHistoryLoading(false));
    } else {
      setHistoryExpanded((v) => !v);
    }
  };

  const canNext = step === 1 ? allAnswered : true;

  const handleNext = () => {
    if (!canNext) return;
    setError('');
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const handlePrev = () => {
    setError('');
    setStep((s) => Math.max(s - 1, 1));
  };

  // ============================================================
  // 进度指示器
  // ============================================================
  const renderProgress = () => (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 0 }}>
        {STEP_LABELS.map((label, i) => {
          const stepNum = i + 1;
          const isCurrent = step === stepNum;
          const isCompleted = step > stepNum;
          return (
            <div
              key={i}
              style={{ display: 'flex', alignItems: 'flex-start', flex: i === STEP_LABELS.length - 1 ? '0 0 auto' : '1 1 auto' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 72 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 15,
                    fontWeight: 700,
                    background: isCurrent || isCompleted ? 'var(--accent)' : '#fff',
                    color: isCurrent || isCompleted ? '#fff' : 'var(--muted)',
                    border: isCurrent || isCompleted ? '2px solid var(--accent)' : '2px solid var(--rule)',
                    transition: 'all 0.2s',
                  }}
                >
                  {isCompleted ? '✓' : stepNum}
                </div>
                <span
                  style={{
                    fontSize: 12,
                    color: isCurrent ? 'var(--accent)' : isCompleted ? 'var(--ink)' : 'var(--muted)',
                    fontWeight: isCurrent ? 700 : 500,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    background: isCompleted ? 'var(--accent)' : 'var(--rule)',
                    margin: '0 8px',
                    marginTop: 16,
                    transition: 'background 0.2s',
                    minWidth: 20,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: 10 }}>
        第 {step} 步 / 共 {TOTAL_STEPS} 步
      </div>
    </div>
  );

  // ============================================================
  // 第 1 步：情景选择
  // ============================================================
  const renderStep1 = () => (
    <div>
      <h3 className="card-title">情景选择</h3>
      <p className="form-hint" style={{ marginBottom: 20 }}>
        下面有 6 个小问题，没有标准答案，凭第一直觉选最像你的那个就好。全部选完才能进入下一步。
      </p>
      {SCENARIO_QUESTIONS.map((q, qi) => (
        <div className="form-group" key={qi}>
          <label className="form-label">
            {qi + 1}. {q.question}
          </label>
          <div className="tag-group" style={{ marginTop: 8 }}>
            {q.options.map((opt) => {
              const selected = answers[qi]?.selected === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`tag ${selected ? 'active' : ''}`}
                  onClick={() => handleSelectOption(qi, opt.value, opt.label)}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  // ============================================================
  // 第 2 步：自由描述（支持语音输入）
  // ============================================================
  const renderStep2 = () => (
    <div>
      <h3 className="card-title">用你自己的话说说</h3>
      <p className="form-hint" style={{ marginBottom: 16 }}>
        描述一下你擅长什么、喜欢什么。比如："我数学不好但特别喜欢画画，从小就喜欢给同学画肖像"。说得越具体，AI
        分析越准。
      </p>
      {!voiceSupported && <div className="alert alert-warning">当前浏览器不支持语音输入，请直接打字</div>}
      <div className="form-group">
        <textarea
          className="form-textarea"
          style={{ minHeight: 160 }}
          placeholder="在这里写下你对自己的了解……（也可以按住下方按钮说话）"
          value={voiceText}
          onChange={(e) => setVoiceText(e.target.value)}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onMouseDown={startListening}
          onMouseUp={stopListening}
          onMouseLeave={stopListening}
          onTouchStart={(e) => {
            e.preventDefault();
            startListening();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            stopListening();
          }}
          disabled={!voiceSupported}
          style={
            isListening
              ? { background: 'var(--danger)', color: '#fff', borderColor: 'var(--danger)' }
              : {}
          }
        >
          {isListening ? '正在说话...' : '按住说话'}
        </button>
        <span className="form-hint">按住按钮说话，松开后识别结果会自动追加到文本框</span>
      </div>
    </div>
  );

  // ============================================================
  // 第 3 步：AI 分析结果
  // ============================================================
  const renderStep3 = () => {
    if (loading) {
      return (
        <div>
          <h3 className="card-title">AI 分析中</h3>
          <div className="loading">
            <div className="spinner" />
            AI 正在分析您的天赋...
          </div>
        </div>
      );
    }

    if (result && result.talent_profile) {
      return (
        <div>
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
      );
    }

    // 等待用户点击开始分析
    return (
      <div>
        <h3 className="card-title">AI 分析</h3>
        <p className="form-hint" style={{ marginBottom: 20 }}>
          准备好了吗？AI 将根据你的情景选择和文字描述，生成专属天赋画像。
        </p>
        <button className="btn btn-primary btn-lg btn-block" onClick={handleAnalyze}>
          开始 AI 分析
        </button>
      </div>
    );
  };

  // ============================================================
  // 底部导航按钮
  // ============================================================
  const renderNav = () => {
    // 分析中或结果展示时不显示步骤导航
    if (step === 3 && (loading || result)) return null;

    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 24,
          gap: 12,
        }}
      >
        {step > 1 ? (
          <button className="btn btn-secondary" onClick={handlePrev}>
            上一步
          </button>
        ) : (
          <span />
        )}
        {step < 3 && (
          <button className="btn btn-primary" onClick={handleNext} disabled={!canNext}>
            下一步
          </button>
        )}
      </div>
    );
  };

  // ============================================================
  // 页面渲染
  // ============================================================
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>天赋发掘测评</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          偏科不等于没天赋。花两分钟回答几个小问题，AI 帮你找到自己的优势方向。
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* 历史测评提示卡片 */}
      {history && !result && !loading && (
        <div className="alert alert-info" style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <span>您已完成过测评（{formatDate(history.created_at)}），可以查看上次的分析结果。</span>
            <button className="btn btn-secondary btn-sm" onClick={handleViewHistory} disabled={historyLoading}>
              {historyLoading ? '加载中...' : historyExpanded ? '收起' : '查看上次结果'}
            </button>
          </div>
          {historyExpanded && history.talent_profile && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--rule)' }}>
              <ProfileView profile={history.talent_profile} />
            </div>
          )}
        </div>
      )}

      {/* 多步骤测评卡片 */}
      <div className="card">
        {renderProgress()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {renderNav()}
      </div>
    </div>
  );
}
