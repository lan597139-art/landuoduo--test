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

            // 核心修复：检验 ID 是否为合法的 UUID
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            
            if (recordId && uuidRegex.test(recordId)) {
                // 合法 ID，正常更新问卷
                await supabase.from('test_records').update({ comment: feedbackComment }).eq('id', recordId);
            } else {
                // 非法 ID，强行新建一行存下问卷，绝不弄丢！
                await supabase.from('test_records').insert([{ 
                    user_id: dummyUserId, 
                    comment: feedbackComment,
                    raw_answers: { note: "职业测试主数据落盘异常，此行为强行兜底保存的问卷" },
                    is_paid: false
                }]);
            }
            return res.status(200).json({ success: true, message: "问卷数据防弹落盘成功" });
        }

        // ==========================================
        // 初始答题数据落盘
        // ==========================================
        const body = req.body || {};
        const userAnswers = body.userAnswers || {};
        const targetUserId = body.userId || '00000000-0000-0000-0000-000000000000';

        await supabase.from('profiles').upsert([{ id: targetUserId }]);
        
        const { data, error: insertError } = await supabase
            .from('test_records')
            .insert([{ user_id: targetUserId, raw_answers: userAnswers, is_paid: false }])
            .select();

        if (insertError) throw insertError;
        
        return res.status(200).json({ 
            success: true, 
            recordId: data && data.length > 0 ? data[0].id : null 
        });

    } catch (error) {
        console.error('黑盒运行错误:', error);
        return res.status(500).json({ success: false, error: '服务器内部错误：' + error.message });
    }
}
