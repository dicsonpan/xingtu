import { useEffect, useState } from 'react';
import { profileApi } from '../../api/client';
import type { UserProfile } from '../../../shared/types';

// 天赋维度键（这些字段在 FormState 中均为 number 类型）
type TalentKey =
  | 'hands_on_ability'
  | 'spatial_thinking'
  | 'interpersonal_skill'
  | 'art_perception'
  | 'logical_thinking'
  | 'language_expression'
  | 'memory_ability'
  | 'observation_ability';

// 八大天赋维度（1-5 分）
const TALENT_DIMENSIONS: { key: TalentKey; label: string }[] = [
  { key: 'hands_on_ability', label: '动手能力' },
  { key: 'spatial_thinking', label: '空间想象力' },
  { key: 'interpersonal_skill', label: '人际交往' },
  { key: 'art_perception', label: '艺术感知' },
  { key: 'logical_thinking', label: '逻辑思维' },
  { key: 'language_expression', label: '语言表达' },
  { key: 'memory_ability', label: '记忆能力' },
  { key: 'observation_ability', label: '观察力' },
];

// 中考科目
const SUBJECTS: { key: string; label: string }[] = [
  { key: 'chinese', label: '语文' },
  { key: 'math', label: '数学' },
  { key: 'english', label: '英语' },
  { key: 'physics', label: '物理' },
  { key: 'chemistry', label: '化学' },
  { key: 'politics', label: '政治' },
  { key: 'history', label: '历史' },
  { key: 'pe', label: '体育' },
];

// 预定义兴趣标签
const INTEREST_TAGS = [
  '机械', '电子', '计算机', '烹饪', '美容美发', '服装设计', '建筑', '汽车维修',
  '护理', '幼教', '电子商务', '会计', '数控', '焊接', '物流', '旅游',
  '艺术', '音乐', '舞蹈', '摄影',
];

// 偏好学校类型
const SCHOOL_TYPES = ['中专', '中职', '技校'];

// 表单状态类型
interface FormState {
  real_name: string;
  gender: string;
  birth_year: string;
  province: string;
  city: string;
  school_name: string;
  exam_total_score: string;
  subject_scores: Record<string, string>;
  hands_on_ability: number;
  spatial_thinking: number;
  interpersonal_skill: number;
  art_perception: number;
  logical_thinking: number;
  language_expression: number;
  memory_ability: number;
  observation_ability: number;
  interests: string[];
  hobbies: string;
  family_income_level: string;
  preferred_region: string;
  preferred_school_type: string[];
}

// 由 API 返回的档案构造初始表单
function buildForm(p: UserProfile): FormState {
  return {
    real_name: p.real_name ?? '',
    gender: p.gender ?? '',
    birth_year: p.birth_year != null ? String(p.birth_year) : '',
    province: p.province ?? '',
    city: p.city ?? '',
    school_name: p.school_name ?? '',
    exam_total_score: p.exam_total_score != null ? String(p.exam_total_score) : '',
    subject_scores: Object.fromEntries(
      SUBJECTS.map(
        (s): [string, string] => [
          s.key,
          p.subject_scores && p.subject_scores[s.key] != null
            ? String(p.subject_scores[s.key])
            : '',
        ]
      )
    ),
    hands_on_ability: p.hands_on_ability ?? 3,
    spatial_thinking: p.spatial_thinking ?? 3,
    interpersonal_skill: p.interpersonal_skill ?? 3,
    art_perception: p.art_perception ?? 3,
    logical_thinking: p.logical_thinking ?? 3,
    language_expression: p.language_expression ?? 3,
    memory_ability: p.memory_ability ?? 3,
    observation_ability: p.observation_ability ?? 3,
    interests: p.interests ?? [],
    hobbies: Array.isArray(p.hobbies) ? p.hobbies.join('\n') : '',
    family_income_level: p.family_income_level ?? '',
    preferred_region: p.preferred_region ?? '',
    preferred_school_type: p.preferred_school_type ?? [],
  };
}

