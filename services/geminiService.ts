
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { AgeGroup, PlayerState, CustomerCard, GameEvent, CustomerTrait, CustomerIntent, ProductCategory, ChatMessage } from "../types";

const getClient = () => {
    const apiKey = process.env.API_KEY || '';
    return new GoogleGenAI({ apiKey });
};

// Helper for delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to decode base64 to Uint8Array
function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper to convert raw PCM to AudioBuffer
function pcmToAudioBuffer(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): AudioBuffer {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// 1. Image Generation for Shop Design
export const generateShopImage = async (
    prompt: string, 
    size: '1K' | '2K' | '4K' = '1K'
): Promise<string | null> => {
  const ai = getClient();
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
            aspectRatio: "1:1",
            imageSize: size
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image generation failed:", error);
    return null;
  }
};

// 2. Business Advisor (Thinking Model)
export const getBusinessAdvice = async (
  context: string, 
  question: string, 
  ageGroup: AgeGroup
): Promise<string> => {
  const ai = getClient();
  const tone = ageGroup === AgeGroup.Junior 
    ? "你是一个友好的、充满鼓励的猫头鹰卡通导师。请用简单易懂的语言对10岁的孩子说话。中文回答。" 
    : "你是一位专业的商业顾问。回答要简洁、具有战略性，并关注投资回报率（ROI）和风险管理。中文回答。";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `背景: ${context}\n\n用户问题: ${question}`,
      config: {
        systemInstruction: tone,
        thinkingConfig: { thinkingBudget: 2048 } 
      }
    });
    return response.text || "我正在查看市场数据，请稍后再试。";
  } catch (error) {
    console.error("Advice generation failed:", error);
    return "与商业中心的连接不稳定。";
  }
};

// 3. TTS for Announcements (Voice Broadcast) with Retry Logic
export const speakAnnouncement = async (text: string, ageGroup: AgeGroup): Promise<void> => {
  const ai = getClient();
  const voiceName = ageGroup === AgeGroup.Junior ? 'Kore' : 'Puck'; 
  const MAX_RETRIES = 3;
  let retryCount = 0;

  while (retryCount < MAX_RETRIES) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const bytes = base64ToBytes(base64Audio);
          const audioBuffer = pcmToAudioBuffer(bytes, audioCtx, 24000, 1);
          const source = audioCtx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioCtx.destination);
          source.start();
      }
      return; // Success, exit
    } catch (error: any) {
      // Check if the error is due to overloading (503)
      const isOverloaded = error?.message?.includes('overloaded') || error?.status === 503 || error?.code === 503;
      
      if (isOverloaded && retryCount < MAX_RETRIES - 1) {
        retryCount++;
        const delay = 1000 * Math.pow(2, retryCount - 1); // 1000ms, 2000ms, 4000ms
        console.warn(`TTS Model overloaded. Retrying in ${delay}ms... (Attempt ${retryCount}/${MAX_RETRIES})`);
        await sleep(delay);
      } else {
        console.error("TTS failed:", error);
        break; // Exit loop if not retrying
      }
    }
  }
};

// 4. Quick Analysis for Settlement (Flash)
export const analyzePerformance = async (financialData: string, ageGroup: AgeGroup): Promise<string> => {
    const ai = getClient();
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `请简要分析这个游戏表现：${financialData}。`,
            config: {
                systemInstruction: ageGroup === AgeGroup.Junior 
                    ? "用中文回答。以有趣的方式给出1个赞扬和1个建议。"
                    : "用中文回答。提供2个关键点的执行摘要，分析利润驱动因素和亏损点。"
            }
        });
        return response.text || "分析完成。";
    } catch (e) {
        return "数据处理错误。";
    }
}

