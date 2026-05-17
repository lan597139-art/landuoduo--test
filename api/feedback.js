import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: '非法请求' });
    }

    try {
        const { recordId, rating, comment } = req.body;

        if (!recordId) {
            return res.status(400).json({ error: '缺少关键记录凭证' });
        }

        // 定向更新对应 UUID 那行匿名数据的评分和留言字段
        const { error } = await supabase
            .from('test_records')
            .update({
                rating: parseInt(rating),
                feedback_comment: comment
            })
            .eq('id', recordId);

        if (error) {
            throw error;
        }

        return res.status(200).json({ success: true, message: '反馈已与匿名数据流合并落盘' });

    } catch (error) {
        return res.status(500).json({ error: '反馈同步失败', details: error.message });
    }
}