export function Profile() {
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 加载档案
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await profileApi.get();
        if (!cancelled) {
          setForm(buildForm(res.profile as UserProfile));
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '加载档案失败');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 通用字段更新
  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  // 科目分数更新
  const setSubject = (key: string, value: string) => {
    setForm((prev) =>
      prev
        ? { ...prev, subject_scores: { ...prev.subject_scores, [key]: value } }
        : prev
    );
  };

  // 天赋维度更新
  const setDimension = (key: TalentKey, value: number) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  // 标签多选切换
  const toggleTag = (list: 'interests' | 'preferred_school_type', tag: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const current = prev[list];
      const next = current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag];
      return { ...prev, [list]: next };
    });
  };

  // 保存
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // 数值字段转空字符串为 undefined，避免提交空值
      const numOrUndef = (v: string) => (v.trim() === '' ? undefined : Number(v));

      const body = {
        real_name: form.real_name.trim() || undefined,
        gender: (form.gender || undefined) as 'male' | 'female' | 'other' | undefined,
        birth_year: numOrUndef(form.birth_year),
        province: form.province.trim() || undefined,
        city: form.city.trim() || undefined,
        school_name: form.school_name.trim() || undefined,
        exam_total_score: numOrUndef(form.exam_total_score),
        subject_scores: Object.fromEntries(
          Object.entries(form.subject_scores)
            .filter(([, v]) => v.trim() !== '')
            .map(([k, v]): [string, number] => [k, Number(v)])
        ),
        hands_on_ability: form.hands_on_ability,
        spatial_thinking: form.spatial_thinking,
        interpersonal_skill: form.interpersonal_skill,
        art_perception: form.art_perception,
        logical_thinking: form.logical_thinking,
        language_expression: form.language_expression,
        memory_ability: form.memory_ability,
        observation_ability: form.observation_ability,
        interests: form.interests,
        hobbies: form.hobbies
          .split(/[\n,，]/)
          .map((s) => s.trim())
          .filter(Boolean),
        family_income_level: (form.family_income_level || undefined) as
          | 'low'
          | 'medium'
          | 'high'
          | undefined,
        preferred_region: form.preferred_region.trim() || undefined,
        preferred_school_type: form.preferred_school_type,
      };

      await profileApi.update(body);
      setSuccess('档案保存成功');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" /> 加载中...
      </div>
    );
  }

  if (!form) {
    return <div className="alert alert-danger">{error || '档案加载失败'}</div>;
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>个人档案</h1>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSave}>
        {/* a) 基础信息 */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">基础信息</div>
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">真实姓名</label>
              <input
                className="form-input"
                value={form.real_name}
                onChange={(e) => setField('real_name', e.target.value)}
                placeholder="请输入真实姓名"
              />
            </div>
            <div className="form-group">
              <label className="form-label">性别</label>
              <select
                className="form-select"
                value={form.gender}
                onChange={(e) => setField('gender', e.target.value)}
              >
                <option value="">请选择</option>
                <option value="male">男</option>
                <option value="female">女</option>
                <option value="other">其他</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">出生年份</label>
              <input
                className="form-input"
                type="number"
                value={form.birth_year}
                onChange={(e) => setField('birth_year', e.target.value)}
                placeholder="如 2009"
              />
            </div>
            <div className="form-group">
              <label className="form-label">学校名称</label>
              <input
                className="form-input"
                value={form.school_name}
                onChange={(e) => setField('school_name', e.target.value)}
                placeholder="请输入所在学校"
              />
            </div>
            <div className="form-group">
              <label className="form-label">省份</label>
              <input
                className="form-input"
                value={form.province}
                onChange={(e) => setField('province', e.target.value)}
                placeholder="如 广东省"
              />
            </div>
            <div className="form-group">
              <label className="form-label">城市</label>
              <input
                className="form-input"
                value={form.city}
                onChange={(e) => setField('city', e.target.value)}
                placeholder="如 深圳市"
              />
            </div>
          </div>
        </div>

        {/* b) 中考信息 */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">中考信息</div>
          <div className="form-group">
            <label className="form-label">中考总分</label>
            <input
              className="form-input"
              type="number"
              value={form.exam_total_score}
              onChange={(e) => setField('exam_total_score', e.target.value)}
              placeholder="如 650"
              style={{ maxWidth: 240 }}
            />
            <div className="form-hint">填写当地中考满分制度下的实际总分</div>
          </div>
          <label className="form-label">各科分数</label>
          <div className="grid grid-2">
            {SUBJECTS.map((s) => (
              <div className="form-group" key={s.key}>
                <label className="form-label">{s.label}</label>
                <input
                  className="form-input"
                  type="number"
                  value={form.subject_scores[s.key]}
                  onChange={(e) => setSubject(s.key, e.target.value)}
                  placeholder="未填写"
                />
              </div>
            ))}
          </div>
        </div>

        {/* c) 天赋自评 */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">天赋自评（1-5 分）</div>
          <div className="form-hint" style={{ marginBottom: 16 }}>
            1 分为最弱，5 分为最强，请根据真实情况进行自评。
          </div>
          {TALENT_DIMENSIONS.map((d) => (
            <div className="slider-row" key={d.key}>
              <span className="slider-label">{d.label}</span>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={form[d.key]}
                onChange={(e) => setDimension(d.key, Number(e.target.value))}
              />
              <span className="slider-value">{form[d.key]}</span>
            </div>
          ))}
        </div>

        {/* d) 兴趣偏好 */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">兴趣偏好</div>
          <div className="form-group">
            <label className="form-label">兴趣标签（可多选）</label>
            <div className="tag-group">
              {INTEREST_TAGS.map((tag) => (
                <button
                  type="button"
                  key={tag}
                  className={`tag${form.interests.includes(tag) ? ' active' : ''}`}
                  onClick={() => toggleTag('interests', tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">个人爱好</label>
            <textarea
              className="form-textarea"
              value={form.hobbies}
              onChange={(e) => setField('hobbies', e.target.value)}
              placeholder={'可填写多项爱好，用换行或逗号分隔，例如：\n阅读\n篮球\n编程'}
            />
            <div className="form-hint">多项爱好可用换行或逗号分隔</div>
          </div>
        </div>

        {/* e) 其他信息 */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">其他信息</div>
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">家庭经济情况</label>
              <select
                className="form-select"
                value={form.family_income_level}
                onChange={(e) => setField('family_income_level', e.target.value)}
              >
                <option value="">请选择</option>
                <option value="low">较低</option>
                <option value="medium">中等</option>
                <option value="high">较高</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">偏好地区</label>
              <input
                className="form-input"
                value={form.preferred_region}
                onChange={(e) => setField('preferred_region', e.target.value)}
                placeholder="如 珠三角 / 本省 / 不限"
              />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">偏好学校类型（可多选）</label>
            <div className="tag-group">
              {SCHOOL_TYPES.map((tag) => (
                <button
                  type="button"
                  key={tag}
                  className={`tag${form.preferred_school_type.includes(tag) ? ' active' : ''}`}
                  onClick={() => toggleTag('preferred_school_type', tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 保存按钮 */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? '保存中...' : '保存档案'}
          </button>
          {saving && <span className="form-hint">请勿离开页面...</span>}
        </div>
      </form>
    </div>
  );
}