// 5. Generate Whole Game Report (Host)
export const generateGameReport = async (players: PlayerState[], eventName: string): Promise<string> => {
    const ai = getClient();
    const dataSummary = players.map(p => `${p.shopName}(店长:${p.name}): 总利润¥${p.totalProfit}, 最终资金¥${p.funds}, 营销等级Lv${p.marketingLevel}`).join('\n');
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview", 
            contents: `请为"${eventName}"商业模拟活动生成一份详细的经营分析报告。\n\n玩家数据:\n${dataSummary}`,
            config: {
                systemInstruction: "你是一位资深的商业评论员。请生成一份Markdown格式的报告。包含：1. 市场概况（总产值、竞争烈度）。2. 明星店铺点评（表扬前三名）。3. 经营问题洞察（发现普遍存在的问题）。4. 给所有学员的总结寄语。语气专业且充满鼓励。",
                thinkingConfig: { thinkingBudget: 2048 }
            }
        });
        return response.text || "报告生成失败。";
    } catch (e) {
        console.error(e);
        return "生成报告时发生错误。";
    }
}

// 6. NEW: Generate AI Customer Batch (Pre-generation)
export const generateAICustomerBatch = async (
    count: number, 
    round: number, 
    event: GameEvent,
    bias: 'random' | 'easy' | 'hard' | 'chaos' = 'random'
): Promise<CustomerCard[]> => {
    const ai = getClient();
    
    // Schema definition to ensure strict JSON structure matching CustomerCard (mostly)
    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                avatar: { type: Type.STRING, description: "A single emoji representing the person" },
                age: { type: Type.NUMBER },
                trait: { type: Type.STRING, enum: ['price_sensitive', 'quality_first', 'impulsive', 'skeptical', 'trend_follower'] },
                traitLabel: { type: Type.STRING, description: "Chinese label for trait e.g. '精打细算'" },
                budget: { type: Type.NUMBER },
                intent: { type: Type.STRING, enum: ['buying', 'consulting', 'browsing', 'returning', 'thief'] },
                preferredCategories: { type: Type.ARRAY, items: { type: Type.STRING } },
                story: { type: Type.STRING, description: "Short backstory in Chinese" },
                need: { type: Type.STRING, description: "Specific shopping need in Chinese" },
                
                dialogueOpening: { type: Type.STRING, description: "First thing they say. MUST BE NATURAL." },
                
                // New Detailed Reactions
                reactions: {
                    type: Type.OBJECT,
                    properties: {
                        expensive: { type: Type.STRING, description: "What they say if price is high. Colloquial Chinese." },
                        cheap: { type: Type.STRING, description: "What they say if price is low/good. Colloquial Chinese." },
                        flattery: { type: Type.STRING, description: "Response to emotional praise. Colloquial Chinese." },
                        logic: { type: Type.STRING, description: "Response to logical specs explanation. Colloquial Chinese." },
                        angry: { type: Type.STRING, description: "What they say when they leave angrily." },
                        happy: { type: Type.STRING, description: "What they say when they buy successfully." },
                    },
                    required: ["expensive", "cheap", "flattery", "logic", "angry", "happy"]
                },

                basePatience: { type: Type.NUMBER },
                baseInterest: { type: Type.NUMBER },
                purchaseQuantity: { type: Type.NUMBER }
            },
            required: ["name", "avatar", "trait", "budget", "intent", "story", "dialogueOpening", "reactions", "basePatience", "baseInterest"]
        }
    };

    let biasInstruction = "";
    if (bias === 'easy') {
        biasInstruction = "BIAS: EASY MODE. Customers should be RICH (high budget), FRIENDLY, IMPULSIVE or TREND_FOLLOWER. They should be easy to please.";
    } else if (bias === 'hard') {
        biasInstruction = "BIAS: HARD MODE. Customers should be POOR (low budget), SKEPTICAL or PRICE_SENSITIVE. They are grumpy, rude, and very hard to negotiate with.";
    } else if (bias === 'chaos') {
        biasInstruction = "BIAS: CHAOS MODE. High chance (30%) of THIEVES, SCAMMERS (Returning), or WEIRD requests. Make them unpredictable.";
    }

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Generate ${count} distinct retail customers for a simulation game.
            Current Round: ${round}.
            Global Event: ${event.name} (${event.description}).
            Boosted Categories: ${event.boostedCategories.join(', ')}.
            
            ${biasInstruction}
            
            STRICT DIALOGUE RULES (CRITICAL):
            1. Language must be **Colloquial Chinese (口语化中文)**. Speak like a real person, not a textbook.
            2. **FORBIDDEN PHRASES**: Do NOT use "looking at price tag" (看价格标签), "just looking" (随便看看) repeatedly.
            3. Make them distinct!
               - A "Thief" should sound overly friendly or distracting.
               - A "Price Sensitive" person should complain about inflation using slang.
               - A "Trend Follower" should use internet slang.
            4. Fill the 'reactions' object with specific responses based on their trait.
               e.g. If trait is 'Skeptical', reaction to 'flattery' should be "少来这套" (Don't give me that).
            5. Return valid JSON only.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 1.4 // High temp for maximum variety
            }
        });

        const rawData = JSON.parse(response.text || "[]");
        
        // Post-process to ensure type safety and IDs
        return rawData.map((c: any, index: number) => ({
            ...c,
            id: `ai_${round}_${Date.now()}_${index}`,
            // Ensure enums match strict types (fallback if AI hallucinates)
            preferredCategories: (c.preferredCategories || []).filter((cat: string) => 
                ['food', 'stationery', 'toy', 'daily', 'tech', 'luxury', 'health', 'gift', 'fun', 'book', 'sport', 'diy', 'office', 'hobby'].includes(cat)
            ) as ProductCategory[],
            trait: ['price_sensitive', 'quality_first', 'impulsive', 'skeptical', 'trend_follower'].includes(c.trait) ? c.trait : 'impulsive',
            intent: ['buying', 'consulting', 'browsing', 'returning', 'thief'].includes(c.intent) ? c.intent : 'consulting'
        }));

    } catch (e) {
        console.error("AI Customer Generation Failed:", e);
        return []; // Return empty array so app falls back to algorithm
    }
};

