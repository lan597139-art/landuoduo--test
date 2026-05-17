import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: '非法请求：黑盒拒绝访问' });
    }

    try {
        const { userId, userAnswers } = req.body;
        const answers = userAnswers; 

        // ==========================================
        // 1. 云端闭门计算得分 (绝对隔离)
        // ==========================================
        const engines = ['O','V','D','E','T'];
        const sandboxes = ['PN','AN','RN','IN','MN','FN'];
        const engineFull = { O:'O-金-收束', V:'V-土-承载', D:'D-火-突破', E:'E-水-漫延', T:'T-木-穿透' };
        const sandboxFull = { PN:'物理底盘', AN:'能力进化', RN:'深度连接', IN:'社会舞台', MN:'意义导航', FN:'系统运转' };

        let freqQuestions = [];
        let qid = 0;
        for(let e of engines) {
            for(let s of sandboxes) {
                for(let idx=0; idx<3; idx++) {
                    freqQuestions.push({ id: qid++, engine: e, sandbox: s });
                }
            }
        }

        let engineScores = { O:{}, V:{}, D:{}, E:{}, T:{} };
        freqQuestions.forEach(q => {
            let ans = answers.freq[q.id];
            if(ans) {
                let score = { 'A':1,'B':2,'C':3,'D':4,'E':5 }[ans];
                engineScores[q.engine][q.sandbox] = (engineScores[q.engine][q.sandbox] || 0) + score;
            }
        });

        let sandboxTotals = { PN:0, AN:0, RN:0, IN:0, MN:0, FN:0 };
        for(let e of engines) for(let s of sandboxes) sandboxTotals[s] += (engineScores[e][s] || 0);
        
        let engineTotals = {};
        for(let e of engines) {
            let total = 0;
            for(let s of sandboxes) total += (engineScores[e][s] || 0);
            engineTotals[e] = total;
        }

        function getState(score) { if(score<=5) return '被掩埋'; else if(score<=9) return '卷缩'; else if(score<=12) return '生长'; else return '繁茂'; }
        
        let seedStatus = {};
        for(let e of engines) {
            seedStatus[e] = {};
            for(let s of sandboxes) seedStatus[e][s] = getState(engineScores[e][s]);
        }

        let countFM=0, countSZ=0, countJS=0, countBYM=0;
        for(let e of engines) for(let s of sandboxes) {
            let st = seedStatus[e][s];
            if(st==='繁茂') countFM++; else if(st==='生长') countSZ++; else if(st==='卷缩') countJS++; else countBYM++;
        }

        let maxE = Object.keys(engineTotals).reduce((a,b)=> engineTotals[a]>engineTotals[b]?a:b);
        let secondMax = Object.keys(engineTotals).sort((a,b)=>engineTotals[b]-engineTotals[a])[1];
        let verdict = '';
        if(countFM>=10 && countBYM<=3) verdict = '整体生命活力充沛，多引擎协同活跃，能量格局呈多点开花态势。';
        else if(countFM<=5 && (countJS+countBYM)>=20 && engineTotals[maxE] > engineTotals[secondMax]*1.3) verdict = '整体生命活力偏低，能量格局呈单引擎独旺、其余全面收缩的失衡状态。';
        else if(countJS >= 30) verdict = '整体偏向保守收缩，多股驱动力处于休眠待激活状态。';
        else verdict = '整体能量分布不均，存在明显的优势区和薄弱区。';

        function getEngineKeyword(engine, total) {
            if(total>=65) {
                if(engine==='T') return '思考极深、能看透本质、追问不断';
                if(engine==='O') return '规则意识强、边界清晰、追求闭环';
                if(engine==='D') return '行动力强、破局冲动充沛、能推动变化';
                if(engine==='V') return '安全感足、能承载波动、有踏实底座';
                if(engine==='E') return '愿尝试新事物、能拓展连接、版图意识强';
            } else if(total>=50) {
                if(engine==='T') return '思考活跃、常追问为什么、能穿透表象';
                if(engine==='O') return '边界维持耗能增加，闭环勉强完成';
                if(engine==='D') return '破局动能存在但释放滞后，行动力间歇性';
                if(engine==='V') return '底座轻微摇摆，承载依赖外部补偿';
                if(engine==='E') return '扩张动能受阻，连接停留在浅层';
            } else if(total>=35) {
                if(engine==='T') return '思考时有中断、追问冲动被压制';
                if(engine==='O') return '规则意识松动、边界被侵蚀';
                if(engine==='D') return '行动力受损、破局冲动减弱';
                if(engine==='V') return '安全感缺失、底座松动';
                if(engine==='E') return '拓展意愿减弱、连接萎缩';
            } else {
                if(engine==='T') return '认知僵化、丧失追问意愿';
                if(engine==='O') return '结构解体、边界完全丧失';
                if(engine==='D') return '行动力瘫痪、破局冲动熄灭';
                if(engine==='V') return '安全感崩塌、底座瓦解';
                if(engine==='E') return '绝对孤立、切断外部连接';
            }
            return '';
        }

        function getSandboxMidDesc(sandbox, total) {
            if(total>=50) return '底盘稳固/活力充沛';
            if(total>=40) return '基本可运转但有消耗';
            if(total>=30) return '边界模糊/承压';
            return '濒临崩塌/资源焦虑';
        }

        // ==========================================
        // 2. 云端组装 HTML 报告 (绝不让前端碰任何文字)
        // ==========================================
        let matrixHtml = `<h3>一、🌡️ 总览矩阵</h3><h4>引擎 × 沙盒 热度图</h4><table><thead><tr><th>项目\\沙盒</th>`;
        for(let s of sandboxes) { matrixHtml += `<th>${s}</th>`; }
        matrixHtml += `<th>总分</th> </thead><tbody>`;
        for(let e of engines) {
            matrixHtml += `<tr><td style="font-weight:600">${engineFull[e]}</td>`;
            for(let s of sandboxes) {
                let sc = engineScores[e][s] || 0;
                let st = seedStatus[e][s];
                let colorClass = st==='繁茂'?'status-bloom':(st==='生长'?'status-grow':(st==='卷缩'?'status-shrink':'status-buried'));
                matrixHtml += `<td class="${colorClass}">${sc}<br><span>${st}</span></td>`;
            }
            matrixHtml += `<td><strong>${engineTotals[e]}</strong></td></tr>`;
        }
        matrixHtml += `<tr style="background:#f5f9ff;"><td style="font-weight:600">沙盒总分</td>`;
        for(let s of sandboxes) matrixHtml += `<td><strong>${sandboxTotals[s]}</strong></td>`;
        matrixHtml += `<td>—</td> </tr></tbody></table>`;

        let statsHtml = `<div class="stat-badge">🌳 繁茂：${countFM}个 🌱 生长：${countSZ}个 🐚 卷缩：${countJS}个 🪦 被掩埋：${countBYM}个</div><div><strong>🧩 综合判定</strong> ${verdict}</div>`;

        let engineBodyHtml = `<h3>二、⚙️ 引擎体感判定</h3><table><thead><tr><th>引擎</th><th>覆盖面积</th><th>体感描述</th></tr></thead><tbody>`;
        for(let e of engines) {
            let fm = Object.values(seedStatus[e]).filter(v=>v==='繁茂').length;
            let sz = Object.values(seedStatus[e]).filter(v=>v==='生长').length;
            let js = Object.values(seedStatus[e]).filter(v=>v==='卷缩').length;
            let bym = Object.values(seedStatus[e]).filter(v=>v==='被掩埋').length;
            engineBodyHtml += `<tr><td>${engineFull[e]}</td><td>繁茂${fm}个、生长${sz}个、卷缩${js}个、被掩埋${bym}个</td><td>${getEngineKeyword(e, engineTotals[e])}</td></tr>`;
        }
        engineBodyHtml += `</tbody></table>`;

        let sandboxBodyHtml = `<h3>三、🧩 沙盒体感判定</h3><table><thead><tr><th>沙盒</th><th>意象</th><th>体感分数</th><th>体感描述</th></tr></thead><tbody>`;
        for(let s of sandboxes) {
            sandboxBodyHtml += `<tr><td>${s}</td><td>${sandboxFull[s]}</td><td>${sandboxTotals[s]}</td><td>${getSandboxMidDesc(s, sandboxTotals[s])}</td></tr>`;
        }
        sandboxBodyHtml += `</tbody></table>`;

        let forcedRecords = `<h3>四、🔍 9号追选题作答记录（系统已录入快照）</h3><p style="font-size:0.9rem; color:#475569;">你的应激反馈与核心恐惧选项已作为暗线参数进入系统数据库，不再明文展示以防过度对号入座。</p>`;

        function isWang(e) { return engineTotals[e]>=65 || Object.values(seedStatus[e]).filter(v=>v==='繁茂').length>=3; }
        function isShuai(e) { return engineTotals[e]<35 || Object.values(seedStatus[e]).filter(v=>v==='被掩埋').length>=1; }
        function isHealthy(e) { return !Object.values(seedStatus[e]).includes('被掩埋'); }

        let wangList = engines.filter(e => isWang(e)).map(e=>engineFull[e]);
        let shuaiList = engines.filter(e => isShuai(e)).map(e=>engineFull[e]);
        let healthyList = engines.filter(e => isHealthy(e)).map(e=>engineFull[e]);

        const shengMap = { T:'D', D:'V', V:'O', O:'E', E:'T' };
        const keMap = { T:'V', V:'E', E:'D', D:'O', O:'T' };

        // 🚨【安全核心护城河】🚨：把你刚才从前端删掉的那个 detailedDesc 完整字典，全部粘贴覆盖在下面这个 {} 里！
        const detailedDesc = {
            'T克V_healthy': '聚变的绝对追问没有摧毁底盘，而是精准剔除了失效的依赖...',
            // ... 这里粘贴你的几千字原本文案 ...
        };

        let chainAdded = new Set();
        let chainText = [];
        for (let i = 0; i < engines.length; i++) {
            for (let j = 0; j < engines.length; j++) {
                if (i === j) continue;
                let a = engines[i]; let b = engines[j];
                if (keMap[a] === b) {
                    if (isWang(a) && isShuai(b)) {
                        chainText.push(`<div class="causal-item"><div class="causal-item-title">➤ 旺克衰 · ${engineFull[a]}克${engineFull[b]}（穿透与流失）</div><div class="causal-item-desc">${detailedDesc[`${a}克${b}_weak`] || '强势驱动力不断消耗弱势底盘。'}</div></div>`);
                    } else if (isShuai(a) && isWang(b)) {
                        chainText.push(`<div class="causal-item"><div class="causal-item-title">➤ 衰克旺 · ${engineFull[a]}克${engineFull[b]}（崩卷与反弹）</div><div class="causal-item-desc">${detailedDesc[`${a}克${b}_reverse`] || '弱势试图约束强势反而耗尽自身。'}</div></div>`);
                    } else if (isWang(a) && isWang(b)) {
                        let hasBuried = !isHealthy(a) || !isHealthy(b);
                        let type = hasBuried ? '过载态（互耗磨损）' : '健康态（修剪蜕变）';
                        chainText.push(`<div class="causal-item"><div class="causal-item-title">➤ 旺克旺 · ${type} · ${engineFull[a]}克${engineFull[b]}</div><div class="causal-item-desc">${detailedDesc[`${a}克${b}_${hasBuried?'over':'healthy'}`] || '强强相克，产生结构性摩擦。'}</div></div>`);
                    }
                }
                if (shengMap[a] === b) {
                    if (isWang(a) && isShuai(b)) {
                        chainText.push(`<div class="causal-item"><div class="causal-item-title">➤ 旺生衰 · ${engineFull[a]}生${engineFull[b]}（压熄与窒息）</div><div class="causal-item-desc">${detailedDesc[`${a}生${b}_weak`] || '燃料太旺压垮火种。'}</div></div>`);
                    } else if (isShuai(a) && isWang(b)) {
                        chainText.push(`<div class="causal-item"><div class="causal-item-title">➤ 衰生旺 · ${engineFull[a]}生${engineFull[b]}（反噬与枯竭）</div><div class="causal-item-desc">${detailedDesc[`${a}生${b}_reverse`] || '生者太弱被反噬。'}</div></div>`);
                    } else if (isWang(a) && isWang(b)) {
                        let hasBuried = !isHealthy(a) || !isHealthy(b);
                        let type = hasBuried ? '过载态（催熟超压）' : '健康态（转化攀升）';
                        chainText.push(`<div class="causal-item"><div class="causal-item-title">➤ 旺生旺 · ${type} · ${engineFull[a]}生${engineFull[b]}</div><div class="causal-item-desc">${detailedDesc[`${a}生${b}_${hasBuried?'over':'healthy'}`] || '能量传导与系统共振。'}</div></div>`);
                    }
                }
            }
        }
        if (chainText.length === 0) chainText.push('<div class="causal-item-desc">未触发典型旺衰生克链，引擎间关系相对平衡。</div>');

        let chainHtml = `<h3>五、⛓️ 因果链与层级流动分析</h3>
        <div class="causal-base-box">
            <div style="margin-bottom: 12px;"><span class="causal-base-title">引擎旺衰判定</span><span class="causal-base-text">旺（极化）：${wangList.join(', ') || '无'}<br>衰（坍缩）：${shuaiList.join(', ') || '无'}</span></div>
        </div>
        <div style="margin-bottom: 14px; font-weight: 600; font-size: 1.1rem; color: #1e3a8a;">触发的因果链</div>
        ${chainText.join('')}`;

        // 拼接最终要传给前端的 HTML 巨无霸字符串
        const finalReportHtml = matrixHtml + statsHtml + engineBodyHtml + sandboxBodyHtml + forcedRecords + chainHtml;

        // ==========================================
        // 3. 静默落盘与返还 (发放 Record ID)
        // ==========================================
        const targetUserId = userId || '00000000-0000-0000-0000-000000000000';
        await supabase.from('profiles').upsert([{ id: targetUserId }]);

        const { data, error: insertError } = await supabase
            .from('test_records')
            .insert([{ user_id: targetUserId, raw_answers: answers, ovtde_scores: { engineScores, seedStatus }, is_paid: false }])
            .select();

        if (insertError) throw insertError;

        // 把拼好的纯净 HTML 发回前端，算法机密永留云端！
        return res.status(200).json({
            success: true,
            recordId: data && data.length > 0 ? data[0].id : null,
            reportHtml: finalReportHtml
        });

    } catch (error) {
        return res.status(500).json({ error: '黑盒算法执行异常', details: error.message });
    }
}
