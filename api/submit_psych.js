// api/submit_psych.js
// 注意：此文件必须放在项目的 /api 目录下，并确保 Node.js 版本 >= 18

// ---------- 题库与常量定义（与前端完全一致） ----------
const engines = ['O','V','D','E','T'];
const sandboxes = ['PN','AN','RN','IN','MN','FN'];
const engineFull = { O:'O-金-收束', V:'V-土-承载', D:'D-火-突破', E:'E-水-漫延', T:'T-木-穿透' };
const sandboxFull = { PN:'物理底盘', AN:'能力进化', RN:'深度连接', IN:'社会舞台', MN:'意义导航', FN:'系统运转' };
const elementMap = { O:'金', V:'土', D:'火', E:'水', T:'木' };

const freqTexts = {
    'O_PN': ['我能清晰感知自己身体的边界——什么时候该休息、什么时候还能继续。','我对钱、物资、生活空间有明确的规划和控制感。','当身体发出疲惫信号时，我能按自己定的规则停下来，而不是被外部压力推着继续。'],
    'O_AN': ['我对自己的成长路径有清晰的阶段性规划。','我能按计划推进学习或能力提升，每一步都清楚自己在做什么。','复盘自己的进步和不足时，我能客观地看到规律，而不是笼统地觉得自己不够好。'],
    // ... 此处应包含原 HTML 中所有 freqTexts 条目，为节省篇幅省略，请务必完整复制
    // 完整数据请从提供的 HTML 中提取，确保 90 题文本齐全
};
// 构建频率题列表（与前端完全相同）
let freqQuestions = [];
let qid = 0;
for(let e of engines) {
    for(let s of sandboxes) {
        const key = `${e}_${s}`;
        const texts = freqTexts[key];
        for(let idx=0; idx<3; idx++) {
            freqQuestions.push({
                id: qid++,
                type: 'freq',
                engine: e,
                sandbox: s,
                subIdx: idx+1,
                text: texts[idx],
                label: `${e}-${s}-${idx+1}`
            });
        }
    }
}

// 迫选题（18题）
const forcedQuestions = [
    { id: 200, sandbox:'PN', qtype:'Q1', text:'你最依赖什么来稳住自己？', opts:['A. 靠在最熟悉的环境里待着，这里有我需要的安全感','B. 靠自己把一切都整理好、按计划来——秩序让我感到踏实','C. 靠手里的资源足够多、余地足够大——有后路就不慌','D. 靠能随时调整状态、说动就能动起来的能力','E. 靠跳出身体感受，从更高处看一切——这具身体只是载体'] },
    // ... 请将原 HTML 中 forcedQuestions 数组的完整定义复制到这里，共 18 项
];

// ---------- 计分与状态函数 ----------
function getState(score) {
    if(score<=5) return '被掩埋';
    else if(score<=9) return '卷缩';
    else if(score<=12) return '生长';
    else return '繁茂';
}

function getEngineKeyword(engine, total) {
    // 完整关键词词典，与前端相同
    if(total>=65) {
        if(engine==='T') return '思考极深、能看透本质、追问不断';
        // ... 此处需完整复制原 HTML 中的 getEngineKeyword 函数内容
    }
    // 省略部分请从原 HTML 中补全，确保所有分支都存在
    return '';
}

function getSandboxMidDesc(sandbox, total) {
    if(total>=50) return '底盘稳固/活力充沛';
    else if(total>=40) return '基本可运转但有消耗';
    else if(total>=30) return '边界模糊/承压';
    else return '濒临崩塌/资源焦虑';
}

// ---------- 因果链词典（完整） ----------
const detailedDesc = {
    // 旺克旺健康态
    'T克V_healthy': '聚变的绝对追问没有摧毁底盘...',
    // ... 完整复制原 HTML 中的 detailedDesc 对象，此处省略
};