// 7. NEW: AI Referee for Negotiation
export const interactWithAICustomer = async (
    history: ChatMessage[],
    customer: CustomerCard,
    productName: string,
    currentPrice: number
): Promise<{ text: string, outcome: 'ongoing' | 'deal' | 'leave', mood_score: number }> => {
    const ai = getClient();
    
    // Construct conversation history string
    const convo = history.map(msg => `${msg.sender === 'user' ? 'Shop Owner' : 'Customer'}: ${msg.text}`).join('\n');
    
    const prompt = `
    You are playing a role-playing game. You are the CUSTOMER.
    
    **YOUR PROFILE:**
    - Name: ${customer.name}
    - Personality: ${customer.traitLabel} (Trait ID: ${customer.trait})
    - Max Budget: ${customer.budget} (Hidden from player)
    - Needs: ${customer.need}
    - Story: ${customer.story}
    
    **CONTEXT:**
    - You are in a shop negotiating for: ${productName}.
    - The shop owner is asking: ${currentPrice} RMB.
    
    **CONVERSATION HISTORY:**
    ${convo}
    
    **YOUR TASK:**
    Respond to the Shop Owner's last message.
    1. Reply in natural, spoken Chinese (Colloquial). Short sentences.
    2. Determine the outcome based on your personality and the price.
       - If price <= your budget AND you are happy, outcome = 'deal'.
       - If price > your budget AND they won't lower it, you might 'leave' or continue 'ongoing' to haggle.
       - If the user is rude, 'leave'.
       - If you are still deciding, 'ongoing'.
    3. Return a mood score change (-10 to +10) based on what the user said.
    
    **RETURN JSON ONLY:**
    {
      "text": "Your spoken response here...",
      "outcome": "ongoing" | "deal" | "leave",
      "mood_score": integer
    }
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                temperature: 1.0
            }
        });
        
        const result = JSON.parse(response.text || "{}");
        return {
            text: result.text || "Hmm...",
            outcome: result.outcome || 'ongoing',
            mood_score: result.mood_score || 0
        };
    } catch (e) {
        console.error("AI Interaction Failed", e);
        return { text: "...", outcome: 'ongoing', mood_score: 0 };
    }
};
