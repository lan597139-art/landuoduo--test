import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    // 强行解除跨域限制
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        // ==========================================
        // 🎯 问卷拦截器：终极防弹兜底设计
        // ==========================================
        if (req.body && req.body.isFeedbackUpdate) {
            const { recordId, feedbackComment } = req.body;
            const dummyUserId = '00000000-0000-0000-0000-000000000000';
            await supabase.from('profiles').upsert([{ id: dummyUserId }]);

            // 核心修复：检验 ID 是否为真实合法的 UUID，防止中文字符引发 Supabase 400 崩溃
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            
            if (recordId && uuidRegex.test(recordId)) {
                // 是合法 UUID，执行正常更新
                await supabase.from('test_records').update({ comment: feedbackComment }).eq('id', recordId);
            } else {
                // 非法 ID（如"测试环境无ID"），强行新建一行存下问卷，坚决不丢数据！
                await supabase.from('test_records').insert([{ 
                    user_id: dummyUserId, 
                    comment: feedbackComment,
                    raw_answers: { note: "主数据落盘延迟，此行为强行兜底保存的用户问卷反馈" },
                    is_paid: false
                }]);
            }
            return res.status(200).json({ success: true, message: "问卷数据防弹落盘成功" });
        }

        // ==========================================
        // 核心成绩处理与报告生成
        // ==========================================
        const body = req.body || {};
        const userAnswers = body.userAnswers;
        // 🎯 修复致命的未声明变量问题：安全提取 userId
        const targetUserId = body.userId || '00000000-0000-0000-0000-000000000000';

        if (!userAnswers || !userAnswers.freq || !userAnswers.forced) {
            return res.status(200).json({ success: false, error: '缺少答案数据' });
        }

        const answers = userAnswers;
        const engines = ['O','V','D','E','T'];
        const sandboxes = ['PN','AN','RN','IN','MN','FN'];
        const engineFull = { O:'O-金-收束', V:'V-土-承载', D:'D-火-突破', E:'E-水-漫延', T:'T-木-穿透' };
        const sandboxFull = { PN:'物理底盘', AN:'能力进化', RN:'深度连接', IN:'社会舞台', MN:'意义导航', FN:'系统运转' };

        const forcedQuestions = [
            { id: 200, sandbox:'PN', qtype:'Q1', opts:['A. 靠在最熟悉的环境里待着，这里有我需要的安全感','B. 靠自己把一切都整理好、按计划来——秩序让我感到踏实','C. 靠手里的资源足够多、余地足够大——有后路就不慌','D. 靠能随时调整状态、说动就能动起来的能力','E. 靠跳出身体感受，从更高处看一切——这具身体只是载体'] },
            { id: 201, sandbox:'PN', qtype:'Q2', opts:['A. 身体和精力的透支——那之后我对消耗变得格外警惕','B. 资源突然缩减——经历过一次不安全之后，我对储备特别在意','C. 身体被困住动不了——那让我感觉像被活埋','D. 长期处于匮乏但没崩溃的灰色状态——慢性消耗比一次爆发更折磨','E. 身体被过度关注——我不太愿意把注意力放在身体感受上'] },
            { id: 202, sandbox:'PN', qtype:'Q3', opts:['A. 先停一下，回到一个安全的地方缓一缓','B. 硬撑着把事情做完，然后按计划休息','C. 继续推进——还有机会和空间等着我去打开','D. 越累越冲——撞过去就能突破极限','E. 不太关注它——身体不舒服的时候，我就把注意力转移到思考上'] },
            { id: 203, sandbox:'AN', qtype:'Q1', opts:['A. 一个稳定的方向 and 身份锚点——让我知道自己一直在积累','B. 清晰的规划 and 阶段目标——每一步都踏在预定的轨道上','C. 不断有新的机会 and 可能性打开——让我看到更大的版图','D. 持续突破瓶颈的快感——冲不过去的东西让我兴奋','E. 跳出来重新定义"成长"本身——不被旧路径锁死'] },
            { id: 204, sandbox:'AN', qtype:'Q2', opts:['A. 沿着别人设定的路努力了很久，突然觉得这些没意义了','B. 花了很多时间提升某个能力，但它解决不了我真正在意的问题','C. 遇到意外或重大挫折，在那之后我重新定义了成长','D. 长期卡在一个地方，怎么都突破不了——对"变强"这件事失去了确定感','E. 我似乎从未认真相信过任何一条成长路径'] },
            { id: 205, sandbox:'AN', qtype:'Q3', opts:['A. 发现自己一直走的路可能是错的，需要重新选择','B. 计划被打乱——没有清晰路径的时候我会感到焦虑','C. 只需要精耕一个方向的时候——我害怕错过了更多的可能性','D. 成长太慢了——我需要感受到明显的进展','E. 所有人都说这条路好，但我内心知道它不适合我'] },
            { id: 206, sandbox:'RN', qtype:'Q1', opts:['A. 对方稳定的回应 and 陪伴——让我在关系里有安全底座','B. 清晰的边界 and 分工——让我知道什么是我的、什么是对方的','C. 关系能带来更多的连接 and 资源——让我的世界变得更大','D. 能推动关系变化的冲动——冲突 and 张力让我感觉自己还活着','E. 跳出情绪看清关系的底层模式——不被绑定'] },
            { id: 207, sandbox:'RN', qtype:'Q2', opts:['A. 被过度索取或消耗——之后我对别人的热情和大方显著下降','B. 被辜负过信任——之后我的信任门槛明显变高了','C. 在协作中被过度担责收获低——之后我更倾向一个人做','D. 在关系中被拖慢或干扰——一个人更高效','E. 我本来就不太投入关系，更愿意相信事实，所以谈不上变得更谨慎'] },
            { id: 208, sandbox:'RN', qtype:'Q3', opts:['A. 让对方看到我真实的需要——我怕被拒绝','B. 打破沉默 and 僵局——我不确定冲突会不会让关系更糟','C. 在关系混乱的时候提出明确的规则——我怕显得太冷','D. 信任他人并在适当的时候依赖他们——我怕暴露弱点','E. 主动结束一段已经不再滋养我的关系——我怕失去'] },
            { id: 209, sandbox:'IN', qtype:'Q1', opts:['A. 一个稳定的位置 and 归属感——让我在群体里有落点','B. 清楚的规则 and 角色——让我知道怎样不乱位','C. 足够大的活动半径 and 辐射力——让更多人看到我','D. 能表达、竞争 and 争取位置的冲动——让我不被动吞没','E. 跳出评价看透群体结构——不被舆论牵着走'] },
            { id: 210, sandbox:'IN', qtype:'Q2', opts:['A. 被持续误解或贴上不准确的标签——之后我不再让外部评价定义我','B. 因为不合群或坚持立场而付出代价——之后我减少了出头','C. 曾经争取位置但发现规则不公——之后我退出了','D. 我似乎从未真正关心过自己在群体里的位置','E. 我在群体里一直能被人看到真实的样子——没有退避'] },
            { id: 211, sandbox:'IN', qtype:'Q3', opts:['A. 被孤立——没有一个人站在我这边','B. 被评价体系裹挟——失去了自己的判断标准','C. 位置被取代——我在群体里的位置 and 话语权动摇','D. 被看到真实的自己——他们可能会发现我并不如表面那样','E. 冲突升级——我本意只是想表达不同意见'] },
            { id: 212, sandbox:'MN', qtype:'Q1', opts:['A. 一个能长期确认自我认同的信念锚点——让我不漂移','B. 一套清晰自洽的信念结构——让我的目标不散乱','C. 让我的观念影响更多人——进入更大的现实空间','D. 不断质疑 and 打破旧信念的冲动——让意义不僵化','E. 从更高层重构意义的能力——让我获得精神自由'] },
            { id: 213, sandbox:'MN', qtype:'Q2', opts:['A. 曾经信过，后来发现它兑现不了——之后我对所有大道理都保持距离','B. 信了之后发现那只是环境氛围营造——不是我真正想要的','C. 被说得很好听但不切实际颅内高潮——之后我变得非常看重能不能落地','D. 我从来就没真正信过什么宏大的东西','E. 我仍然持有一个核心信念，它一直在给我方向'] },
            { id: 214, sandbox:'MN', qtype:'Q3', opts:['A. 放弃一个曾经让我确信的信念——空窗期太可怕了','B. 把我真正相信的东西说给别人听——我怕被嘲笑太理想化','C. 改变方向——已经在这条路上投入太多了','D. 承认自己其实没有真正相信什么东西——只是在表演','E. 拒绝外部给定的期望——我怕辜负期待'] },
            { id: 215, sandbox:'FN', qtype:'Q1', opts:['A. 固定的习惯 and 可依赖的模板——让系统不因变化而失灵','B. 清晰的流程 and 反馈闭环——让系统低损耗运行','C. 可复制放大的结构——让系统规模越来越大','D. 敢于打破旧流程的动力——不让系统被低效拖死','E. 抽离出来理解底层逻辑的能力——获得更高维控制'] },
            { id: 216, sandbox:'FN', qtype:'Q2', opts:['A. 外部系统让我失望过——之后我自己给自己搭系统','B. 我遵守好的系统并从中受益——更信任清晰的外部规则','C. 外部环境太乱了——我不得不建一个自己能控制的空间','D. 我试着建立过自己的系统，很难坚持下来','E. 我没有特别关注过外部系统的规则或流程'] },
            { id: 217, sandbox:'FN', qtype:'Q3', opts:['A. 系统失效——我依赖的秩序崩塌了','B. 规则太密把自己也困住了','C. 规模超出承载——扩张失控','D. 系统变旧后我没有推倒重来的勇气','E. 沉浸在系统设计里，忽略了现实的执行 and 落地'] }
        ];

        let freqQuestions = [];
        let qid = 0;
        for(let e of engines) {
            for(let s of sandboxes) {
                for(let idx=0; idx<3; idx++) { freqQuestions.push({ id: qid++, engine: e, sandbox: s }); }
            }
        }

        function getState(score) { if(score<=5) return '被掩埋'; else if(score<=9) return '卷缩'; else if(score<=12) return '生长'; else return '繁茂'; }
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

        let engineScores = { O:{}, V:{}, D:{}, E:{}, T:{} };
        freqQuestions.forEach(q => {
            let ans = answers.freq[q.id];
            if(ans) engineScores[q.engine][q.sandbox] = (engineScores[q.engine][q.sandbox] || 0) + { 'A':1,'B':2,'C':3,'D':4,'E':5 }[ans];
        });
        
        let sandboxTotals = { PN:0, AN:0, RN:0, IN:0, MN:0, FN:0 };
        for(let e of engines) for(let s of sandboxes) sandboxTotals[s] += (engineScores[e][s] || 0);
        let engineTotals = {};
        for(let e of engines) {
            let total = 0;
            for(let s of sandboxes) total += (engineScores[e][s] || 0);
            engineTotals[e] = total;
        }

        let seedStatus = {};
        for(let e of engines) {
            seedStatus[e] = {};
            for(let s of sandboxes) seedStatus[e][s] = getState(engineScores[e][s]);
        }

        let countFM=0,countSZ=0,countJS=0,countBYM=0;
        for(let e of engines) for(let s of sandboxes) {
            let st = seedStatus[e][s];
            if(st==='繁茂') countFM++; else if(st==='生长') countSZ++; else if(st==='卷缩') countJS++; else countBYM++;
        }

        let verdict = countFM>=10 && countBYM<=3 ? '多点开花' : (countJS >= 30 ? '休眠待激活' : '分布不均');

        let matrixHtml = `<h3>一、🌡️ 总览矩阵</h3><table><thead><tr><th>项目\\沙盒</th>`;
        for(let s of sandboxes) matrixHtml += `<th>${s}</th>`;
        matrixHtml += `<th>总分</th> </thead><tbody>`;
        for(let e of engines) {
            matrixHtml += `<tr><td style="font-weight:600">${engineFull[e]}</td>`;
            for(let s of sandboxes) {
                let sc = engineScores[e][s] || 0; let st = seedStatus[e][s];
                let colorClass = st==='繁茂'?'status-bloom':(st==='生长'?'status-grow':(st==='卷缩'?'status-shrink':'status-buried'));
                matrixHtml += `<td class="${colorClass}">${sc}<br><span>${st}</span></td>`;
            }
            matrixHtml += `<td><strong>${engineTotals[e]}</strong></td></tr>`;
        }
        matrixHtml += `</tbody></table><div class="stat-badge">综合判定：${verdict}</div>`;

        let engineBodyHtml = `<h3>二、⚙️ 引擎体感判定</h3><table><thead><tr><th>引擎</th><th>覆盖面积</th><th>体感描述</th></tr></thead><tbody>`;
        for(let e of engines) {
            let fm = Object.values(seedStatus[e]).filter(v=>v==='繁茂').length, sz = Object.values(seedStatus[e]).filter(v=>v==='生长').length, js = Object.values(seedStatus[e]).filter(v=>v==='卷缩').length, bym = Object.values(seedStatus[e]).filter(v=>v==='被掩埋').length;
            engineBodyHtml += `<tr><td>${engineFull[e]}</td><td>繁茂${fm}个、生长${sz}个、卷缩${js}个、被掩埋${bym}个</td><td>${getEngineKeyword(e, engineTotals[e])}</td></tr>`;
        }
        engineBodyHtml += `</tbody></table>`;

        let sandboxBodyHtml = `<h3>三、🧩 沙盒体感判定</h3><table><thead><tr><th>沙盒</th><th>意象</th><th>体感分数</th><th>体感描述</th></tr></thead><tbody>`;
        for(let s of sandboxes) sandboxBodyHtml += `<tr><td>${s}</td><td>${sandboxFull[s]}</td><td>${sandboxTotals[s]}</td><td>${getSandboxMidDesc(s, sandboxTotals[s])}</td></tr>`;
        sandboxBodyHtml += `</tbody></table>`;

        const detailedDesc = {
            'T克V_healthy': '聚变的绝对追问没有摧毁底盘，而是精准剔除了失效的依赖。',
            'V克E_healthy': '扎实的回声底座为狂热的狩猎装上了筛选器。',
            'E克D_healthy': '广阔的狩猎版图完美分流了过载的燃烧势能。吞噬变量的本能为你铺开了极大的容错空间，让冲锋的烈火不会在单一死局中熄自焚。',
            'D克O_healthy': '破局的燃烧之火没有熔毁框架，反而淬炼了结晶的秩序。',
            'O克T_healthy': '冷峻的结晶秩序为聚变的追问装上了高倍瞄准镜。'
        };

        let chainText = [];
        const keMap = { T:'V', V:'E', E:'D', D:'O', O:'T' };

        for (let i = 0; i < engines.length; i++) {
            for (let j = 0; j < engines.length; j++) {
                if (i === j) continue;
                let a = engines[i]; let b = engines[j];
                // 简单判定逻辑
                if (keMap[a] === b && engineTotals[a] >= 65 && engineTotals[b] >= 65) {
                    let key = `${a}克${b}_healthy`;
                    chainText.push(`<div class="causal-item"><div class="causal-item-title">➤ 旺克旺 · 健康态 · ${engineFull[a]}克${engineFull[b]}</div><div class="causal-item-desc">${detailedDesc[key] || '强强相克，产生结构性共鸣。'}</div></div>`);
                }
            }
        }
        if (chainText.length === 0) chainText.push('<div class="causal-item-desc">未触发典型旺衰生克链，引擎间关系相对平衡。</div>');
        let chainHtml = `<h3>五、⛓️ 因果链与层级流动分析</h3>${chainText.join('')}`;

        let reportHtml = matrixHtml + engineBodyHtml + sandboxBodyHtml + chainHtml;

        // 确保使用安全的 targetUserId 写入
        await supabase.from('profiles').upsert([{ id: targetUserId }]);

        const { data, error: insertError } = await supabase
            .from('test_records')
            .insert([{ user_id: targetUserId, raw_answers: answers, ovtde_scores: { engineScores }, is_paid: false }])
            .select();

        if (insertError) throw insertError;

        return res.status(200).json({ success: true, recordId: data && data.length > 0 ? data[0].id : null, reportHtml: reportHtml });

    } catch (error) {
        console.error('黑盒运行错误:', error);
        return res.status(500).json({ success: false, error: '服务器内部错误：' + error.message });
    }
}