// ---------- 核心报告生成函数 ----------
function generateFullReport(answers) {
    // 1. 计算引擎得分
    let engineScores = { O:{}, V:{}, D:{}, E:{}, T:{} };
    freqQuestions.forEach(q => {
        let ans = answers.freq[q.id];
        if (!ans) return;
        let score = { 'A':1,'B':2,'C':3,'D':4,'E':5 }[ans];
        if (score) engineScores[q.engine][q.sandbox] = (engineScores[q.engine][q.sandbox] || 0) + score;
    });

    let sandboxTotals = { PN:0, AN:0, RN:0, IN:0, MN:0, FN:0 };
    for(let e of engines) for(let s of sandboxes) sandboxTotals[s] += (engineScores[e][s] || 0);
    let engineTotals = {};
    for(let e of engines) {
        let total = 0;
        for(let s of sandboxes) total += (engineScores[e][s] || 0);
        engineTotals[e] = total;
    }

    // 2. 状态矩阵
    let seedStatus = {};
    for(let e of engines) {
        seedStatus[e] = {};
        for(let s of sandboxes) seedStatus[e][s] = getState(engineScores[e][s]);
    }

    // 3. 统计计数
    let countFM=0, countSZ=0, countJS=0, countBYM=0;
    for(let e of engines) for(let s of sandboxes) {
        let st = seedStatus[e][s];
        if(st==='繁茂') countFM++;
        else if(st==='生长') countSZ++;
        else if(st==='卷缩') countJS++;
        else countBYM++;
    }

    // 4. 综合判定
    let maxE = Object.keys(engineTotals).reduce((a,b)=> engineTotals[a]>engineTotals[b]?a:b);
    let secondMax = Object.keys(engineTotals).sort((a,b)=>engineTotals[b]-engineTotals[a])[1];
    let verdict = '';
    if(countFM>=10 && countBYM<=3) verdict = '整体生命活力充沛，多引擎协同活跃，能量格局呈多点开花态势。';
    else if(countFM<=5 && (countJS+countBYM)>=20 && engineTotals[maxE] > engineTotals[secondMax]*1.3)
        verdict = '整体生命活力偏低，能量格局呈单引擎独旺、其余全面收缩的失衡状态。';
    else if(countJS >= 30) verdict = '整体偏向保守收缩，多股驱动力处于休眠待激活状态。';
    else verdict = '整体能量分布不均，存在明显的优势区和薄弱区。';

    // 5. 引擎体感判定表
    let engineBodyHtml = `<h3>二、⚙️ 引擎体感判定</h3><table><thead><tr><th>引擎</th><th>覆盖面积</th><th>体感描述</th></tr></thead><tbody>`;
    for(let e of engines) {
        let fm = Object.values(seedStatus[e]).filter(v=>v==='繁茂').length;
        let sz = Object.values(seedStatus[e]).filter(v=>v==='生长').length;
        let js = Object.values(seedStatus[e]).filter(v=>v==='卷缩').length;
        let bym = Object.values(seedStatus[e]).filter(v=>v==='被掩埋').length;
        let keyword = getEngineKeyword(e, engineTotals[e]);
        engineBodyHtml += `<tr><td>${engineFull[e]}</td><td>繁茂${fm}个、生长${sz}个、卷缩${js}个、被掩埋${bym}个</td><td>${keyword}</td></tr>`;
    }
    engineBodyHtml += `</tbody></table>`;

    // 6. 沙盒体感判定表
    let sandboxBodyHtml = `<h3>三、🧩 沙盒体感判定</h3><table><thead><tr><th>沙盒</th><th>意象</th><th>体感分数</th><th>体感描述</th></tr></thead><tbody>`;
    for(let s of sandboxes) {
        let total = sandboxTotals[s];
        let midDesc = getSandboxMidDesc(s, total);
        sandboxBodyHtml += `<tr><td>${s}</td><td>${sandboxFull[s]}</td><td>${total}</td><td>${midDesc}</td></tr>`;
    }
    sandboxBodyHtml += `</tbody></table>`;

    // 7. 迫选题作答记录
    let forcedRecords = `<h3>四、🔍 9号追选题作答记录</h3><table><thead><tr><th>沙盒</th><th>Q1 最依赖的驱动力</th><th>Q2 经历过的创伤</th><th>Q3 最深的恐惧</th></tr></thead><tbody>`;
    for(let s of sandboxes) {
        let q1 = forcedQuestions.find(f => f.sandbox===s && f.qtype==='Q1');
        let q2 = forcedQuestions.find(f => f.sandbox===s && f.qtype==='Q2');
        let q3 = forcedQuestions.find(f => f.sandbox===s && f.qtype==='Q3');
        let q1Ans = answers.forced[q1?.id] || '';
        let q2Ans = answers.forced[q2?.id] || '';
        let q3Ans = answers.forced[q3?.id] || '';
        let q1Text = q1Ans ? (q1.opts[parseInt(q1Ans.charCodeAt(0)-65)] || '') : '';
        let q2Text = q2Ans ? (q2.opts[parseInt(q2Ans.charCodeAt(0)-65)] || '') : '';
        let q3Text = q3Ans ? (q3.opts[parseInt(q3Ans.charCodeAt(0)-65)] || '') : '';
        forcedRecords += `<tr><td>${sandboxFull[s]}</td><td>${q1Ans} – ${q1Text}</td><td>${q2Ans} – ${q2Text}</td><td>${q3Ans} – ${q3Text}</td></tr>`;
    }
    forcedRecords += `</tbody></table>`;

    // 8. 因果链分析（旺衰判定及触发机制）
    function isWang(e) { return engineTotals[e]>=65 || Object.values(seedStatus[e]).filter(v=>v==='繁茂').length>=3; }
    function isShuai(e) { return engineTotals[e]<35 || Object.values(seedStatus[e]).filter(v=>v==='被掩埋').length>=1; }
    function isHealthy(e) { return !Object.values(seedStatus[e]).includes('被掩埋'); }

    let wangList = engines.filter(e => isWang(e)).map(e=>engineFull[e]);
    let shuaiList = engines.filter(e => isShuai(e)).map(e=>engineFull[e]);
    let healthyList = engines.filter(e => isHealthy(e)).map(e=>engineFull[e]);

    const shengMap = { T:'D', D:'V', V:'O', O:'E', E:'T' };
    const keMap = { T:'V', V:'E', E:'D', D:'O', O:'T' };

    let chainAdded = new Set();
    let chainText = [];

    for (let i = 0; i < engines.length; i++) {
        for (let j = 0; j < engines.length; j++) {
            if (i === j) continue;
            let a = engines[i];
            let b = engines[j];

            // 克关系
            if (keMap[a] === b) {
                let aWang = isWang(a), bWang = isWang(b), aShuai = isShuai(a), bShuai = isShuai(b),
                    aHealthy = isHealthy(a), bHealthy = isHealthy(b);

                if (aWang && bShuai) {
                    let key = `${a}克${b}_weak`;
                    if (!chainAdded.has(key)) {
                        chainText.push(`<div class="causal-item"><div class="causal-item-title">➤ 旺克衰 · ${engineFull[a]}克${engineFull[b]}（穿透与流失）</div><div class="causal-item-desc">${detailedDesc[key] || '旺者克衰者，强势驱动力不断消耗弱势底盘。'}</div></div>`);
                        chainAdded.add(key);
                    }
                } else if (aShuai && bWang) {
                    let key = `${a}克${b}_reverse`;
                    if (!chainAdded.has(key)) {
                        chainText.push(`<div class="causal-item"><div class="causal-item-title">➤ 衰克旺 · ${engineFull[a]}克${engineFull[b]}（崩卷与反弹）</div><div class="causal-item-desc">${detailedDesc[key] || '衰者克旺者，弱势试图约束强势反而耗尽自身。'}</div></div>`);
                        chainAdded.add(key);
                    }
                } else if (aWang && bWang) {
                    let hasBuried = !aHealthy || !bHealthy;
                    let stateKey = hasBuried ? 'over' : 'healthy';
                    let key = `${a}克${b}_${stateKey}`;
                    if (!chainAdded.has(key)) {
                        let type = hasBuried ? '过载态（互耗磨损）' : '健康态（修剪蜕变）';
                        chainText.push(`<div class="causal-item"><div class="causal-item-title">➤ 旺克旺 · ${type} · ${engineFull[a]}克${engineFull[b]}</div><div class="causal-item-desc">${detailedDesc[key] || (hasBuried ? '强强相克但存在创伤断点，陷入互耗磨损。' : '克者精准修剪，被克者因修剪更茁壮。')}</div></div>`);
                        chainAdded.add(key);
                    }
                }
            }

            // 生关系
            if (shengMap[a] === b) {
                let aWang = isWang(a), bWang = isWang(b), aShuai = isShuai(a), bShuai = isShuai(b),
                    aHealthy = isHealthy(a), bHealthy = isHealthy(b);

                if (aWang && bShuai) {
                    let key = `${a}生${b}_weak`;
                    if (!chainAdded.has(key)) {
                        chainText.push(`<div class="causal-item"><div class="causal-item-title">➤ 旺生衰 · ${engineFull[a]}生${engineFull[b]}（压熄与窒息）</div><div class="causal-item-desc">${detailedDesc[key] || '旺者生衰者，燃料太旺压垮火种。'}</div></div>`);
                        chainAdded.add(key);
                    }
                } else if (aShuai && bWang) {
                    let key = `${a}生${b}_reverse`;
                    if (!chainAdded.has(key)) {
                        chainText.push(`<div class="causal-item"><div class="causal-item-title">➤ 衰生旺 · ${engineFull[a]}生${engineFull[b]}（反噬与枯竭）</div><div class="causal-item-desc">${detailedDesc[key] || '衰者生旺者，生者太弱被反噬。'}</div></div>`);
                        chainAdded.add(key);
                    }
                } else if (aWang && bWang) {
                    let hasBuried = !aHealthy || !bHealthy;
                    let stateKey = hasBuried ? 'over' : 'healthy';
                    let key = `${a}生${b}_${stateKey}`;
                    if (!chainAdded.has(key)) {
                        let type = hasBuried ? '过载态（催熟超压）' : '健康态（转化攀升）';
                        chainText.push(`<div class="causal-item"><div class="causal-item-title">➤ 旺生旺 · ${type} · ${engineFull[a]}生${engineFull[b]}</div><div class="causal-item-desc">${detailedDesc[key] || (hasBuried ? '能量过载，结构超压，催熟而难消化。' : '能量顺畅传导，螺旋攀升。')}</div></div>`);
                        chainAdded.add(key);
                    }
                }
            }
        }
    }

    if (chainText.length === 0) chainText.push('<div class="causal-item-desc">未触发典型旺衰生克链，引擎间关系相对平衡。</div>');

    let chainHtml = `<h3>五、⛓️ 因果链与层级流动分析</h3>
    <div class="causal-base-box">
        <div style="margin-bottom: 12px;">
            <span class="causal-base-title">基础设定</span>
            <span class="causal-base-text">生循环：T🌲 → D🔥 → V⛰️ → O💎 → E🌊 → T🌲<br>克循环：T🌲 → V⛰️ → E🌊 → D🔥 → O💎 → T🌲</span>
        </div>
        <div>
            <span class="causal-base-title">引擎旺衰判定</span>
            <span class="causal-base-text">
            旺（极化）：${wangList.join(', ') || '无'}<br>
            衰（坍缩）：${shuaiList.join(', ') || '无'}<br>
            健康校验：${healthyList.join(', ') || '无'}
            </span>
        </div>
    </div>
    <div style="margin-bottom: 14px; font-weight: 600; font-size: 1.1rem; color: #1e3a8a;">触发的因果链</div>
    ${chainText.join('')}`;

    // 9. 恐惧禁区
    let fearMap = { 'A':'失去依托/被拒绝/崩塌','B':'混乱/失控/被裹挟','C':'错过/被取代/不够大','D':'无力/被困/被压制','E':'不真实/表演/偏离本质' };
    let fearHtml = `<h3>六、😨 恐惧禁区映射（Q3汇总）</h3><table><thead><tr><th>沙盒</th><th>Q3选项</th><th>恐惧含义</th></tr></thead><tbody>`;
    for(let s of sandboxes) {
        let q3 = forcedQuestions.find(f => f.sandbox===s && f.qtype==='Q3');
        let opt = answers.forced[q3?.id] || '—';
        fearHtml += `<tr><td>${sandboxFull[s]}</td><td>${opt}</td><td>${fearMap[opt] || '未选'}</td></tr>`;
    }
    fearHtml += `</tbody></table>`;

    // 10. 总览矩阵表格（引用前端 explanations 变量，因此前端必须保留该对象）
    let matrixHtml = `<h3>一、🌡️ 总览矩阵</h3><h4>引擎 × 沙盒 热度图（点击引擎名/沙盒名/状态词查看详细解释）</h4><table><thead><tr><th>项目\\沙盒</th>`;
    for(let s of sandboxes) {
        matrixHtml += `<th style="cursor:pointer; text-decoration:underline dotted;" onclick="alert(explanations.sandboxes['${s}'])">${s}</th>`;
    }
    matrixHtml += `<th>总分</th> </thead><tbody>`;
    for(let e of engines) {
        let engineDisplay = `<span style="cursor:pointer; text-decoration:underline dotted;" onclick="alert(explanations.engines['${engineFull[e]}'])">${engineFull[e]}</span>`;
        matrixHtml += `<tr><td style="font-weight:600">${engineDisplay}</td>`;
        for(let s of sandboxes) {
            let sc = engineScores[e][s] || 0;
            let st = seedStatus[e][s];
            let colorClass = st==='繁茂'?'status-bloom':(st==='生长'?'status-grow':(st==='卷缩'?'status-shrink':'status-buried'));
            let statusDisplay = `<span style="cursor:pointer; border-bottom:1px dashed #666;" onclick="alert(explanations.energy['${st}'])">${st}</span>`;
            matrixHtml += `<td class="${colorClass}">${sc}<br>${statusDisplay}</td>`;
        }
        matrixHtml += `<td><strong>${engineTotals[e]}</strong></td>`;
        matrixHtml += `</tr>`;
    }
    matrixHtml += `<tr style="background:#f5f9ff;"><td style="font-weight:600">沙盒总分</td>`;
    for(let s of sandboxes) matrixHtml += `<td><strong>${sandboxTotals[s]}</strong></td>`;
    matrixHtml += `<td>—</td> </tr></tbody></table>`;

    let statsHtml = `<div class="stat-badge">🌳 繁茂：${countFM}个 🌱 生长：${countSZ}个 🐚 卷缩：${countJS}个 🪦 被掩埋：${countBYM}个</div>
    <div><strong>🧩 综合判定</strong> ${verdict}</div>`;

    return matrixHtml + statsHtml + engineBodyHtml + sandboxBodyHtml + forcedRecords + chainHtml + fearHtml;
}

