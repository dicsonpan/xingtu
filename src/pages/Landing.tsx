import { Link } from 'react-router-dom';

export function Landing() {
  return (
    <>
      {/* Hero 区域 */}
      <section className="hero">
        <div className="hero-content">
          <h1>知遇</h1>
          <p>
            知遇之恩，始于识才。为中考后20%的偏科生提供<strong>天赋发掘、专业匹配、学校推荐、防骗预警</strong>全流程服务
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-primary btn-lg">立即注册</Link>
            <a href="#features" className="btn btn-secondary btn-lg">了解更多</a>
          </div>
        </div>
      </section>

      {/* 项目背景区域 */}
      <section className="section bg-alt">
        <div className="container">
          <div className="section-label">项目背景</div>
          <h2>被忽视的500万人</h2>
          <p className="lead">
            每年中考结束后，约有<strong>500万</strong>因偏科而总分不高的学生被分流至职业教育轨道。
            他们并不缺乏天赋，却因一次考试、一个分数，被主流升学工具彻底忽视。
            没有人告诉他们擅长什么、适合什么、该去哪里——于是，一次本可改变一生的选择，沦为了近乎随机的赌博。
          </p>
          <div className="grid grid-3">
            <div className="stat-card">
              <div className="stat-number">~500万</div>
              <div className="stat-label">每年中考分流至职教的偏科生</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">0</div>
              <div className="stat-label">专为偏科生设计的现有工具</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">1</div>
              <div className="stat-label">次选择，足以改变一生</div>
            </div>
          </div>

          <div className="grid grid-4" style={{ marginTop: 32 }}>
            <div className="feature-card">
              <div className="feature-icon">≠</div>
              <h3>偏科≠笨</h3>
              <p>数学不及格的孩子，可能拥有出色的动手能力或艺术天赋，只是从未被正确识别。</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">？</div>
              <h3>信息差巨大</h3>
              <p>职教专业、学校、就业前景的信息分散且晦涩，普通家庭根本无从系统获取。</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎲</div>
              <h3>选择近乎随机</h3>
              <p>没有测评、没有匹配、没有对比，志愿填报往往凭感觉或道听途说。</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚠</div>
              <h3>"李鬼"横行</h3>
              <p>虚假招生、野鸡学校、骗局陷阱层出不穷，偏科生家庭成为最易受伤的群体。</p>
            </div>
          </div>
        </div>
      </section>

      {/* 解决方案区域 */}
      <section className="section" id="features">
        <div className="container">
          <div className="section-label">解决方案</div>
          <h2>全流程闭环服务</h2>
          <p className="lead">
            知遇打通从<strong>认识自己</strong>到<strong>安全入学</strong>的每一个环节，
            用 AI 帮偏科生把"随机选择"变成"科学决策"。
          </p>
          <div className="grid grid-4">
            <div className="feature-card">
              <div className="feature-icon">★</div>
              <h3>天赋发掘测评</h3>
              <p>多维度天赋雷达 + 学科优势分析，AI 深度解读你的隐藏优势，告诉你"你其实很厉害"。</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">◆</div>
              <h3>专业智能匹配</h3>
              <p>基于天赋画像与兴趣偏好，智能匹配最契合的职教专业方向，让天赋不再被埋没。</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">▣</div>
              <h3>学校推荐对比</h3>
              <p>多维度推荐学校，提供横向对比与报考建议，把信息差变成一目了然的决策依据。</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚠</div>
              <h3>防骗预警</h3>
              <p>输入招生信息或机构名称，AI 实时识别风险红旗，守护每一分学费和每一次前途。</p>
            </div>
          </div>
        </div>
      </section>

      {/* 差异化优势区域 */}
      <section className="section bg-alt">
        <div className="container">
          <div className="section-label">差异化优势</div>
          <h2>为什么是知遇</h2>
          <p className="lead">
            市面上不缺升学工具，但没有一个真正站在<strong>偏科生</strong>这一侧。知遇之"知"，是识才之知、懂你之知。
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>对比维度</th>
                  <th>现有工具</th>
                  <th>知遇</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>服务对象</td>
                  <td>面向高分段普高升学</td>
                  <td>专注中考偏科生职教升学</td>
                </tr>
                <tr>
                  <td>天赋识别</td>
                  <td>无，仅看总分排名</td>
                  <td>多维天赋测评 + AI 深度分析</td>
                </tr>
                <tr>
                  <td>专业匹配</td>
                  <td>笼统推荐或人工经验</td>
                  <td>基于天赋画像的智能匹配</td>
                </tr>
                <tr>
                  <td>学校选择</td>
                  <td>信息分散、需自行搜集</td>
                  <td>结构化推荐 + 横向对比</td>
                </tr>
                <tr>
                  <td>防骗保护</td>
                  <td>几乎为零</td>
                  <td>AI 风险识别 + 红旗预警</td>
                </tr>
                <tr>
                  <td>价格门槛</td>
                  <td>动辄数千上万的咨询费</td>
                  <td>公益导向，低门槛可及</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 社会价值区域 */}
      <section className="section">
        <div className="container">
          <div className="section-label">社会价值</div>
          <h2>也许下一个大国工匠，就藏在被忽视的偏科生里</h2>
          <p className="lead">
            我们相信，天赋不会因为一次考试的低分而消失。每发掘一个被忽视的偏科生，
            就可能为社会多留住一位未来的技术能手、艺术人才或行业工匠。
          </p>
          <div className="grid grid-3">
            <div className="feature-card">
              <div className="feature-icon">🌱</div>
              <h3>让天赋不被埋没</h3>
              <p>帮助偏科生看见自身优势，从"我不行"的标签中走出来，找到能发光的赛道。</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚖</div>
              <h3>缩小教育信息鸿沟</h3>
              <p>把优质升学决策能力普惠到每一个普通家庭，让信息不再只属于少数人。</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🛡</div>
              <h3>守护家庭与前途</h3>
              <p>用防骗预警为弱势家庭筑起安全网，减少因信息不对称导致的人生悲剧。</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA 区域 */}
      <section className="section bg-alt">
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="section-label">现在开始</div>
          <h2>一次知遇，一生受益</h2>
          <p className="lead" style={{ maxWidth: 560, margin: '0 auto 32px' }}>
            注册账号，几分钟后即可完成天赋测评，开启属于你的科学升学之路。
          </p>
          <Link to="/register" className="btn btn-primary btn-lg">立即注册</Link>
        </div>
      </section>
    </>
  );
}
