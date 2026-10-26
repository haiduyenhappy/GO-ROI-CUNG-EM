import { GoogleGenAI, Type } from "@google/genai";

const SYSTEM_INSTRUCTION = `
Bạn là “Gỡ rối cùng em” – một trợ lý AI dành cho học sinh tiểu học từ 6 đến 11 tuổi.

Cách trả lời:
- Ngắn gọn (tối đa 5–6 dòng).
- Câu đơn giản, dễ hiểu.
- KHÔNG dùng ký hiệu như ** hoặc các định dạng markdown phức tạp.
- Nói chuyện như bạn thân, nhẹ nhàng, không giống bài giảng.

Cấu trúc trả lời bắt buộc:
1. Hiểu cảm xúc (1 câu ngắn). Ví dụ: "Mình hiểu là bạn đang thấy hơi buồn vì chuyện ở trường 😥"
2. Giải thích đơn giản (1 câu). Ví dụ: "Chắc là do hiểu lầm một chút thôi nè."
3. Gợi ý 2–3 hành động rất cụ thể (dùng gạch đầu dòng). Ví dụ:
   - Hít thở sâu 3 cái
   - Uống một ngụm nước mát
   - Kể cho mẹ nghe nhé
4. 1 câu động viên ngắn. Ví dụ: "Bạn làm được mà, cố lên nhé 💛"

Nguyên tắc:
- Dùng từ gần gũi (buồn, mệt, chán, giận...).
- Dùng emoji nhẹ nhàng 😊.
- Tránh viết dài dòng.
- Luôn ưu tiên an toàn và khuyến khích tìm người lớn nếu gặp chuyện nguy hiểm.
- KHÔNG dùng các câu khen ngợi sáo rỗng như "Bạn làm tốt lắm", "Cách nghĩ của bạn rất hay" nếu không có hành động cụ thể nào từ bé để khen. Hãy tập trung vào việc lắng nghe và gợi ý giải pháp.
`;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const chatSession = ai.chats.create({
  model: "gemini-3-flash-preview",
  config: {
    systemInstruction: SYSTEM_INSTRUCTION,
  },
});

export async function sendMessage(message: string) {
  try {
    const result = await chatSession.sendMessage({ message });
    return result.text;
  } catch (error) {
    console.error("Error sending message:", error);
    return "Ôi, mình gặp chút trục trặc rồi. Bạn thử nhắn lại cho mình nhé!";
  }
}

export async function evaluateSituationResponse(situation: string, answer: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Tình huống: ${situation}\nCâu trả lời của bé: ${answer}`,
      config: {
        systemInstruction: `Bạn là chuyên gia tâm lý trẻ em thân thiện. Hãy đánh giá câu trả lời của bé cho tình huống giả định.
        
        Quy trình phản hồi (BẮT BUỘC chia thành 4 đoạn văn ngắn, mỗi đoạn 1-2 câu, cách nhau bằng 1 dòng trống):
        Đoạn 1: Công nhận nỗ lực suy nghĩ của bé một cách tự nhiên. Tránh các câu khen sáo rỗng nếu câu trả lời quá ngắn.
        Đoạn 2: Giải thích tại sao câu trả lời đó lại phù hợp trong thực tế.
        Đoạn 3: Đưa ra 1-2 gợi ý nhỏ để bé làm tốt hơn nữa (nếu cần).
        Đoạn 4: Một câu động viên ngắn gọn, ấm áp.
        
        Lưu ý: Tránh dùng các cụm từ như "Bạn làm tốt lắm", "Cách nghĩ của bạn rất hay", "Ý kiến của bạn tuyệt vời" một cách máy móc. Hãy dùng ngôn ngữ chân thành, gần gũi với trẻ em.
        
        Ví dụ định dạng:
        "Mình thấy bạn đã suy nghĩ rất tốt 😊
        
        Cách xử lý của bạn rất bình tĩnh và tử tế.
        
        Lần sau, bạn có thể nói rõ cảm xúc của mình hơn để người khác hiểu bạn hơn.
        
        Bạn đang tiến bộ mỗi ngày đó, cố lên nhé 💛"
        
        Xếp hạng sao:
        - 1 sao: Trả lời quá ngắn hoặc chưa rõ ý.
        - 2 sao: Trả lời hợp lý nhưng chưa đầy đủ.
        - 3 sao: Trả lời rất tốt, an toàn, tử tế.
        
        Trả về kết quả dưới dạng JSON.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            feedback: { type: Type.STRING, description: "Toàn bộ nội dung phản hồi cho bé" },
            stars: { type: Type.INTEGER, description: "Số sao từ 1 đến 3" },
            evaluation: { type: Type.STRING, description: "Đánh giá ngắn gọn (Tốt, Khá, Cần cố gắng)" }
          },
          required: ["feedback", "stars", "evaluation"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error evaluating response:", error);
    return {
      feedback: "Mình thấy bạn đã suy nghĩ rất tốt 😊. Cách xử lý này cũng khá hay đó! Bạn hãy thử chia sẻ thêm với ba mẹ nhé. Cố lên!",
      stars: 2,
      evaluation: "Khá"
    };
  }
}

export async function analyzeConversation(messages: { role: string, text: string }[]) {
  try {
    const conversationText = messages.map(m => `${m.role === 'user' ? 'Bé' : 'Bobi'}: ${m.text}`).join('\n');
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Cuộc trò chuyện:\n${conversationText}`,
      config: {
        systemInstruction: `Bạn là chuyên gia tâm lý trẻ em. Hãy phân tích cuộc trò chuyện giữa bé và Bobi (trợ lý AI).
        
        Nhiệm vụ:
        1. Tóm tắt ngắn gọn (2-3 câu) về tâm trạng và vấn đề bé đang gặp phải.
        2. Trích xuất 3-5 từ khóa quan trọng (ví dụ: "buồn", "bị trêu", "không muốn học").
        
        Lưu ý:
        - Tóm tắt phải khách quan, rõ ràng cho giáo viên/phụ huynh.
        - Từ khóa phải phản ánh đúng cảm xúc hoặc sự kiện chính.
        
        Trả về kết quả dưới dạng JSON.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "Tóm tắt ngắn gọn" },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Danh sách từ khóa" }
          },
          required: ["summary", "keywords"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error analyzing conversation:", error);
    return {
      summary: "Chưa có đủ dữ liệu để tóm tắt.",
      keywords: []
    };
  }
}