// ---------- 辅助：生成临时 recordId ----------
function generateRecordId() {
    return 'rec_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

// ---------- API 处理函数 ----------
export default async function handler(req, res) {
    // 仅接受 POST 请求
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: '方法不允许' });
    }

    try {
        const body = req.body;
        const userAnswers = body.userAnswers;

        // 基本验证
        if (!userAnswers || !userAnswers.freq || !userAnswers.forced) {
            return res.status(400).json({ success: false, error: '缺少答案数据' });
        }

        // 构造与前端一致的 answers 对象
        const answers = {
            freq: {},
            forced: {}
        };

        // 将传入的 freq 答案（键为数字字符串）转换为内部的 freqQuestions id 索引
        for (const [qidStr, value] of Object.entries(userAnswers.freq)) {
            const qid = parseInt(qidStr, 10);
            if (!isNaN(qid)) answers.freq[qid] = value;
        }

        // forced 答案类似，但原前端 forcedQuestions id 为 200-217
        for (const [qidStr, value] of Object.entries(userAnswers.forced)) {
            const qid = parseInt(qidStr, 10);
            if (!isNaN(qid)) answers.forced[qid] = value;
        }

        // 执行计算
        const reportHtml = generateFullReport(answers);

        // 生成记录 ID（可在此处插入数据库存储逻辑）
        const recordId = generateRecordId();

        // 返回成功响应
        return res.status(200).json({
            success: true,
            recordId: recordId,
            reportHtml: reportHtml
        });
    } catch (error) {
        console.error('报告生成错误:', error);
        return res.status(500).json({
            success: false,
            error: '服务器内部错误：' + error.message
        });
    }
}
