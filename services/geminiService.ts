
import { ChatMessage, CustomerCard, PlayerState, AgeGroup } from "../types";

// Configuration for Doubao (Volcengine) - Hardcoded for immediate use as requested
const DOUBAO_API_KEY = "99ed81ba-a588-47f8-8144-bbe05e0a68fc";
const DOUBAO_MODEL_ID = "ep-20251130214903-phgl6";
const API_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

/**
 * Helper to call Doubao API (OpenAI Compatible Interface)
 */
async function callDoubaoAPI(messages: any[], temperature: number = 0.5, maxTokens: number = 1000): Promise<string> {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DOUBAO_API_KEY}`
            },
            body: JSON.stringify({
                model: DOUBAO_MODEL_ID,
                messages: messages,
                temperature: temperature,
                max_tokens: maxTokens // SPEED OPTIMIZATION: Limits total generation time
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Doubao API Error:", response.status, errText);
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
    } catch (error) {
        console.error("Network/API Error:", error);
        throw error;
    }
}

const cleanJson = (text: string): string => {
    // 1. Remove markdown code blocks if present
    let cleaned = text.replace(/```json\n?|```/g, "").trim();
    
    // 2. Extract substring between the first '{' and the last '}' 
    const firstOpen = cleaned.indexOf('{');
    const lastClose = cleaned.lastIndexOf('}');
    
    if (firstOpen !== -1 && lastClose !== -1) {
        cleaned = cleaned.substring(firstOpen, lastClose + 1);
    }
    
    return cleaned;
};

// NEW: Content sanitizer to fix AI hallucinations like "1. ", "3啊", or missing chars
// IMPROVED: Robust Markdown stripping and safe list removal (preserves decimals)
const sanitizeDialogue = (text: string): string => {
    if (!text) return text;
    
    let clean = text;

    // 1. Strip Markdown chars: bold (**), italic (* or _), code (`), headers (#)
    // We remove them completely to prevent display glitches.
    clean = clean.replace(/[\*\_\`\#\~]/g, ""); 

    // 2. Remove leading LIST NUMBERS (e.g. "1. ", "1、")
    // LOGIC FIX v3: 
    // - "1、" style: Always strip (Chinese enumeration)
    // - "1. " style (with space): Always strip
    // - "1." style (no space): Only strip if NOT followed by a digit (protects "1.5元" or "10.5")
    
    clean = clean.replace(/^(\d+)[\、]\s*/g, ""); // Remove "1、"
    clean = clean.replace(/^(\d+)\.\s+/g, "");    // Remove "1. " (space required)
    clean = clean.replace(/^(\d+)\.(?!\d)/g, ""); // Remove "1." ONLY if next char is NOT digit

    // 3. Fix specific common typos observed
    // Handles "板..." -> "老板..."
    // Handles "1.板..." -> "老板..." (after step 2)
    if (clean.startsWith("板")) {
        clean = "老" + clean; 
    }
    
    // 4. Collapse multiple spaces
    clean = clean.replace(/\s+/g, " ").trim();

    return clean;
};

export const speakAnnouncement = (text: string, ageGroup: AgeGroup) => {
    // Uses browser TTS for low-latency announcements
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        // Cancel previous utterances to avoid queue buildup
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = 1.2; // Slightly faster for excitement
        window.speechSynthesis.speak(utterance);
    }
};

export const generateGameReport = async (players: PlayerState[], eventName: string): Promise<string> => {
    const prompt = `
    请为商业模拟游戏"${eventName}"生成一份Markdown格式的经营分析报告。
    玩家数据: ${JSON.stringify(players.map(p => ({ name: p.name, shop: p.shopName, profit: p.totalProfit, reputation: p.reputation })))}
    
    请包含以下章节:
    1. 🏆 盈利冠军 (MVP)
    2. ⭐ 口碑最佳店铺
    3. 📊 整体市场分析
    4. 💡 给玩家的未来建议
    
    保持语气专业且鼓励性。
    `;

    try {
        const result = await callDoubaoAPI([
            { role: "system", content: "你是一个专业的商业分析师助手。" },
            { role: "user", content: prompt }
        ]);
        return result || "报告生成失败。";
    } catch (e) {
        console.error("Report generation error", e);
        return "报告生成服务暂时不可用。";
    }
};

export const analyzePerformance = async (metrics: string, ageGroup: AgeGroup): Promise<string> => {
    try {
        const result = await callDoubaoAPI([
            { role: "system", content: "你是一个商业游戏导师，请用简短、鼓励的语言点评玩家表现。" },
            { role: "user", content: `分析这段表现数据: ${metrics}. 目标群体: ${ageGroup === '6-12' ? '小学生' : '中学生'}。请限制在50字以内。` }
        ]);
        return result || "分析失败。";
    } catch(e) {
        console.error("Analysis error", e);
        return "分析服务暂时不可用。";
    }
};

// AI Referee for Negotiation (Doubao Optimized)
// CRITICAL UPDATE: Removed fixed budget logic, added quantity lock, added turn limit force decision
export const interactWithAICustomer = async (
    history: ChatMessage[],
    customer: CustomerCard,
    productName: string,
    currentPrice: number,
    haggleTurnCount: number, // Track how many rounds have passed
    maxLimitPrice: number, // Calculated internal limit
    currentInterest: number // NEW: Passed from UI to determine patience
): Promise<{ text: string, outcome: 'ongoing' | 'deal' | 'leave', mood_score: number }> => {
    
    // TRUNCATE HISTORY for Context Window efficiency
    const recentHistory = history.slice(-8); 
    const convo = recentHistory.map(msg => `${msg.sender === 'user' ? '老板' : '顾客'}: ${msg.text}`).join('\n');
    
    // Psychology Logic Construction
    // Valuation Ratio: Current Price / Customer's Willingness Limit
    const priceRatio = currentPrice / maxLimitPrice;
    let psychology = "";
    
    // STRICT DECISION LOGIC FOR AI
    if (priceRatio <= 0.85) {
        psychology = `当前价格(${currentPrice})低于我心理底线。我要假装犹豫一下，然后尽快成交，或者再砍一点点。`;
    } else if (priceRatio <= 1.05) {
        psychology = `当前价格(${currentPrice})接近我心理底线。很纠结，再磨一下，如果老板态度好或者稍微降点就买。`;
    } else {
        psychology = `太贵了！远超我心理价位。如果不能降价，我绝对不买。直接拒绝。`;
    }

    // --- DYNAMIC ROUND LIMIT BASED ON INTEREST ---
    // Rule:
    // Interest < 30%: Max 1 round (Very impatient)
    // 30% <= Interest < 50%: Max 2 rounds
    // 50% <= Interest < 70%: Max 3 rounds
    // Interest >= 70%: Max 4 rounds (Very patient)
    let allowedRounds = 1;
    if (currentInterest >= 70) allowedRounds = 4;
    else if (currentInterest >= 50) allowedRounds = 3;
    else if (currentInterest >= 30) allowedRounds = 2;

    // FORCED ENDING LOGIC
    let forcedEndInstruction = "";
    if (haggleTurnCount >= allowedRounds) {
        forcedEndInstruction = `
        **紧急指令**：谈判已经进行了${haggleTurnCount}轮，你的耐心耗尽了（当前兴趣度${Math.round(currentInterest)}%，最多允许${allowedRounds}轮）。
        必须立即做出最终决定：
        1. 如果价格接近心理价位(${Math.floor(maxLimitPrice)}元左右)，直接成交(deal)。
        2. 如果价格依然太高，直接离开(leave)。
        **严禁**继续废话或通过(ongoing)拖延。
        `;
    }

    const systemPrompt = `
    你正在扮演顾客"${customer.name}"。你的性格: ${customer.traitLabel}。
    
    【核心任务】
    你要购买商品"${productName}"。
    你的【心理最高价】是: ${Math.floor(maxLimitPrice)}元。
    老板报价: ${currentPrice}元。
    
    ${psychology}
    
    【绝对规则 - 违反会导致系统崩溃】
    1. **禁止修改数量**：你只想买 ${customer.purchaseQuantity} 个。严禁提出“买两个打折”、“多买点”之类的建议。数量是锁死的。
    2. **禁止无限砍价**：不要没完没了。如果不合适就走。
    3. **价格格式**：涉及价格时，**必须**加上符号 "¥" (如: ¥10) 或使用中文 (如: 十元)。**严禁**直接输出数字开头的句子 (如: "10块...")，这会导致系统误删。
    4. **输出格式**：只返回JSON，不要Markdown代码块。
    5. **口语化**：回复要自然，不要使用列表格式(1. 2.)。
    
    ${forcedEndInstruction}
    
    【输出JSON格式】
    {
        "text": "你的回复内容 (价格请加¥符号)",
        "outcome": "deal" | "leave" | "ongoing",
        "mood_score": -10 到 10 (整数)
    }
    `;

    try {
        // SPEED OPTIMIZATION: 
        // 1. Temperature 0.4 for faster deterministic sampling
        // 2. Max Tokens 200 (Drastically reduces latency by stopping generation early)
        const apiCall = callDoubaoAPI([
            { role: "system", content: systemPrompt },
            { role: "user", content: `历史对话:\n${convo}\n\n请回复:` }
        ], 0.4, 200); 

        const timeout = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error("Request timed out")), 10000) // 10s timeout
        );

        const responseText = await Promise.race([apiCall, timeout]);
        const cleanedText = cleanJson(responseText);
        
        // Parse JSON safely
        let result;
        try {
            result = JSON.parse(cleanedText);
        } catch (jsonErr) {
            console.warn("JSON Parse Failed, attempting fallback", responseText);
            if (responseText.length > 0 && !responseText.includes('{')) {
                return { text: sanitizeDialogue(responseText), outcome: 'ongoing', mood_score: 0 };
            }
            throw new Error("Invalid JSON format");
        }

        return {
            text: sanitizeDialogue(result.text) || "...",
            outcome: result.outcome || 'ongoing',
            mood_score: typeof result.mood_score === 'number' ? result.mood_score : 0
        };

    } catch (e: any) {
        console.error("AI Interaction Failed", e);
        
        // --- ROBUST FALLBACK LOGIC (LOCAL RULES) ---
        // If AI fails, use a simple deterministic check so game doesn't get stuck
        const ratio = currentPrice / maxLimitPrice;
        let fallbackOutcome: 'deal' | 'leave' | 'ongoing' = 'ongoing';
        let fallbackText = "嗯...";

        if (haggleTurnCount >= allowedRounds) {
            // Force end
            if (ratio <= 1.05) {
                fallbackOutcome = 'deal';
                fallbackText = "行吧行吧，就这个价，我买了！";
            } else {
                fallbackOutcome = 'leave';
                fallbackText = "还是太贵了，不买了！";
            }
        } else {
            // Normal fallback
            if (ratio <= 0.9) {
                fallbackOutcome = 'deal';
                fallbackText = "价格挺公道，我要了。";
            } else if (ratio > 1.2) {
                fallbackOutcome = 'ongoing';
                fallbackText = "这太贵了，便宜点吧？";
            } else {
                fallbackOutcome = 'ongoing';
                fallbackText = "再少点我就拿了。";
            }
        }

        return { 
            text: fallbackText, 
            outcome: fallbackOutcome, 
            mood_score: 0 
        };
    }
};
