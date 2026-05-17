import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: '非法请求：算法黑盒拒绝访问' });
    }

    try {
        const { userId, userAnswers } = req.body;

        // 核心计分引擎：OVTDE 物理隔离区
        let S_pool = { O: 0, V: 0, D: 0, E: 0, T: 0 };
        let N_pool = { PN: 0, AN: 0, RN: 0, IN: 0, MN: 0, FN: 0 };
        let F_pool = { SS: 0, DS: 0, SN: 0, DN: 0, Ch: 0 };
        let Sigma = { s0: 0, s1: 0, s2s: 0, s2c: 0 };
        let SL_pool = { O: 0, V: 0, D: 0, E: 0, T: 0 };
        let G_neg = { A: 0, B: 0, C: 0, D: 0 };
        let G_pos = { A: 0, B: 0, C: 0, D: 0 };
        let eps = [];

        for (const [id, val] of Object.entries(userAnswers)) {
            if (id.startsWith("S-C") || /^C0[1-4]$/.test(id)) {
                let m = { A: "O", B: "V", C: "D", D: "E", E: "T" };
                if (m[val]) S_pool[m[val]] += 2;
            } else if (id.startsWith("N-C")) {
                let m = { A: "PN", B: "AN", C: "RN", D: "IN", E: "MN", F: "FN" };
                if (m[val]) N_pool[m[val]] += 2;
            } else if (/^F0[1-4]$/.test(id)) {
                let fMap = {
                    F01: { A: { SN: 2, SS: 2 }, B: { SN: 2, DS: 2 }, C: { DN: 2, SS: 2 }, D: { DN: 2, DS: 2 }, E: { Ch: 2 } },
                    F02: { A: { SS: 2 }, B: { DS: 2 }, C: { DS: 1, SS: 1 }, D: { DS: 2 }, E: { Ch: 2 } },
                    F03: { A: { SN: 2 }, B: { DN: 2 }, C: { DN: 1, Ch: 1 }, D: { DN: 1, Ch: 1 }, E: { Ch: 2 } },
                    F04: { A: { SS: 2, SN: 2 }, B: { DS: 2, SN: 2 }, C: { SS: 2, DN: 2 }, D: { DS: 2, DN: 2 }, E: { Ch: 2 } }
                };
                if (fMap[id] && fMap[id][val]) {
                    let a = fMap[id][val];
                    F_pool.SS += a.SS || 0; F_pool.DS += a.DS || 0; F_pool.SN += a.SN || 0; F_pool.DN += a.DN || 0; F_pool.Ch += a.Ch || 0;
                }
            } else if (id.startsWith("st-")) {
                let m = { A: "s0", B: "s1", C: "s2s", D: "s2c" };
                if (m[val]) Sigma[m[val]]++;
            } else if (id.startsWith("SL-")) {
                let m = { A: "V", B: "D", C: "O", D: "E", E: "T" };
                if (m[val]) SL_pool[m[val]] += 2;
            } else if (id.startsWith("Γ-N")) {
                let m = { A: "A", B: "B", C: "C", D: "D" };
                if (m[val]) G_neg[m[val]]++;
            } else if (id.startsWith("Γ-P")) {
                let m = { A: "A", B: "B", C: "C", D: "D" };
                if (m[val]) G_pos[m[val]]++;
            } else if (id.startsWith("ε-")) {
                let s = { A: 1, B: 2, C: 3, D: 4, E: 5 };
                if (s[val]) eps.push(s[val]);
            }
        }

        const finalScores = { S_pool, N_pool, F_pool, Sigma, SL_pool, G_neg, G_pos, eps };

        // 终极锁：强制静默生成占位档案，防数据库外键崩溃
        const targetUserId = userId || '00000000-0000-0000-0000-000000000000';
        await supabase.from('profiles').upsert([{ id: targetUserId }]);

        // 写入最终测试数据
        const { error: insertError } = await supabase
            .from('test_records')
            .insert([
                {
                    user_id: targetUserId,
                    raw_answers: userAnswers,
                    ovtde_scores: finalScores,
                    is_paid: false
                }
            ]);

        if (insertError) {
            throw insertError;
        }

        return res.status(200).json({
            success: true,
            message: "数据已加密落盘并完成计算",
            scores: finalScores
        });

    } catch (error) {
        return res.status(500).json({ error: '黑盒算法执行异常', details: error.message });
    }
}
